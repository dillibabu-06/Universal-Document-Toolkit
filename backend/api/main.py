from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from backend.config.settings import settings
from backend.core.logger import setup_logging
from backend.core.validation import run_startup_checks
from backend.api.routers import search, documents, pdf_tools, office_tools, settings as settings_router, image_tools
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
    allow_origins=["*"], 
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router)
app.include_router(documents.router)
app.include_router(pdf_tools.router)
app.include_router(image_tools.router)
app.include_router(office_tools.router)
app.include_router(settings_router.router)

# Mount plugin routers dynamically
for plugin in PluginManager.get_plugins():
    router = plugin.get_api_router()
    if router:
        app.include_router(router)
        logger.info(f"Mounted API router for plugin: {plugin.name}")

@app.on_event("startup")
async def startup_event():
    logger.info("Local FastAPI server started successfully.")
    
    # Initialize FTS5 search database (async)
    from backend.search.database import DatabaseManager
    await DatabaseManager.init_db()

@app.on_event("shutdown")
async def shutdown_event():
    pass

@app.get("/")
def read_root():
    return {"message": "Universal Document Toolkit API is running."}
