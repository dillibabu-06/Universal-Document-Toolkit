import json
import math
import time
from loguru import logger

from backend.search.database import DatabaseManager
from backend.models.search_models import DocumentIndex, SearchResult, SearchFilters, PaginatedSearchResponse


class SearchEngine:
    """Core engine for FTS5 document indexing and searching bridged to smart_workflow.db."""

    def __init__(self):
        self._initialized = False

    async def ensure_initialized(self):
        # We do not initialize tables here since the Rust refinery migrations bootstrap schemas automatically.
        self._initialized = True

    async def index_document(self, doc: DocumentIndex) -> bool:
        """Indexes a document into the unified Rust files & document_content tables."""
        try:
            conn = await DatabaseManager.get_connection()
            try:
                # 1. Fetch dynamic workspace ID from workspaces table
                async with conn.execute('SELECT id FROM workspaces LIMIT 1') as cursor:
                    row = await cursor.fetchone()
                    workspace_id = row[0] if row else 'default'

                # 2. Insert or replace metadata inside standard files table
                ext = doc.file_type or doc.path.split('.')[-1].lower() if '.' in doc.path else 'pdf'
                await conn.execute('''
                    INSERT OR REPLACE INTO files 
                    (id, workspace_id, filename, extension, path, size, hash, created_at, modified_at, indexed_at, category)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    doc.id, workspace_id, doc.filename, ext, doc.path,
                    doc.file_size or 0, 'hash-' + doc.id[:8], int(time.time()), int(time.time()), int(time.time()),
                    'Other'
                ))

                # 3. Insert or replace extracted OCR text inside unified document_content table
                status = 'OCR_PDF' if doc.is_ocr else 'NATIVE_PDF'
                await conn.execute('''
                    INSERT OR REPLACE INTO document_content
                    (file_id, extracted_text, extraction_status, extraction_confidence, extracted_at)
                    VALUES (?, ?, ?, ?, ?)
                ''', (
                    doc.id, doc.content, status, doc.ocr_confidence or 1.0, int(time.time())
                ))

                await conn.commit()
                logger.info(f"Unified index entry successfully created for document: {doc.filename}")
                return True
            finally:
                await conn.close()
        except Exception as e:
            logger.error(f"Failed to index document {doc.id} in unified DB: {e}")
            return False

    async def search(
        self,
        query: str,
        filters: SearchFilters | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> PaginatedSearchResponse:
        """
        Executes an FTS5 search across the unified smart_workflow.db files_fts virtual table.
        """
        results = []
        total = 0
        offset = (page - 1) * page_size

        try:
            conn = await DatabaseManager.get_connection()
            try:
                # Build dynamic WHERE clauses for filters matching files_fts
                where_clauses = ["files_fts MATCH ?"]
                params: list = [query]

                if filters:
                    if filters.file_type:
                        where_clauses.append("f.extension = ?")
                        params.append(filters.file_type)
                    if filters.folder:
                        where_clauses.append("f.path LIKE ?")
                        params.append(f"%{filters.folder}%")

                where_sql = " AND ".join(where_clauses)

                # Count total matching results
                count_sql = f'''
                    SELECT COUNT(*) as total
                    FROM files_fts fts
                    JOIN files f ON fts.file_id = f.id
                    WHERE {where_sql}
                '''
                cursor = await conn.execute(count_sql, params)
                row = await cursor.fetchone()
                total = row[0] if row else 0

                # Main unified search query
                search_sql = f'''
                    SELECT 
                        f.id,
                        f.filename,
                        f.path,
                        f.extension as file_type,
                        f.size as file_size,
                        f.category,
                        c.extraction_status,
                        c.extraction_confidence,
                        f.created_at,
                        f.indexed_at,
                        snippet(files_fts, 2, '<mark>', '</mark>', '…', 32) as snippet,
                        highlight(files_fts, 1, '<mark>', '</mark>') as highlighted_filename
                    FROM files_fts fts
                    JOIN files f ON fts.file_id = f.id
                    LEFT JOIN document_content c ON f.id = c.file_id
                    WHERE {where_sql}
                    LIMIT ? OFFSET ?
                '''
                params.extend([page_size, offset])

                cursor = await conn.execute(search_sql, params)
                rows = await cursor.fetchall()

                for row in rows:
                    is_ocr = row[6] in ['OCR_PDF', 'OCR_IMAGE'] if row[6] else False
                    results.append(SearchResult(
                        id=row[0],
                        filename=row[1],
                        path=row[2],
                        file_type=row[3] or "unknown",
                        file_size=row[4] or 0,
                        folder_path="",
                        is_ocr=is_ocr,
                        ocr_confidence=row[7] or 1.0,
                        tags=[row[5]] if row[5] else [],
                        page_count=1,
                        created_at=str(row[8]),
                        snippet=row[10] or "",
                        highlighted_filename=row[11] or row[1],
                        relevance_score=1.0,
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
            logger.error(f"Unified FTS search failed for query '{query}': {e}")
            return PaginatedSearchResponse(
                results=[],
                total=0,
                page=page,
                page_size=page_size,
                total_pages=0,
                query=query,
            )

    async def get_document(self, doc_id: str) -> dict | None:
        """Fetches full document metadata + extracted text for unified preview."""
        try:
            conn = await DatabaseManager.get_connection()
            try:
                cursor = await conn.execute('''
                    SELECT f.id, f.filename, f.path, f.extension, f.size, f.category, f.created_at, f.indexed_at,
                           c.extracted_text, c.extraction_confidence, c.extraction_status
                    FROM files f
                    LEFT JOIN document_content c ON f.id = c.file_id
                    WHERE f.id = ?
                ''', (doc_id,))
                row = await cursor.fetchone()
                if not row:
                    return None

                is_ocr = row[10] in ['OCR_PDF', 'OCR_IMAGE'] if row[10] else False
                return {
                    "id": row[0],
                    "filename": row[1],
                    "path": row[2],
                    "file_type": row[3],
                    "file_size": row[4],
                    "folder_path": "",
                    "is_ocr": is_ocr,
                    "ocr_confidence": row[9] or 1.0,
                    "tags": [row[5]] if row[5] else [],
                    "page_count": 1,
                    "created_at": str(row[6]),
                    "indexed_at": str(row[7]),
                    "content": row[8] or "",
                }
            finally:
                await conn.close()
        except Exception as e:
            logger.error(f"Failed to get unified document {doc_id}: {e}")
            return None

    async def delete_document(self, doc_id: str) -> bool:
        """Removes a document from the unified index."""
        try:
            conn = await DatabaseManager.get_connection()
            try:
                await conn.execute('DELETE FROM files WHERE id = ?', (doc_id,))
                await conn.execute('DELETE FROM document_content WHERE file_id = ?', (doc_id,))
                await conn.commit()
                return True
            finally:
                await conn.close()
        except Exception as e:
            logger.error(f"Failed to delete unified document {doc_id}: {e}")
            return False
