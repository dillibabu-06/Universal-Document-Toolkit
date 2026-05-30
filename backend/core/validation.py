import sys
from loguru import logger
from backend.config.settings import AppSettings


def run_startup_checks(settings: AppSettings) -> None:
    """
    Runs necessary checks and validation before the application starts.
    Validates required directories exist, handles initial setup tasks.
    """
    logger.info("Starting up application validations...")

    directories_to_ensure = [
        settings.LOGS_DIR,
        settings.SAMPLE_DATA_DIR,
    ]

    for directory in directories_to_ensure:
        if not directory.exists():
            logger.info(f"Directory missing, creating: {directory}")
            try:
                directory.mkdir(parents=True, exist_ok=True)
                logger.debug(f"Successfully created {directory}")
            except Exception as e:
                logger.critical(f"Failed to create critical directory {directory}: {e}")
                sys.exit(1)

    logger.info("Startup validations completed successfully.")
