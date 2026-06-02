import fitz
from pathlib import Path

# Create a minimal valid PDF
doc_source = fitz.open()
doc_source.new_page()

# Save it to an in-memory buffer or temp file
import tempfile
with tempfile.NamedTemporaryFile(suffix=".pdf") as tmp:
    doc_source.save(tmp.name)
    doc_source.close()

    doc_target = fitz.open()
    doc_target.new_page()

    doc_read = fitz.open(tmp.name)

    try:
        doc_target.insert_pdf(doc_read)
        print("Success!")
    except Exception as e:
        print(f"Exception: {e}")
