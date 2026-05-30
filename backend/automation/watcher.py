import time
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from loguru import logger
import threading

from backend.models.automation_models import SyncConfig
from backend.automation.engine import AutomationEngine

class DirectoryWatcher(FileSystemEventHandler):
    """Watches a directory for new files and dispatches them to the AutomationEngine."""
    
    def __init__(self, config: SyncConfig):
        self.config = config
        self.observer = Observer()
        self._is_running = False

    def on_created(self, event):
        """Triggered when a file or directory is created."""
        if event.is_directory:
            return
            
        file_path = Path(event.src_path)
        logger.info(f"New file detected: {file_path}")
        
        # Give the OS a moment to finish writing the file
        time.sleep(0.5)
        
        self.process_file(file_path)

    def process_file(self, file_path: Path):
        """Applies rules and moves the file."""
        if not self.config.active:
            return
            
        current_path = file_path
        
        # Ingest Document
        try:
            import uuid
            from backend.pdf.engine import PDFEngine
            from backend.search.engine import SearchEngine
            from backend.models.search_models import DocumentIndex
            
            file_type = current_path.suffix.lower()
            content = ""
            if file_type == ".pdf":
                content = PDFEngine.extract_text(current_path).strip()
            
            doc_id = str(uuid.uuid4())
            needs_ocr = (file_type in [".png", ".jpg", ".jpeg", ".tiff"]) or (file_type == ".pdf" and len(content) < 50)
            
            if needs_ocr:
                from backend.ocr.queue import ocr_queue
                from backend.models.ocr_models import OCRTask
                task = OCRTask(doc_id=doc_id, filename=current_path.name, file_path=current_path, is_pdf=(file_type==".pdf"))
                ocr_queue.submit_job(task)
                logger.info(f"Watcher routed {current_path.name} to OCR Queue")
            else:
                search_engine = SearchEngine()
                doc = DocumentIndex(id=doc_id, filename=current_path.name, path=str(current_path), file_type=file_type.lstrip("."), tags=["auto_ingested"], content=content)
                search_engine.index_document(doc)
                logger.info(f"Watcher indexed {current_path.name} natively")
        except Exception as e:
            logger.error(f"Watcher failed to ingest {current_path.name}: {e}")
        
        # Apply renaming rules
        for rule in self.config.rules:
            new_path = AutomationEngine.apply_renaming(current_path, rule)
            if new_path != current_path:
                current_path = current_path.rename(new_path)
                logger.info(f"Renamed {file_path.name} -> {current_path.name}")
        
        # Organize to destination
        if self.config.destination_folder and self.config.destination_folder != self.config.watch_folder:
            final_path = AutomationEngine.organize_file(current_path, self.config.destination_folder)
            if final_path != current_path:
                logger.success(f"Organized {current_path.name} to {self.config.destination_folder}")

    def start(self):
        """Starts the observer in a background thread."""
        if self._is_running:
            return
            
        if not self.config.watch_folder.exists():
            self.config.watch_folder.mkdir(parents=True, exist_ok=True)
            
        self.observer.schedule(self, str(self.config.watch_folder), recursive=False)
        self.observer.start()
        self._is_running = True
        logger.info(f"Started watching directory: {self.config.watch_folder}")

    def stop(self):
        """Stops the observer safely."""
        if not self._is_running:
            return
            
        self.observer.stop()
        self.observer.join()
        self._is_running = False
        logger.info(f"Stopped watching directory: {self.config.watch_folder}")
