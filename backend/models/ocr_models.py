from pydantic import BaseModel, Field
from pathlib import Path
from enum import Enum
import uuid

class OCRStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class OCRResult(BaseModel):
    text: str
    confidence: float = Field(default=0.0, ge=0.0, le=100.0)
    language: str | None = None

class OCRJobStatus(BaseModel):
    job_id: str
    status: OCRStatus
    progress: float = 0.0
    result: OCRResult | None = None
    error: str | None = None

class OCRTask(BaseModel):
    job_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    doc_id: str | None = None
    filename: str | None = None
    file_path: Path
    languages: list[str] = ["eng"]
    is_pdf: bool = False
