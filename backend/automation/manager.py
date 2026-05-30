import json
from loguru import logger
from backend.config.settings import settings
from backend.models.automation_models import SyncConfig
from backend.automation.watcher import DirectoryWatcher

class WatcherManager:
    _watchers = {}  # config_id -> DirectoryWatcher
    _store_path = settings.DATA_DIR / "automation.json"

    @classmethod
    def load_configs(cls) -> list[SyncConfig]:
        if not cls._store_path.exists():
            return []
        try:
            with open(cls._store_path, "r") as f:
                data = json.load(f)
            return [SyncConfig(**item) for item in data]
        except Exception as e:
            logger.error(f"Failed to load automation configs: {e}")
            return []

    @classmethod
    def save_configs(cls, configs: list[SyncConfig]):
        try:
            with open(cls._store_path, "w") as f:
                json.dump([c.model_dump() for c in configs], f, default=str)
        except Exception as e:
            logger.error(f"Failed to save automation configs: {e}")

    @classmethod
    def sync_watchers(cls):
        """Stops removed watchers, starts new ones, reloads modified ones."""
        configs = cls.load_configs()
        active_ids = []
        
        for config in configs:
            active_ids.append(config.id)
            # If watcher exists, stop and replace it to apply new rules (could be optimized)
            if config.id in cls._watchers:
                cls._watchers[config.id].stop()
                
            if config.active:
                watcher = DirectoryWatcher(config)
                cls._watchers[config.id] = watcher
                watcher.start()
                
        # Stop watchers that are no longer in the config
        for cid in list(cls._watchers.keys()):
            if cid not in active_ids:
                cls._watchers[cid].stop()
                del cls._watchers[cid]

    @classmethod
    def stop_all(cls):
        for watcher in cls._watchers.values():
            watcher.stop()
        cls._watchers.clear()
