from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from backend.config.settings import settings
import os
import shutil
from loguru import logger

router = APIRouter(prefix="/api/documents", tags=["documents"])

@router.get("/stats")
def get_system_stats():
    """Returns basic stats and recent documents about the monitored directories."""
    inbox_path = settings.SAMPLE_DATA_DIR / "Inbox"
    archive_path = settings.SAMPLE_DATA_DIR / "Archive"
    library_path = settings.DATA_DIR / "library"
    
    inbox_count = len(list(inbox_path.glob("*.*"))) if inbox_path.exists() else 0
    archive_count = len(list(archive_path.glob("*.*"))) if archive_path.exists() else 0
    
    # Get recent documents from library with rich mockup data
    recent_docs = []
    if library_path.exists():
        files = [(f, f.stat().st_mtime) for f in library_path.glob("*.*")]
        files.sort(key=lambda x: x[1], reverse=True)
        for f, mtime in files[:5]:
            ext = f.suffix.lower()
            status = "Indexed" if ext in [".pdf", ".txt"] else "OCR Complete"
            recent_docs.append({
                "name": f.name,
                "type": ext.lstrip("."),
                "timestamp": mtime,
                "status": status
            })
            
    # Mock activity feed
    activity_feed = [
        {"id": 1, "text": f"{recent_docs[0]['name'] if recent_docs else 'invoice_april.pdf'} indexed", "time": "Just now", "type": "index"},
        {"id": 2, "text": "OCR completed for contract_scan.pdf", "time": "2m ago", "type": "ocr"},
        {"id": 3, "text": "Database optimized", "time": "15m ago", "type": "system"},
        {"id": 4, "text": "3 files moved to Archive", "time": "1h ago", "type": "automation"}
    ]
        
    # Get queue stats
    from backend.ocr.queue import ocr_queue
    from backend.models.ocr_models import OCRStatus
    active_jobs = sum(1 for job in ocr_queue._jobs.values() if job.status == OCRStatus.PROCESSING)
    pending_jobs = sum(1 for job in ocr_queue._jobs.values() if job.status == OCRStatus.PENDING)
    
    return {
        "inbox_files": inbox_count,
        "archive_files": archive_count,
        "indexed_count": len(list(library_path.glob("*.*"))) if library_path.exists() else 0,
        "recent_documents": recent_docs,
        "activity_feed": activity_feed,
        "processing_queue": {"active": active_jobs, "pending": pending_jobs, "task": "OCR Processing"} if (active_jobs > 0 or pending_jobs > 0) else None,
        "db_size_mb": round(os.path.getsize(settings.DATABASE_URL) / (1024 * 1024), 2) if os.path.exists(settings.DATABASE_URL) else 0
    }

@router.get("/queue/status")
def get_queue_status():
    """Returns the live status of the OCR queue."""
    from backend.ocr.queue import ocr_queue
    from backend.models.ocr_models import OCRStatus
    
    active = 0
    pending = 0
    completed = 0
    failed = 0
    
    jobs = []
    for job_id, job in ocr_queue._jobs.items():
        if job.status == OCRStatus.PROCESSING: active += 1
        elif job.status == OCRStatus.PENDING: pending += 1
        elif job.status == OCRStatus.COMPLETED: completed += 1
        elif job.status == OCRStatus.FAILED: failed += 1
        
        jobs.append({
            "id": job_id,
            "status": job.status,
            "progress": job.progress,
            "error": job.error
        })
        
    return {
        "active": active,
        "pending": pending,
        "completed": completed,
        "failed": failed,
        "jobs": jobs
    }

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """Receives a file, saves it, extracts text, and indexes it."""
    try:
        # Save file to a permanent library location
        library_path = settings.DATA_DIR / "library"
        library_path.mkdir(parents=True, exist_ok=True)
        
        file_path = library_path / file.filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Extract Text natively
        content = ""
        file_type = file_path.suffix.lower()
        if file_type == ".pdf":
            from backend.pdf.engine import PDFEngine
            content = PDFEngine.extract_text(file_path).strip()
            
        import uuid
        doc_id = str(uuid.uuid4())
        
        # Route to OCR Queue if native extraction yields no text or if it's an image
        needs_ocr = False
        if file_type in [".png", ".jpg", ".jpeg", ".tiff"]:
            needs_ocr = True
        elif file_type == ".pdf" and len(content) < 50:
            needs_ocr = True
            
        if needs_ocr:
            from backend.ocr.queue import ocr_queue
            from backend.models.ocr_models import OCRTask
            
            task = OCRTask(
                doc_id=doc_id,
                filename=file.filename,
                file_path=file_path,
                is_pdf=(file_type == ".pdf")
            )
            job_id = ocr_queue.submit_job(task)
            logger.info(f"Routed {file.filename} to OCR Queue. Job ID: {job_id}")
            
            return {"status": "processing", "filename": file.filename, "message": "File routed to OCR queue for deep extraction."}
            
        # Standard Indexing if text was found natively
        from backend.search.engine import SearchEngine
        from backend.models.search_models import DocumentIndex
        
        search_engine = SearchEngine()
        doc = DocumentIndex(
            id=doc_id,
            filename=file.filename,
            path=str(file_path),
            file_type=file_type.lstrip("."),
            tags=["uploaded", "native_text"],
            content=content
        )
        await search_engine.index_document(doc)
        
        return {"status": "success", "filename": file.filename, "message": "File indexed natively!"}
        
    except Exception as e:
        logger.error(f"Failed to upload document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class LocalOcrRequest(BaseModel):
    doc_id: str
    file_path: str

@router.post("/ocr/local")
async def trigger_local_ocr(req: LocalOcrRequest):
    """Triggers background OCR for a local document path in watched workspaces."""
    try:
        path = Path(req.file_path)
        if not path.exists():
            raise HTTPException(status_code=404, detail="File path does not exist on disk")

        file_type = path.suffix.lower()
        is_pdf = file_type == ".pdf"

        from backend.ocr.queue import ocr_queue
        from backend.models.ocr_models import OCRTask
        
        task = OCRTask(
            doc_id=req.doc_id,
            filename=path.name,
            file_path=path,
            is_pdf=is_pdf
        )
        job_id = ocr_queue.submit_job(task)
        logger.info(f"Local OCR job submitted for {path.name}. Job ID: {job_id}")
        
        return {"status": "success", "job_id": job_id, "message": "OCR job queued."}
    except Exception as e:
        logger.error(f"Failed to submit local OCR job: {e}")
        raise HTTPException(status_code=500, detail=str(e))
