import asyncio
from concurrent.futures import ProcessPoolExecutor
from loguru import logger
import multiprocessing
from pathlib import Path
from typing import Dict

from backend.models.ocr_models import OCRJobStatus, OCRStatus, OCRTask
from backend.ocr.engine import OCREngine

class BackgroundOCRQueue:
    """Manages asynchronous OCR tasks using a ProcessPoolExecutor to avoid blocking."""
    
    def __init__(self, max_workers: int = None):
        if max_workers is None:
            # Leave one core free for the main app if possible
            max_workers = max(1, multiprocessing.cpu_count() - 1)
        self.executor = ProcessPoolExecutor(max_workers=max_workers)
        self._jobs: Dict[str, OCRJobStatus] = {}
        logger.info(f"Initialized OCR Queue with {max_workers} workers.")

    def submit_job(self, task: OCRTask) -> str:
        """Submits an OCR job to the queue."""
        job_id = task.job_id
        
        self._jobs[job_id] = OCRJobStatus(
            job_id=job_id,
            status=OCRStatus.PENDING
        )
        
        # Schedule the background task
        asyncio.create_task(self._process_job(task))
        
        return job_id

    async def _process_job(self, task: OCRTask):
        """Internal asynchronous handler that delegates to the process pool."""
        job_id = task.job_id
        try:
            self._jobs[job_id].status = OCRStatus.PROCESSING
            
            loop = asyncio.get_running_loop()
            
            if task.is_pdf:
                result = await loop.run_in_executor(
                    self.executor,
                    OCREngine.ocr_pdf,
                    task.file_path,
                    task.languages
                )
            else:
                result = await loop.run_in_executor(
                    self.executor,
                    OCREngine.ocr_image,
                    task.file_path,
                    task.languages
                )
            
            self._jobs[job_id].status = OCRStatus.COMPLETED
            self._jobs[job_id].progress = 100.0
            self._jobs[job_id].result = result
            
            # Post-OCR FTS Indexing
            if task.doc_id and task.filename:
                try:
                    from backend.search.engine import SearchEngine
                    from backend.models.search_models import DocumentIndex
                    search_engine = SearchEngine()
                    doc = DocumentIndex(
                        id=task.doc_id,
                        filename=task.filename,
                        path=str(task.file_path),
                        file_type=task.file_path.suffix.lower().lstrip('.'),
                        tags=["ocr_processed"],
                        content=result.text
                    )
                    await search_engine.index_document(doc)
                    logger.info(f"FTS5 indexing complete for OCR Job {job_id}")
                except Exception as e:
                    logger.error(f"FTS5 indexing failed for OCR Job {job_id}: {e}")
            
        except Exception as e:
            logger.error(f"OCR Job {job_id} failed: {e}")
            self._jobs[job_id].status = OCRStatus.FAILED
            self._jobs[job_id].error = str(e)

    def get_job_status(self, job_id: str) -> OCRJobStatus | None:
        """Retrieves the current status of a job."""
        return self._jobs.get(job_id)

    def shutdown(self):
        """Cleanly shuts down the process pool."""
        self.executor.shutdown(wait=True)
        logger.info("OCR Queue shut down.")

# Singleton instance
ocr_queue = BackgroundOCRQueue()
