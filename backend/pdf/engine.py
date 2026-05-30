import fitz  # PyMuPDF
from pathlib import Path
from loguru import logger
from PIL import Image

from backend.models.pdf_models import PDFMetadata, WatermarkOptions, PDFOperationResult
from backend.pdf.exceptions import MalformedPDFError, PDFEncryptionError, PDFProcessingError


class PDFEngine:
    """Core engine for all PDF operations leveraging PyMuPDF."""

    @staticmethod
    def _open_doc(path: Path) -> fitz.Document:
        """Safely opens a PDF document and handles common errors."""
        if not path.exists():
            raise FileNotFoundError(f"PDF not found: {path}")
        try:
            doc = fitz.open(path)
            if doc.needs_pass:
                raise PDFEncryptionError(f"PDF {path} is encrypted and requires a password.")
            return doc
        except fitz.FileDataError as e:
            raise MalformedPDFError(f"Corrupted or invalid PDF {path}: {e}")
        except PDFEncryptionError:
            raise
        except Exception as e:
            raise PDFProcessingError(f"Failed to open {path}: {e}")

    @classmethod
    def merge(cls, input_paths: list[Path], output_path: Path) -> PDFOperationResult:
        """Merges multiple PDFs into a single file."""
        try:
            result = fitz.Document()
            for p in input_paths:
                with cls._open_doc(p) as doc:
                    result.insert_pdf(doc)
            result.save(output_path, garbage=3, deflate=True)
            page_count = result.page_count
            result.close()
            return PDFOperationResult(success=True, file_path=output_path, page_count=page_count)
        except Exception as e:
            logger.error(f"Merge failed: {e}")
            return PDFOperationResult(success=False, error_message=str(e))

    @classmethod
    def split(cls, input_path: Path, output_dir: Path, pages_per_split: int = 1) -> list[PDFOperationResult]:
        """Splits a PDF into multiple smaller PDFs."""
        results = []
        try:
            output_dir.mkdir(parents=True, exist_ok=True)
            with cls._open_doc(input_path) as doc:
                total_pages = doc.page_count
                for start_page in range(0, total_pages, pages_per_split):
                    end_page = min(start_page + pages_per_split - 1, total_pages - 1)
                    
                    split_doc = fitz.Document()
                    split_doc.insert_pdf(doc, from_page=start_page, to_page=end_page)
                    
                    out_name = output_dir / f"{input_path.stem}_part_{start_page // pages_per_split + 1}.pdf"
                    split_doc.save(out_name, garbage=3, deflate=True)
                    results.append(PDFOperationResult(success=True, file_path=out_name, page_count=split_doc.page_count))
                    split_doc.close()
            return results
        except Exception as e:
            logger.error(f"Split failed: {e}")
            return [PDFOperationResult(success=False, error_message=str(e))]

    @classmethod
    def extract_pages(cls, input_path: Path, output_path: Path, pages: list[int]) -> PDFOperationResult:
        """Extracts specific pages (0-indexed) into a new PDF."""
        try:
            with cls._open_doc(input_path) as doc:
                result = fitz.Document()
                for p in pages:
                    if 0 <= p < doc.page_count:
                        result.insert_pdf(doc, from_page=p, to_page=p)
                result.save(output_path, garbage=3, deflate=True)
                page_count = result.page_count
                result.close()
            return PDFOperationResult(success=True, file_path=output_path, page_count=page_count)
        except Exception as e:
            logger.error(f"Extract pages failed: {e}")
            return PDFOperationResult(success=False, error_message=str(e))

    @classmethod
    def rotate_pages(cls, input_path: Path, output_path: Path, rotation_angle: int, pages: list[int] | None = None) -> PDFOperationResult:
        """Rotates specific pages by a multiple of 90 degrees."""
        if rotation_angle % 90 != 0:
            return PDFOperationResult(success=False, error_message="Rotation angle must be a multiple of 90")
            
        try:
            with cls._open_doc(input_path) as doc:
                target_pages = pages if pages is not None else range(doc.page_count)
                for p in target_pages:
                    if 0 <= p < doc.page_count:
                        page = doc[p]
                        page.set_rotation((page.rotation + rotation_angle) % 360)
                
                doc.save(output_path, garbage=3, deflate=True)
                page_count = doc.page_count
            return PDFOperationResult(success=True, file_path=output_path, page_count=page_count)
        except Exception as e:
            logger.error(f"Rotate pages failed: {e}")
            return PDFOperationResult(success=False, error_message=str(e))

    @classmethod
    def delete_pages(cls, input_path: Path, output_path: Path, pages: list[int]) -> PDFOperationResult:
        """Deletes specific pages (0-indexed) from the PDF."""
        try:
            with cls._open_doc(input_path) as doc:
                # delete_pages works in place
                doc.delete_pages(pages)
                doc.save(output_path, garbage=3, deflate=True)
                page_count = doc.page_count
            return PDFOperationResult(success=True, file_path=output_path, page_count=page_count)
        except Exception as e:
            logger.error(f"Delete pages failed: {e}")
            return PDFOperationResult(success=False, error_message=str(e))

    @classmethod
    def compress(cls, input_path: Path, output_path: Path) -> PDFOperationResult:
        """Compresses the PDF by applying max garbage collection and deflation."""
        try:
            with cls._open_doc(input_path) as doc:
                doc.save(output_path, garbage=4, deflate=True)
                page_count = doc.page_count
            return PDFOperationResult(success=True, file_path=output_path, page_count=page_count)
        except Exception as e:
            logger.error(f"Compression failed: {e}")
            return PDFOperationResult(success=False, error_message=str(e))

    @classmethod
    def edit_metadata(cls, input_path: Path, output_path: Path, metadata: PDFMetadata) -> PDFOperationResult:
        """Edits the metadata of the PDF."""
        try:
            with cls._open_doc(input_path) as doc:
                meta = doc.metadata
                for k, v in metadata.model_dump(exclude_unset=True).items():
                    if v is not None:
                        meta[k] = v
                doc.set_metadata(meta)
                doc.save(output_path, garbage=3, deflate=True)
                page_count = doc.page_count
            return PDFOperationResult(success=True, file_path=output_path, page_count=page_count)
        except Exception as e:
            logger.error(f"Metadata edit failed: {e}")
            return PDFOperationResult(success=False, error_message=str(e))

    @classmethod
    def add_watermark(cls, input_path: Path, output_path: Path, options: WatermarkOptions) -> PDFOperationResult:
        """Adds a text watermark to every page in the PDF."""
        try:
            with cls._open_doc(input_path) as doc:
                for page_idx in range(doc.page_count):
                    page = doc[page_idx]
                    # Calculate center (start a bit to the left so text fits)
                    rect = page.rect
                    point = fitz.Point(rect.width / 4, rect.height / 2)
                    
                    # We use morphing to rotate the text around its center
                    # Note: PyMuPDF 1.24+ insert_text handles rotation around insertion point
                    rotate_int = int(round(options.angle / 90.0)) * 90
                    page.insert_text(
                        point,
                        options.text,
                        fontsize=options.fontsize,
                        color=options.color,
                        fill_opacity=options.opacity,
                        rotate=rotate_int,
                        overlay=True
                    )
                doc.save(output_path, garbage=3, deflate=True)
                page_count = doc.page_count
            return PDFOperationResult(success=True, file_path=output_path, page_count=page_count)
        except Exception as e:
            logger.error(f"Watermark failed: {e}")
            return PDFOperationResult(success=False, error_message=str(e))
            
    @classmethod
    def extract_text(cls, input_path: Path, pages: list[int] | None = None) -> str:
        """Extracts text from the PDF."""
        try:
            text_blocks = []
            with cls._open_doc(input_path) as doc:
                target_pages = pages if pages is not None else range(doc.page_count)
                for p in target_pages:
                    if 0 <= p < doc.page_count:
                        text_blocks.append(doc[p].get_text())
            return "\n".join(text_blocks)
        except PDFProcessingError:
            raise
        except Exception as e:
            logger.error(f"Text extraction failed: {e}")
            raise PDFProcessingError(f"Text extraction failed: {e}")

    @classmethod
    def encrypt(cls, input_path: Path, output_path: Path, password: str) -> PDFOperationResult:
        """Encrypts the PDF with a password."""
        try:
            with cls._open_doc(input_path) as doc:
                doc.save(
                    output_path,
                    encryption=fitz.PDF_ENCRYPT_AES_256,
                    owner_pw=password,
                    user_pw=password,
                    garbage=3, 
                    deflate=True
                )
                page_count = doc.page_count
            return PDFOperationResult(success=True, file_path=output_path, page_count=page_count)
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            return PDFOperationResult(success=False, error_message=str(e))

    @classmethod
    def reorder_pages(cls, input_path: Path, output_path: Path, new_order: list[int]) -> PDFOperationResult:
        """Reorders pages in a PDF according to the provided 0-indexed list."""
        try:
            with cls._open_doc(input_path) as doc:
                # To reorder, we can select pages
                doc.select(new_order)
                doc.save(output_path, garbage=3, deflate=True)
                page_count = doc.page_count
            return PDFOperationResult(success=True, file_path=output_path, page_count=page_count)
        except Exception as e:
            logger.error(f"Reorder pages failed: {e}")
            return PDFOperationResult(success=False, error_message=str(e))

    @classmethod
    def pdf_to_images(cls, input_path: Path, output_dir: Path, dpi: int = 150) -> list[PDFOperationResult]:
        """Converts each page of a PDF into a PNG image."""
        results = []
        try:
            output_dir.mkdir(parents=True, exist_ok=True)
            with cls._open_doc(input_path) as doc:
                for page_idx in range(doc.page_count):
                    page = doc[page_idx]
                    pix = page.get_pixmap(dpi=dpi)
                    img_path = output_dir / f"{input_path.stem}_page_{page_idx + 1}.png"
                    pix.save(img_path)
                    results.append(PDFOperationResult(success=True, file_path=img_path, page_count=1))
            return results
        except Exception as e:
            logger.error(f"PDF to images failed: {e}")
            return [PDFOperationResult(success=False, error_message=str(e))]

    @classmethod
    def images_to_pdf(cls, input_paths: list[Path], output_path: Path) -> PDFOperationResult:
        """Converts a list of images into a single PDF."""
        try:
            doc = fitz.Document()
            for img_path in input_paths:
                if not img_path.exists():
                    continue
                # Open image using fitz or PIL
                img = fitz.open(img_path)
                rect = img[0].rect
                pdfbytes = img.convert_to_pdf()
                img.close()
                
                img_pdf = fitz.open("pdf", pdfbytes)
                doc.insert_pdf(img_pdf)
                img_pdf.close()
                
            doc.save(output_path, garbage=3, deflate=True)
            page_count = doc.page_count
            doc.close()
            return PDFOperationResult(success=True, file_path=output_path, page_count=page_count)
        except Exception as e:
            logger.error(f"Images to PDF failed: {e}")
            return PDFOperationResult(success=False, error_message=str(e))
