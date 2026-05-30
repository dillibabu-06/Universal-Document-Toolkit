class PDFProcessingError(Exception):
    """Base exception for PDF processing failures."""
    pass

class MalformedPDFError(PDFProcessingError):
    """Raised when a PDF is corrupted or cannot be opened safely."""
    pass

class PDFEncryptionError(PDFProcessingError):
    """Raised when dealing with encryption or permission issues in a PDF."""
    pass
