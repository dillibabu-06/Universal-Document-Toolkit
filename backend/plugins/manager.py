import importlib.util
from pathlib import Path
from loguru import logger
from typing import List
from fastapi import APIRouter

from backend.config.settings import settings
from backend.models.search_models import DocumentIndex

class Plugin:
    """Base interface for all plugins."""
    name: str = "BasePlugin"
    version: str = "1.0.0"
    
    def on_load(self):
        """Called when the plugin is initialized."""
        pass
        
    def before_index(self, doc: DocumentIndex):
        """Called before a document is written to the FTS5 database."""
        pass
        
    def get_api_router(self) -> APIRouter | None:
        """Return an APIRouter to mount custom API endpoints."""
        return None

class PluginManager:
    """Discovers, loads, and manages lifecycle hooks of all plugins."""
    
    _plugins: List[Plugin] = []
    
    @classmethod
    def load_plugins(cls):
        """Scans the plugins directory and dynamically imports them."""
        cls._plugins.clear()
        
        plugins_dir = settings.PLUGINS_DIR
        if not plugins_dir.exists():
            plugins_dir.mkdir(parents=True, exist_ok=True)
            
        logger.info(f"Scanning for plugins in {plugins_dir}...")
        
        for folder in plugins_dir.iterdir():
            if folder.is_dir():
                plugin_file = folder / "plugin.py"
                if plugin_file.exists():
                    try:
                        spec = importlib.util.spec_from_file_location(f"plugin_{folder.name}", plugin_file)
                        module = importlib.util.module_from_spec(spec)
                        spec.loader.exec_module(module)
                        
                        if hasattr(module, "register_plugin"):
                            plugin_instance = module.register_plugin()
                            if isinstance(plugin_instance, Plugin):
                                plugin_instance.on_load()
                                cls._plugins.append(plugin_instance)
                                logger.success(f"Loaded plugin: {plugin_instance.name} v{plugin_instance.version}")
                            else:
                                logger.warning(f"Plugin in {folder.name} did not return a valid Plugin instance.")
                    except Exception as e:
                        logger.error(f"Failed to load plugin from {folder.name}: {e}")
                        
    @classmethod
    def get_plugins(cls) -> List[Plugin]:
        return cls._plugins
