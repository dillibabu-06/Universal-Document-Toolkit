import os
import hashlib
from pathlib import Path
from loguru import logger
from backend.core.database import AsyncSessionLocal
from backend.models.database_models import Document

async def calculate_file_hash(filepath: str, block_size: int = 65536) -> str:
    """Calculates SHA-256 hash of a file."""
    sha256 = hashlib.sha256()
    with open(filepath, 'rb') as f:
        for block in iter(lambda: f.read(block_size), b''):
            sha256.update(block)
    return sha256.hexdigest()

async def scan_directory(directory: str):
    """Scans a directory and adds new files to the database."""
    logger.info(f"Starting scan of directory: {directory}")
    directory_path = Path(directory)
    if not directory_path.exists() or not directory_path.is_dir():
        logger.error(f"Invalid directory path: {directory}")
        return

    async with AsyncSessionLocal() as session:
        for root, _, files in os.walk(directory):
            for filename in files:
                filepath = os.path.join(root, filename)
                try:
                    file_size = os.path.getsize(filepath)
                    extension = Path(filepath).suffix.lower()
                    file_hash = await calculate_file_hash(filepath)

                    # Simple unique check (in real life, we should query DB first to avoid duplicate inserts)
                    doc = Document(
                        filename=filename,
                        filepath=filepath,
                        file_hash=file_hash,
                        file_size=file_size,
                        extension=extension
                    )
                    session.add(doc)
                except Exception as e:
                    logger.warning(f"Failed to process file {filepath}: {e}")
        
        try:
            await session.commit()
            logger.info("Finished scanning and saved new documents to DB.")
        except Exception as e:
            await session.rollback()
            logger.error(f"Failed to save documents to DB: {e}")
