from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from backend.config.settings import settings
from backend.core.logger import setup_logging
from backend.core.validation import run_startup_checks
from backend.api.routers import search, documents, pdf_tools, office_tools, automation, settings
from backend.plugins.manager import PluginManager

# Setup logging and validations
setup_logging(settings)
run_startup_checks(settings)

# Load dynamic plugins
PluginManager.load_plugins()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Universal Document Toolkit Local API"
)

# Allow React dev server to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router)
app.include_router(documents.router)
app.include_router(pdf_tools.router)
app.include_router(office_tools.router)
app.include_router(automation.router)
app.include_router(settings.router)

# Mount plugin routers dynamically
for plugin in PluginManager.get_plugins():
    router = plugin.get_api_router()
    if router:
        app.include_router(router)
        logger.info(f"Mounted API router for plugin: {plugin.name}")

from backend.automation.manager import WatcherManager

@app.on_event("startup")
async def startup_event():
    logger.info("Local FastAPI server started successfully.")
    
    # Initialize FTS5 search database (async)
    from backend.search.database import DatabaseManager
    await DatabaseManager.init_db()
    
    # Sync and start all automation watchers
    WatcherManager.sync_watchers()

@app.on_event("shutdown")
async def shutdown_event():
    WatcherManager.stop_all()
    from backend.ocr.queue import ocr_queue
    ocr_queue.shutdown()

@app.get("/")
def read_root():
    return {"message": "Universal Document Toolkit API is running."}
