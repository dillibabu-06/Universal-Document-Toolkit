from pydantic import BaseModel
from pathlib import Path
from datetime import datetime

class WordMetadata(BaseModel):
    author: str | None = None
    created: datetime | None = None
    modified: datetime | None = None
    title: str | None = None
    subject: str | None = None
    revision: int | None = None

class SpreadsheetStats(BaseModel):
    row_count: int
    column_count: int
    sheet_names: list[str]
    numeric_columns_summary: dict | None = None
    
class OfficeOperationResult(BaseModel):
    success: bool
    file_path: Path | None = None
    error_message: str | None = None
