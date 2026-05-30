import pytesseract
from PIL import Image
from pathlib import Path
from pdf2image import convert_from_path
from loguru import logger
import re

from backend.models.ocr_models import OCRResult

class OCREngine:
    """Core engine for Optical Character Recognition using Tesseract."""
    
    @staticmethod
    def _parse_confidence(data: dict) -> float:
        """Parses the tesseract data dict to calculate average confidence."""
        confidences = [int(conf) for conf in data.get('conf', []) if conf != '-1']
        if not confidences:
            return 0.0
        return sum(confidences) / len(confidences)

    @classmethod
    def ocr_image(cls, image_path: Path, languages: list[str] = ["eng"]) -> OCRResult:
        """Runs OCR on a single image file."""
        try:
            img = Image.open(image_path)
            lang_str = "+".join(languages)
            
            # Extract text
            text = pytesseract.image_to_string(img, lang=lang_str)
            
            # Extract data for confidence
            data = pytesseract.image_to_data(img, lang=lang_str, output_type=pytesseract.Output.DICT)
            confidence = cls._parse_confidence(data)
            
            return OCRResult(text=text, confidence=confidence, language=lang_str)
        except Exception as e:
            logger.error(f"OCR failed for image {image_path}: {e}")
            raise

    @classmethod
    def ocr_pdf(cls, pdf_path: Path, languages: list[str] = ["eng"]) -> OCRResult:
        """Runs OCR on a PDF by converting its pages to images first."""
        try:
            lang_str = "+".join(languages)
            logger.debug(f"Converting PDF to images: {pdf_path}")
            images = convert_from_path(pdf_path, dpi=200)
            
            full_text = []
            total_confidence = 0.0
            valid_pages = 0
            
            for i, img in enumerate(images):
                logger.debug(f"Running OCR on page {i+1}")
                text = pytesseract.image_to_string(img, lang=lang_str)
                full_text.append(text)
                
                data = pytesseract.image_to_data(img, lang=lang_str, output_type=pytesseract.Output.DICT)
                conf = cls._parse_confidence(data)
                if conf > 0:
                    total_confidence += conf
                    valid_pages += 1
            
            avg_confidence = (total_confidence / valid_pages) if valid_pages > 0 else 0.0
            
            return OCRResult(
                text="\n\n--- Page Break ---\n\n".join(full_text), 
                confidence=avg_confidence, 
                language=lang_str
            )
        except Exception as e:
            logger.error(f"OCR failed for PDF {pdf_path}: {e}")
            raise
            
    @classmethod
    def create_searchable_pdf(cls, input_path: Path, output_path: Path, languages: list[str] = ["eng"]) -> bool:
        """Creates a searchable PDF from an image or scanned PDF."""
        try:
            lang_str = "+".join(languages)
            
            if input_path.suffix.lower() == '.pdf':
                # Convert PDF to images first
                images = convert_from_path(input_path, dpi=200)
                if not images:
                    return False
                
                # We can generate a searchable PDF for the first image, and append the rest
                # However, for simplicity and robustness in this phase, we use Tesseract's PDF output
                pdf_bytes_list = []
                for img in images:
                    pdf_bytes = pytesseract.image_to_pdf_or_hocr(img, extension='pdf', lang=lang_str)
                    pdf_bytes_list.append(pdf_bytes)
                
                # We need to merge these PDF bytes. PyMuPDF is perfect for this.
                import fitz
                merged_doc = fitz.Document()
                for pdf_bytes in pdf_bytes_list:
                    doc = fitz.open("pdf", pdf_bytes)
                    merged_doc.insert_pdf(doc)
                    doc.close()
                    
                merged_doc.save(output_path, garbage=3, deflate=True)
                merged_doc.close()
                return True
                
            else:
                # Direct image to searchable PDF
                pdf_bytes = pytesseract.image_to_pdf_or_hocr(Image.open(input_path), extension='pdf', lang=lang_str)
                with open(output_path, "wb") as f:
                    f.write(pdf_bytes)
                return True
                
        except Exception as e:
            logger.error(f"Failed to create searchable PDF from {input_path}: {e}")
            return False
