from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pathlib import Path
import tempfile
import shutil

from backend.pdf.engine import PDFEngine
from backend.models.pdf_models import WatermarkOptions
from loguru import logger

router = APIRouter(prefix="/api/pdf", tags=["pdf_tools"])

class PdfRequest(BaseModel):
    file_path: str

@router.post("/extract")
def extract_pdf_text(req: PdfRequest):
    """Extracts text from a given local PDF path."""
    try:
        path = Path(req.file_path)
        if not path.exists():
            raise HTTPException(status_code=404, detail="File not found")
            
        text = PDFEngine.extract_text(path)
        return {"text": text[:5000]} # Return up to 5000 chars for preview
    except Exception as e:
        logger.error(f"Failed to extract text: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/watermark")
async def watermark_pdf(file: UploadFile = File(...), watermark_text: str = Form(...)):
    """Applies a watermark to an uploaded PDF."""
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir) / file.filename
            with open(tmp_path, "wb") as out:
                shutil.copyfileobj(file.file, out)
                
            out_path = Path(tmpdir) / "watermarked.pdf"
            options = WatermarkOptions(text=watermark_text)
            res = PDFEngine.add_watermark(tmp_path, out_path, options)
            
            if res.success:
                final_out = Path(tempfile.gettempdir()) / f"watermarked_{file.filename}"
                shutil.copy(out_path, final_out)
                return FileResponse(final_out, filename=f"watermarked_{file.filename}", media_type="application/pdf")
            else:
                raise HTTPException(status_code=500, detail=res.error_message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/merge")
async def merge_pdfs(files: list[UploadFile] = File(...)):
    """Merges multiple uploaded PDFs."""
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            input_paths = []
            for i, f in enumerate(files):
                tmp_path = Path(tmpdir) / f"{i}_{f.filename}"
                with open(tmp_path, "wb") as out:
                    shutil.copyfileobj(f.file, out)
                input_paths.append(tmp_path)
                
            out_path = Path(tmpdir) / "merged.pdf"
            res = PDFEngine.merge(input_paths, out_path)
            
            if res.success:
                # We need to return the file, but we can't delete the tmpdir until it's sent.
                # A safer way in a real app is using BackgroundTasks, but for now we copy it to a static temp file
                final_out = Path(tempfile.gettempdir()) / "merged.pdf"
                shutil.copy(out_path, final_out)
                return FileResponse(final_out, filename="merged.pdf", media_type="application/pdf")
            else:
                raise HTTPException(status_code=500, detail=res.error_message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/split")
async def split_pdf(file: UploadFile = File(...), pages_per_split: int = Form(1)):
    """Splits a PDF and returns the first split chunk (for demo). A full app would return a ZIP."""
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir) / file.filename
            with open(tmp_path, "wb") as out:
                shutil.copyfileobj(file.file, out)
                
            out_dir = Path(tmpdir) / "splits"
            results = PDFEngine.split(tmp_path, out_dir, pages_per_split)
            
            if results and results[0].success:
                final_out = Path(tempfile.gettempdir()) / f"split_{file.filename}"
                shutil.copy(results[0].file_path, final_out)
                return FileResponse(final_out, filename=f"split_{file.filename}", media_type="application/pdf")
            else:
                raise HTTPException(status_code=500, detail="Split failed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/compress")
async def compress_pdf(file: UploadFile = File(...)):
    """Compresses a PDF."""
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir) / file.filename
            with open(tmp_path, "wb") as out:
                shutil.copyfileobj(file.file, out)
                
            out_path = Path(tmpdir) / "compressed.pdf"
            res = PDFEngine.compress(tmp_path, out_path)
            
            if res.success:
                final_out = Path(tempfile.gettempdir()) / f"compressed_{file.filename}"
                shutil.copy(out_path, final_out)
                return FileResponse(final_out, filename=f"compressed_{file.filename}", media_type="application/pdf")
            else:
                raise HTTPException(status_code=500, detail=res.error_message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/encrypt")
async def encrypt_pdf(file: UploadFile = File(...), password: str = Form(...)):
    """Encrypts a PDF."""
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir) / file.filename
            with open(tmp_path, "wb") as out:
                shutil.copyfileobj(file.file, out)
                
            out_path = Path(tmpdir) / "encrypted.pdf"
            res = PDFEngine.encrypt(tmp_path, out_path, password)
            
            if res.success:
                final_out = Path(tempfile.gettempdir()) / f"encrypted_{file.filename}"
                shutil.copy(out_path, final_out)
                return FileResponse(final_out, filename=f"encrypted_{file.filename}", media_type="application/pdf")
            else:
                raise HTTPException(status_code=500, detail=res.error_message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
