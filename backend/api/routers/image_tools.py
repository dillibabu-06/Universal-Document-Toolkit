from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from pathlib import Path
import tempfile
import shutil
from PIL import Image
from loguru import logger

router = APIRouter(prefix="/api/image", tags=["image_tools"])

@router.post("/convert")
async def convert_image(
    file: UploadFile = File(...),
    target_format: str = Form(...),
    quality: int = Form(85),
    resize: str = Form(None)
):
    """Converts an uploaded image to a target format (e.g., png, jpeg, webp)."""
    try:
        # Validate format
        fmt = target_format.lower()
        if fmt not in ["png", "jpeg", "jpg", "webp", "bmp", "gif", "tiff"]:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {fmt}")
        
        # PIL uses 'jpeg' not 'jpg'
        pil_format = "JPEG" if fmt == "jpg" else fmt.upper()

        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir) / file.filename
            with open(tmp_path, "wb") as out:
                shutil.copyfileobj(file.file, out)
            
            # Open with Pillow
            try:
                img = Image.open(tmp_path)
                
                # Convert RGBA to RGB for JPEG to avoid errors
                if pil_format in ["JPEG", "BMP"] and img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                    
                # Handle resize if requested
                if resize and resize != "original":
                    try:
                        width, height = map(int, resize.split("x"))
                        img = img.resize((width, height), Image.Resampling.LANCZOS)
                    except ValueError:
                        pass # Ignore invalid resize formats
                    
                # Setup output path
                base_name = Path(file.filename).stem
                out_filename = f"converted_{base_name}.{fmt}"
                out_path = Path(tmpdir) / out_filename
                
                # Save with quality if applicable
                if pil_format in ["JPEG", "WEBP"]:
                    img.save(out_path, format=pil_format, quality=quality)
                else:
                    img.save(out_path, format=pil_format)
                
                # Copy to safe temp dir for serving
                final_out = Path(tempfile.gettempdir()) / out_filename
                shutil.copy(out_path, final_out)
                
                return FileResponse(
                    final_out, 
                    filename=out_filename, 
                    media_type=f"image/{fmt}" if fmt != "jpg" else "image/jpeg"
                )
            except Exception as e:
                logger.error(f"Pillow processing failed: {e}")
                raise HTTPException(status_code=400, detail=f"Invalid image file: {e}")
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image conversion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
