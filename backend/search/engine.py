import json
import math
import time
from loguru import logger

from backend.search.database import DatabaseManager
from backend.models.search_models import DocumentIndex, SearchResult, SearchFilters, PaginatedSearchResponse


class SearchEngine:
    """Core engine for FTS5 document indexing and searching with BM25 + recency ranking."""

    def __init__(self):
        self._initialized = False

    async def ensure_initialized(self):
        if not self._initialized:
            await DatabaseManager.init_db()
            self._initialized = True

    async def index_document(self, doc: DocumentIndex) -> bool:
        """Indexes a document into the standard and FTS tables."""
        try:
            await self.ensure_initialized()
            from backend.plugins.manager import PluginManager
            for plugin in PluginManager.get_plugins():
                plugin.before_index(doc)

            conn = await DatabaseManager.get_connection()
            try:
                # Insert/Update metadata with all new columns
                await conn.execute('''
                    INSERT OR REPLACE INTO documents 
                    (id, filename, path, file_type, file_size, folder_path, is_ocr, 
                     ocr_confidence, tags, page_count, created_at, indexed_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ''', (
                    doc.id, doc.filename, doc.path, doc.file_type,
                    doc.file_size, doc.folder_path, 1 if doc.is_ocr else 0,
                    doc.ocr_confidence, json.dumps(doc.tags),
                    doc.page_count, doc.created_at
                ))

                # Delete existing FTS entry to avoid duplicates
                await conn.execute('DELETE FROM documents_fts WHERE id = ?', (doc.id,))

                # Insert into FTS — now indexing filename AND content
                await conn.execute('''
                    INSERT INTO documents_fts (id, filename, content)
                    VALUES (?, ?, ?)
                ''', (doc.id, doc.filename, doc.content))

                await conn.commit()
                return True
            finally:
                await conn.close()
        except Exception as e:
            logger.error(f"Failed to index document {doc.id}: {e}")
            return False

    async def search(
        self,
        query: str,
        filters: SearchFilters | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> PaginatedSearchResponse:
        """
        Executes an FTS5 search with:
        - BM25 relevance ranking
        - Recency boosting (time-decay)
        - Multi-snippet generation
        - Filter support (file_type, is_ocr, folder, tags)
        - Pagination
        """
        await self.ensure_initialized()
        results = []
        total = 0
        offset = (page - 1) * page_size

        try:
            conn = await DatabaseManager.get_connection()
            try:
                # Build dynamic WHERE clauses for filters
                where_clauses = ["documents_fts MATCH ?"]
                params: list = [query]

                if filters:
                    if filters.file_type:
                        where_clauses.append("d.file_type = ?")
                        params.append(filters.file_type)
                    if filters.is_ocr is not None:
                        where_clauses.append("d.is_ocr = ?")
                        params.append(1 if filters.is_ocr else 0)
                    if filters.folder:
                        where_clauses.append("d.folder_path LIKE ?")
                        params.append(f"{filters.folder}%")
                    if filters.tags:
                        for tag in filters.tags:
                            where_clauses.append("d.tags LIKE ?")
                            params.append(f"%{tag}%")

                where_sql = " AND ".join(where_clauses)

                # Count total matching results for pagination metadata
                count_sql = f'''
                    SELECT COUNT(*) as total
                    FROM documents_fts fts
                    JOIN documents d ON fts.id = d.id
                    WHERE {where_sql}
                '''
                cursor = await conn.execute(count_sql, params)
                row = await cursor.fetchone()
                total = row[0] if row else 0

                # Main search query with BM25 + recency combined ranking
                # BM25 returns negative values (lower = more relevant)
                # Recency boost: exp(-age_days / 30) gives recent files a boost
                search_sql = f'''
                    SELECT 
                        d.id,
                        d.filename,
                        d.path,
                        d.file_type,
                        d.file_size,
                        d.folder_path,
                        d.is_ocr,
                        d.ocr_confidence,
                        d.tags,
                        d.page_count,
                        d.created_at,
                        d.indexed_at,
                        snippet(documents_fts, 2, '<mark>', '</mark>', '…', 32) as snippet,
                        highlight(documents_fts, 1, '<mark>', '</mark>') as highlighted_filename,
                        bm25(documents_fts) as bm25_score,
                        (julianday('now') - julianday(d.indexed_at)) as age_days
                    FROM documents_fts fts
                    JOIN documents d ON fts.id = d.id
                    WHERE {where_sql}
                    ORDER BY (bm25(documents_fts) - (1.0 / (1.0 + (julianday('now') - julianday(d.indexed_at)))))
                    LIMIT ? OFFSET ?
                '''
                params.extend([page_size, offset])

                cursor = await conn.execute(search_sql, params)
                rows = await cursor.fetchall()

                for row in rows:
                    age_days = row[15] if row[15] else 0
                    bm25_raw = abs(row[14])
                    # Recency boost: exponential decay over 30 days
                    recency_boost = math.exp(-age_days / 30.0)
                    combined_score = round(bm25_raw + recency_boost, 4)

                    tags = []
                    try:
                        tags = json.loads(row[8]) if row[8] else []
                    except (json.JSONDecodeError, TypeError):
                        pass

                    results.append(SearchResult(
                        id=row[0],
                        filename=row[1],
                        path=row[2],
                        file_type=row[3] or "unknown",
                        file_size=row[4] or 0,
                        folder_path=row[5] or "",
                        is_ocr=bool(row[6]),
                        ocr_confidence=row[7] or 0.0,
                        tags=tags,
                        page_count=row[8] if isinstance(row[8], int) else 0,
                        created_at=row[10] or "",
                        snippet=row[12] or "",
                        highlighted_filename=row[13] or row[1],
                        relevance_score=combined_score,
                    ))

                return PaginatedSearchResponse(
                    results=results,
                    total=total,
                    page=page,
                    page_size=page_size,
                    total_pages=math.ceil(total / page_size) if total > 0 else 0,
                    query=query,
                )
            finally:
                await conn.close()
        except Exception as e:
            logger.error(f"Search failed for query '{query}': {e}")
            return PaginatedSearchResponse(
                results=[],
                total=0,
                page=page,
                page_size=page_size,
                total_pages=0,
                query=query,
            )

    async def get_document(self, doc_id: str) -> dict | None:
        """Fetches full document metadata + extracted text for preview."""
        await self.ensure_initialized()
        try:
            conn = await DatabaseManager.get_connection()
            try:
                cursor = await conn.execute('''
                    SELECT d.*, fts.content
                    FROM documents d
                    LEFT JOIN documents_fts fts ON d.id = fts.id
                    WHERE d.id = ?
                ''', (doc_id,))
                row = await cursor.fetchone()
                if not row:
                    return None

                tags = []
                try:
                    tags = json.loads(row[8]) if row[8] else []
                except (json.JSONDecodeError, TypeError):
                    pass

                return {
                    "id": row[0],
                    "filename": row[1],
                    "path": row[2],
                    "file_type": row[3],
                    "file_size": row[4],
                    "folder_path": row[5],
                    "is_ocr": bool(row[6]),
                    "ocr_confidence": row[7],
                    "tags": tags,
                    "page_count": row[9],
                    "created_at": row[10],
                    "indexed_at": row[11],
                    "content": row[12] or "",
                }
            finally:
                await conn.close()
        except Exception as e:
            logger.error(f"Failed to get document {doc_id}: {e}")
            return None

    async def delete_document(self, doc_id: str) -> bool:
        """Removes a document from the index."""
        try:
            await self.ensure_initialized()
            conn = await DatabaseManager.get_connection()
            try:
                await conn.execute('DELETE FROM documents WHERE id = ?', (doc_id,))
                await conn.execute('DELETE FROM documents_fts WHERE id = ?', (doc_id,))
                await conn.commit()
                return True
            finally:
                await conn.close()
        except Exception as e:
            logger.error(f"Failed to delete document {doc_id}: {e}")
            return False
