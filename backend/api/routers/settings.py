import json
import os
import platform
from pathlib import Path
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException
from loguru import logger
import pytesseract

from backend.config.settings import settings
from backend.search.database import DatabaseManager

router = APIRouter(prefix="/api/settings", tags=["settings"])

SETTINGS_FILE = settings.APP_DATA_DIR / "settings.json"

DEFAULT_SETTINGS: Dict[str, Any] = {
    # General
    "theme": "dark",
    "interface_mode": "standard",
    "enable_notifications": True,
    
    # OCR
    "ocr_default_language": "eng",
    "ocr_languages": ["eng"],
    "ocr_engine": "tesseract",
    "auto_ocr_incoming": False,
    "ocr_layout_analysis": True,
    
    # Search
    "auto_index_on_startup": True,
    "exclude_patterns": "node_modules, .git, tmp",
    "max_file_size_mb": 50,
    "index_ocr_text": True,
    
    # Storage
    "max_log_days": 7
}

def load_persisted_settings() -> Dict[str, Any]:
    """Loads settings from settings.json or returns default settings."""
    if not SETTINGS_FILE.exists():
        return DEFAULT_SETTINGS.copy()
    try:
        with open(SETTINGS_FILE, "r") as f:
            persisted = json.load(f)
            # Ensure all default keys exist
            merged = DEFAULT_SETTINGS.copy()
            merged.update(persisted)
            return merged
    except Exception as e:
        logger.error(f"Error reading settings file: {e}")
        return DEFAULT_SETTINGS.copy()

def save_persisted_settings(new_settings: Dict[str, Any]):
    """Saves settings to settings.json."""
    try:
        settings.APP_DATA_DIR.mkdir(parents=True, exist_ok=True)
        with open(SETTINGS_FILE, "w") as f:
            json.dump(new_settings, f, indent=4)
        logger.info("Persisted new application settings.")
    except Exception as e:
        logger.error(f"Error writing settings file: {e}")
        raise

@router.get("")
def get_settings():
    """Retrieves current application settings and system environment info."""
    try:
        current_settings = load_persisted_settings()
        
        # Get PyTesseract version info
        tesseract_ver = "Unknown"
        try:
            tesseract_ver = pytesseract.get_tesseract_version().decode("utf-8").strip()
        except Exception:
            try:
                tesseract_ver = pytesseract.get_tesseract_version()
            except Exception:
                tesseract_ver = "Not Configured / Installed"

        # Construct system info
        sys_info = {
            "os_platform": f"{platform.system()} {platform.release()}",
            "database_path": str(settings.DATABASE_URL),
            "app_data_path": str(settings.APP_DATA_DIR),
            "logs_path": str(settings.LOGS_DIR),
            "plugins_path": str(settings.PLUGINS_DIR),
            "tesseract_version": tesseract_ver
        }
        
        return {
            "settings": current_settings,
            "system_info": sys_info
        }
    except Exception as e:
        logger.error(f"Failed to fetch settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
def update_settings(payload: Dict[str, Any]):
    """Updates persisted settings."""
    try:
        current = load_persisted_settings()
        # Only update keys that exist in defaults to avoid injection of arbitrary keys
        for key, val in payload.items():
            if key in DEFAULT_SETTINGS:
                current[key] = val
        
        save_persisted_settings(current)
        return {"status": "success", "settings": current}
    except Exception as e:
        logger.error(f"Failed to update settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reset")
def reset_settings():
    """Resets settings to original system defaults."""
    try:
        if SETTINGS_FILE.exists():
            os.remove(SETTINGS_FILE)
        logger.info("Settings reset to defaults.")
        return {"status": "success", "settings": DEFAULT_SETTINGS}
    except Exception as e:
        logger.error(f"Failed to reset settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/clear-database")
async def clear_database():
    """Triggers database utility to wipe search index and document metadata."""
    try:
        conn = await DatabaseManager.get_connection()
        try:
            # Drop tables safely
            await conn.execute("DROP TABLE IF EXISTS documents")
            await conn.execute("DROP TABLE IF EXISTS documents_fts")
            await conn.execute("DROP TABLE IF EXISTS saved_searches")
            await conn.commit()
            logger.info("Dropped existing tables for database clear request.")
        finally:
            await conn.close()
            
        # Re-initialize the schema
        await DatabaseManager.init_db()
        return {"status": "success", "message": "Database and Search Index cleared and re-initialized."}
    except Exception as e:
        logger.error(f"Failed to clear database: {e}")
        raise HTTPException(status_code=500, detail=str(e))
