from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


import platformdirs

class AppSettings(BaseSettings):
    """
    Centralized configuration settings for the Universal Document Toolkit.
    Values can be overridden using environment variables or a .env file.
    """
    # App info
    APP_NAME: str = "Universal Document Toolkit"
    APP_VERSION: str = "0.1.0"
    APP_ENV: str = "production" # Changed to production for Phase E

    # Paths
    BASE_DIR: Path = Path(__file__).parent.parent.parent
    
    # OS Native paths using platformdirs
    APP_DATA_DIR: Path = Path(platformdirs.user_data_dir(APP_NAME, "UDT"))
    
    LOGS_DIR: Path = APP_DATA_DIR / "logs"
    SAMPLE_DATA_DIR: Path = APP_DATA_DIR / "sample_data"
    DATA_DIR: Path = APP_DATA_DIR / "data"
    PLUGINS_DIR: Path = APP_DATA_DIR / "plugins"
    
    # Database
    DATABASE_URL: str = str(DATA_DIR / "index.db")
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Ensure directories exist
        for path in [self.APP_DATA_DIR, self.LOGS_DIR, self.SAMPLE_DATA_DIR, self.DATA_DIR, self.PLUGINS_DIR]:
            path.mkdir(parents=True, exist_ok=True)

    # Logging config
    LOG_LEVEL: str = "DEBUG"
    LOG_ROTATION: str = "10 MB"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


# Create a global instance of settings to be used throughout the app
settings = AppSettings()
