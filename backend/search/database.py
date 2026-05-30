import os
import aiosqlite
from loguru import logger
from backend.config.settings import settings


class DatabaseManager:
    """Manages async SQLite connection and FTS5 schema initialization."""

    @staticmethod
    async def get_connection() -> aiosqlite.Connection:
        """Returns an async connection to the SQLite database."""
        db_path = os.getenv("SHARED_DATABASE_PATH") or str(settings.DATABASE_URL)
        conn = await aiosqlite.connect(db_path)
        conn.row_factory = aiosqlite.Row
        await conn.execute("PRAGMA journal_mode=WAL")
        await conn.execute("PRAGMA synchronous=NORMAL")
        return conn

    @staticmethod
    async def init_db():
        """Initializes the standard and FTS tables if they do not exist."""
        try:
            conn = await DatabaseManager.get_connection()
            try:
                # Standard metadata table — expanded with filter/ranking columns
                await conn.execute('''
                    CREATE TABLE IF NOT EXISTS documents (
                        id TEXT PRIMARY KEY,
                        filename TEXT NOT NULL,
                        path TEXT NOT NULL,
                        file_type TEXT,
                        file_size INTEGER DEFAULT 0,
                        folder_path TEXT,
                        is_ocr INTEGER DEFAULT 0,
                        ocr_confidence REAL DEFAULT 0.0,
                        tags TEXT DEFAULT '[]',
                        page_count INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')

                # Index for fast filter queries
                await conn.execute('''
                    CREATE INDEX IF NOT EXISTS idx_documents_file_type 
                    ON documents(file_type)
                ''')
                await conn.execute('''
                    CREATE INDEX IF NOT EXISTS idx_documents_is_ocr 
                    ON documents(is_ocr)
                ''')
                await conn.execute('''
                    CREATE INDEX IF NOT EXISTS idx_documents_folder_path 
                    ON documents(folder_path)
                ''')
                await conn.execute('''
                    CREATE INDEX IF NOT EXISTS idx_documents_indexed_at 
                    ON documents(indexed_at)
                ''')

                # FTS5 table — now indexes both filename and content for richer matches
                await conn.execute('''
                    CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
                        id UNINDEXED,
                        filename,
                        content,
                        tokenize="unicode61 remove_diacritics 1"
                    )
                ''')

                # Saved searches table
                await conn.execute('''
                    CREATE TABLE IF NOT EXISTS saved_searches (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT,
                        query TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')

                await conn.commit()
                logger.info(f"Database initialized at {settings.DATABASE_URL}")
            finally:
                await conn.close()
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
            raise
