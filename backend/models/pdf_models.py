from pydantic import BaseModel, Field
from pathlib import Path

class PDFMetadata(BaseModel):
    title: str | None = None
    author: str | None = None
    subject: str | None = None
    keywords: str | None = None
    creator: str | None = None
    producer: str | None = None

class WatermarkOptions(BaseModel):
    text: str
    opacity: float = Field(default=0.3, ge=0.0, le=1.0)
    angle: float = 45.0
    color: tuple[float, float, float] = (0.7, 0.7, 0.7)  # RGB 0.0 - 1.0
    fontsize: int = 72

class PDFOperationResult(BaseModel):
    success: bool
    file_path: Path | None = None
    page_count: int = 0
    error_message: str | None = None
