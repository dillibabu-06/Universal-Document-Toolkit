from fastapi import APIRouter, HTTPException
from typing import List
from loguru import logger

from backend.models.automation_models import SyncConfig
from backend.automation.manager import WatcherManager

router = APIRouter(prefix="/api/automation", tags=["automation"])

@router.get("/configs", response_model=List[SyncConfig])
def get_configs():
    return WatcherManager.load_configs()

@router.post("/configs")
def save_config(config: SyncConfig):
    try:
        configs = WatcherManager.load_configs()
        # Update if exists, otherwise append
        idx = next((i for i, c in enumerate(configs) if c.id == config.id), -1)
        if idx >= 0:
            configs[idx] = config
        else:
            configs.append(config)
            
        WatcherManager.save_configs(configs)
        WatcherManager.sync_watchers()
        return {"status": "success", "config": config.model_dump()}
    except Exception as e:
        logger.error(f"Failed to save config: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/configs/{config_id}")
def delete_config(config_id: str):
    try:
        configs = WatcherManager.load_configs()
        configs = [c for c in configs if c.id != config_id]
        WatcherManager.save_configs(configs)
        WatcherManager.sync_watchers()
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Failed to delete config: {e}")
        raise HTTPException(status_code=500, detail=str(e))
