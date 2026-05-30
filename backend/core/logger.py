import sys
from loguru import logger
from backend.config.settings import AppSettings


def setup_logging(settings: AppSettings) -> None:
    """
    Configures centralized logging for the application.
    Writes to both the console and rotating log files.
    """
    # Remove default logger
    logger.remove()

    # Add console logger
    logger.add(
        sys.stderr,
        level=settings.LOG_LEVEL,
        format="<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        colorize=True,
    )

    # Ensure logs directory exists
    settings.LOGS_DIR.mkdir(parents=True, exist_ok=True)
    log_file_path = settings.LOGS_DIR / "app.log"

    # Add file logger
    logger.add(
        log_file_path,
        level=settings.LOG_LEVEL,
        format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:{function}:{line} - {message}",
        rotation=settings.LOG_ROTATION,
        compression="zip",
        enqueue=True, # Thread-safe writing
    )
    
    logger.debug(f"Logging initialized. Level: {settings.LOG_LEVEL}")
