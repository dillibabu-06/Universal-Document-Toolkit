import sys
import socket
import multiprocessing
import uvicorn
from loguru import logger
from backend.config.settings import settings
from backend.core.logger import setup_logging
from backend.core.validation import run_startup_checks
from backend.api.main import app


def get_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("", 0))
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        return s.getsockname()[1]

def main():
    """
    Entry point for the Universal Document Toolkit Backend.
    Initializes core services and validates environment.
    """
    try:
        # Start FastAPI Server dynamically (fallback to port 8000 if needed, but standard uses free port or fixed 8000)
        # To maintain compatibility with our frontend hardcoded http://localhost:8000, we bind to 8000
        port = 8000
        
        # Crucial: This printed line is what Tauri reads to know where the backend is
        print(f"PORT={port}", flush=True)

        logger.info(f"{settings.APP_NAME} backend foundation is ready and running on port {port} in '{settings.APP_ENV}' mode.")
        
        uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")

    except Exception as e:
        # Fallback print if logger failed
        print(f"CRITICAL: Failed to start application. Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    multiprocessing.freeze_support()
    main()
