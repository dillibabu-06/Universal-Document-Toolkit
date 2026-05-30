from pathlib import Path
import docx
from docxtpl import DocxTemplate
from loguru import logger
import subprocess
import os

from backend.models.office_models import WordMetadata, OfficeOperationResult

class WordEngine:
    """Core engine for processing Word (.docx) documents."""

    @staticmethod
    def extract_text(input_path: Path) -> str:
        """Extracts all text from a DOCX file."""
        try:
            doc = docx.Document(input_path)
            full_text = []
            for para in doc.paragraphs:
                full_text.append(para.text)
            return '\n'.join(full_text)
        except Exception as e:
            logger.error(f"Failed to extract text from {input_path}: {e}")
            return ""

    @staticmethod
    def extract_metadata(input_path: Path) -> WordMetadata | None:
        """Extracts core properties (metadata) from a DOCX file."""
        try:
            doc = docx.Document(input_path)
            prop = doc.core_properties
            return WordMetadata(
                author=prop.author,
                created=prop.created,
                modified=prop.modified,
                title=prop.title,
                subject=prop.subject,
                revision=prop.revision
            )
        except Exception as e:
            logger.error(f"Failed to extract metadata from {input_path}: {e}")
            return None

    @staticmethod
    def replace_template(template_path: Path, output_path: Path, context: dict) -> OfficeOperationResult:
        """Replaces {{ variables }} in a DOCX template using docxtpl."""
        try:
            doc = DocxTemplate(template_path)
            doc.render(context)
            doc.save(output_path)
            return OfficeOperationResult(success=True, file_path=output_path)
        except Exception as e:
            logger.error(f"Failed to replace template {template_path}: {e}")
            return OfficeOperationResult(success=False, error_message=str(e))

    @staticmethod
    def convert_to_pdf(input_path: Path, output_path: Path) -> OfficeOperationResult:
        """
        Attempts to convert a DOCX to PDF using LibreOffice headless mode.
        Requires LibreOffice to be installed on the host machine.
        """
        try:
            # Common paths for LibreOffice
            lo_paths = [
                "libreoffice", # Linux / Windows in PATH
                "soffice", 
                "/Applications/LibreOffice.app/Contents/MacOS/soffice", # macOS
            ]
            
            lo_bin = None
            for p in lo_paths:
                import shutil
                if shutil.which(p) or os.path.exists(p):
                    lo_bin = p if shutil.which(p) else p
                    break
                    
            if not lo_bin:
                return OfficeOperationResult(
                    success=False, 
                    error_message="LibreOffice not found on the system. Cannot convert DOCX to PDF locally."
                )

            # Note: LibreOffice always outputs to a directory with the same filename.pdf
            outdir = output_path.parent
            
            cmd = [
                lo_bin,
                "--headless",
                "--convert-to",
                "pdf",
                "--outdir",
                str(outdir),
                str(input_path)
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                expected_output = outdir / f"{input_path.stem}.pdf"
                if expected_output.exists() and expected_output != output_path:
                    # Rename to the specifically requested output path
                    expected_output.rename(output_path)
                return OfficeOperationResult(success=True, file_path=output_path)
            else:
                logger.error(f"LibreOffice conversion failed: {result.stderr}")
                return OfficeOperationResult(success=False, error_message=result.stderr)
                
        except Exception as e:
            logger.error(f"Failed to convert {input_path} to PDF: {e}")
            return OfficeOperationResult(success=False, error_message=str(e))
