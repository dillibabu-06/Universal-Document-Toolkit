from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import FileResponse
from typing import List, Optional
from pathlib import Path

from backend.search.engine import SearchEngine
from backend.models.search_models import SearchFilters, PaginatedSearchResponse

router = APIRouter(prefix="/api/search", tags=["search"])
search_engine = SearchEngine()


@router.get("/", response_model=PaginatedSearchResponse)
async def search_documents(
    q: str = Query(..., min_length=1, description="The search query"),
    file_type: Optional[str] = Query(None, description="Filter by file type (pdf, docx, png, etc.)"),
    is_ocr: Optional[bool] = Query(None, description="Filter OCR-processed documents only"),
    folder: Optional[str] = Query(None, description="Filter by folder path prefix"),
    tags: Optional[str] = Query(None, description="Comma-separated tags to filter by"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Results per page"),
):
    """
    Executes a full-text search against the local FTS5 database.
    
    Features:
    - BM25 relevance ranking with recency boosting
    - Highlighted snippets with <mark> tags
    - Filterable by file_type, is_ocr, folder, tags
    - Paginated results with total count
    """
    tag_list = [t.strip() for t in tags.split(",")] if tags else None

    filters = SearchFilters(
        file_type=file_type,
        is_ocr=is_ocr,
        folder=folder,
        tags=tag_list,
    )

    result = await search_engine.search(
        query=q,
        filters=filters,
        page=page,
        page_size=page_size,
    )
    return result


@router.get("/preview/{doc_id}")
async def get_document_preview(doc_id: str):
    """
    Returns full document metadata and extracted text content for preview.
    Used by the frontend's DocumentPreview component.
    """
    doc = await search_engine.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.get("/preview/{doc_id}/file")
async def get_document_file(doc_id: str):
    """
    Serves the actual document file for inline preview (PDF iframe, image display, etc.).
    """
    doc = await search_engine.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    file_path = Path(doc["path"])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    # Determine media type
    ext = file_path.suffix.lower()
    media_types = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".txt": "text/plain",
        ".md": "text/markdown",
    }
    media_type = media_types.get(ext, "application/octet-stream")

    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        filename=doc["filename"],
    )
