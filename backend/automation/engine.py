from pathlib import Path
import shutil
import datetime
from loguru import logger

from backend.models.automation_models import RenameRule, SyncConfig

class AutomationEngine:
    """Core engine for file renaming and organization."""
    
    @staticmethod
    def apply_renaming(file_path: Path, rule: RenameRule, metadata: dict = None) -> Path:
        """
        Determines the new filename based on the rule pattern.
        Pattern can contain {date}, {title}, {ext}, etc.
        """
        try:
            if "*" not in rule.target_extensions and file_path.suffix.lower() not in rule.target_extensions:
                return file_path
                
            metadata = metadata or {}
            
            # Built-in context
            context = {
                "date": datetime.date.today().isoformat(),
                "time": datetime.datetime.now().strftime("%H%M%S"),
                "ext": file_path.suffix.lstrip("."),
                "original_name": file_path.stem
            }
            context.update(metadata)
            
            # Format the new name
            new_stem = rule.pattern
            for key, val in context.items():
                new_stem = new_stem.replace(f"{{{key}}}", str(val))
                
            new_name = f"{new_stem}{file_path.suffix}"
            return file_path.parent / new_name
            
        except Exception as e:
            logger.error(f"Failed to apply renaming rule to {file_path}: {e}")
            return file_path

    @staticmethod
    def organize_file(file_path: Path, dest_dir: Path, overwrite: bool = False) -> Path:
        """Moves a file securely to a new directory, handling conflicts."""
        try:
            if not dest_dir.exists():
                dest_dir.mkdir(parents=True, exist_ok=True)
                
            dest_path = dest_dir / file_path.name
            
            if dest_path.exists() and not overwrite:
                # Append a counter
                counter = 1
                while dest_path.exists():
                    dest_path = dest_dir / f"{file_path.stem} ({counter}){file_path.suffix}"
                    counter += 1
            
            # Move the file
            shutil.move(str(file_path), str(dest_path))
            return dest_path
            
        except Exception as e:
            logger.error(f"Failed to organize file {file_path}: {e}")
            return file_path
