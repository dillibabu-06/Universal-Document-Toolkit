from pydantic import BaseModel, Field
from typing import List, Optional


class DocumentIndex(BaseModel):
    """Input model for indexing a document."""
    id: str
    filename: str
    path: str
    file_type: str
    file_size: int = 0
    folder_path: str = ""
    is_ocr: bool = False
    ocr_confidence: float = 0.0
    tags: List[str] = []
    page_count: int = 0
    created_at: str = ""
    content: str = ""


class SearchResult(BaseModel):
    """A single search result with BM25 + recency combined score."""
    id: str
    filename: str
    path: str
    file_type: str = "unknown"
    file_size: int = 0
    folder_path: str = ""
    is_ocr: bool = False
    ocr_confidence: float = 0.0
    tags: List[str] = []
    page_count: int = 0
    created_at: str = ""
    snippet: str = ""
    highlighted_filename: str = ""
    relevance_score: float = 0.0


class SearchFilters(BaseModel):
    """Filter parameters for scoped searches."""
    file_type: Optional[str] = None       # e.g. "pdf", "docx", "png"
    is_ocr: Optional[bool] = None         # True = OCR-only results
    folder: Optional[str] = None          # Folder path prefix
    tags: Optional[List[str]] = None      # Tag filter


class PaginatedSearchResponse(BaseModel):
    """Paginated search response envelope."""
    results: List[SearchResult]
    total: int
    page: int
    page_size: int
    total_pages: int
    query: str


class SavedSearch(BaseModel):
    id: int
    name: str
    query: str
