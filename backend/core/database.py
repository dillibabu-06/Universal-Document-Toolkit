import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from backend.config.settings import settings

# Dynamically locate the unified SQLite database via environment variable injected by Tauri core
db_path = os.getenv("SHARED_DATABASE_PATH") or str(settings.DATABASE_URL)
if not db_path.startswith('/'):
    db_path = '/' + db_path
DATABASE_URL = f"sqlite+aiosqlite:///{db_path}"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
