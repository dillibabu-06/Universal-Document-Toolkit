from pydantic import BaseModel
from pathlib import Path
from typing import List, Optional

class RenameRule(BaseModel):
    id: str
    pattern: str  # e.g. "{date}_{title}.{ext}"
    target_extensions: List[str] = ["*"] # Apply to all or specific extensions like ['.pdf']

class SyncConfig(BaseModel):
    id: str
    watch_folder: Path
    destination_folder: Path
    rules: List[RenameRule] = []
    active: bool = True
