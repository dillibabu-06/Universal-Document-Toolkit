from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from pathlib import Path
import tempfile
import shutil
import json

from backend.word.engine import WordEngine
from backend.excel.engine import SpreadsheetEngine
from loguru import logger

router = APIRouter(prefix="/api/office", tags=["office_tools"])

# ==========================================
# WORD ENGINE ENDPOINTS
# ==========================================

@router.post("/word/extract")
async def extract_word_text(file: UploadFile = File(...)):
    """Extracts text and metadata from a DOCX file."""
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir) / file.filename
            with open(tmp_path, "wb") as out:
                shutil.copyfileobj(file.file, out)
                
            text = WordEngine.extract_text(tmp_path)
            metadata = WordEngine.extract_metadata(tmp_path)
            
            return {
                "text": text[:5000],  # Return snippet for preview
                "metadata": metadata.model_dump() if metadata else None
            }
    except Exception as e:
        logger.error(f"Failed to extract word: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/word/template")
async def process_word_template(file: UploadFile = File(...), context: str = Form(...)):
    """Replaces variables in a DOCX template. context is a JSON string."""
    try:
        context_dict = json.loads(context)
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir) / file.filename
            with open(tmp_path, "wb") as out:
                shutil.copyfileobj(file.file, out)
                
            out_path = Path(tmpdir) / f"filled_{file.filename}"
            res = WordEngine.replace_template(tmp_path, out_path, context_dict)
            
            if res.success:
                final_out = Path(tempfile.gettempdir()) / out_path.name
                shutil.copy(out_path, final_out)
                return FileResponse(final_out, filename=out_path.name, media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document")
            else:
                raise HTTPException(status_code=500, detail=res.error_message)
    except Exception as e:
        logger.error(f"Template failure: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/word/to-pdf")
async def word_to_pdf(file: UploadFile = File(...)):
    """Converts a DOCX to PDF using local LibreOffice."""
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir) / file.filename
            with open(tmp_path, "wb") as out:
                shutil.copyfileobj(file.file, out)
                
            out_path = Path(tmpdir) / f"{tmp_path.stem}.pdf"
            res = WordEngine.convert_to_pdf(tmp_path, out_path)
            
            if res.success:
                final_out = Path(tempfile.gettempdir()) / out_path.name
                shutil.copy(out_path, final_out)
                return FileResponse(final_out, filename=out_path.name, media_type="application/pdf")
            else:
                raise HTTPException(status_code=500, detail=res.error_message)
    except Exception as e:
        logger.error(f"PDF conversion failure: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# SPREADSHEET ENGINE ENDPOINTS
# ==========================================

@router.post("/excel/preview")
async def preview_spreadsheet(file: UploadFile = File(...)):
    """Returns a JSON representation of the first few rows of a spreadsheet."""
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir) / file.filename
            with open(tmp_path, "wb") as out:
                shutil.copyfileobj(file.file, out)
                
            preview = SpreadsheetEngine.read_preview(tmp_path)
            return preview
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/excel/stats")
async def stats_spreadsheet(file: UploadFile = File(...)):
    """Returns statistics for numerical columns in a spreadsheet."""
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir) / file.filename
            with open(tmp_path, "wb") as out:
                shutil.copyfileobj(file.file, out)
                
            stats = SpreadsheetEngine.generate_statistics(tmp_path)
            if stats:
                return stats.model_dump()
            raise HTTPException(status_code=500, detail="Could not generate stats")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/excel/merge")
async def merge_spreadsheets(files: list[UploadFile] = File(...), target_format: str = Form('csv')):
    """Merges multiple spreadsheets."""
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            input_paths = []
            for i, f in enumerate(files):
                tmp_path = Path(tmpdir) / f"{i}_{f.filename}"
                with open(tmp_path, "wb") as out:
                    shutil.copyfileobj(f.file, out)
                input_paths.append(tmp_path)
                
            ext = 'csv' if target_format.lower() == 'csv' else 'xlsx'
            out_path = Path(tmpdir) / f"merged.{ext}"
            res = SpreadsheetEngine.merge_spreadsheets(input_paths, out_path)
            
            if res.success:
                final_out = Path(tempfile.gettempdir()) / out_path.name
                shutil.copy(out_path, final_out)
                mt = "text/csv" if ext == "csv" else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                return FileResponse(final_out, filename=out_path.name, media_type=mt)
            else:
                raise HTTPException(status_code=500, detail=res.error_message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/excel/convert")
async def convert_spreadsheet(file: UploadFile = File(...), target_format: str = Form('csv')):
    """Converts a spreadsheet between CSV and XLSX."""
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir) / file.filename
            with open(tmp_path, "wb") as out:
                shutil.copyfileobj(file.file, out)
                
            ext = 'csv' if target_format.lower() == 'csv' else 'xlsx'
            out_path = Path(tmpdir) / f"{tmp_path.stem}_converted.{ext}"
            res = SpreadsheetEngine.convert_format(tmp_path, out_path)
            
            if res.success:
                final_out = Path(tempfile.gettempdir()) / out_path.name
                shutil.copy(out_path, final_out)
                mt = "text/csv" if ext == "csv" else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                return FileResponse(final_out, filename=out_path.name, media_type=mt)
            else:
                raise HTTPException(status_code=500, detail=res.error_message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
