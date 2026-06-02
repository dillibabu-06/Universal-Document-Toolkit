import fitz
import tempfile
doc_source = fitz.open()
doc_source.new_page()
with tempfile.NamedTemporaryFile(suffix=".pdf") as tmp:
    doc_source.save(tmp.name)
    doc_source.close()
    
    doc_target = fitz.Document() # no new_page()
    doc_read = fitz.open(tmp.name)
    try:
        doc_target.insert_pdf(doc_read)
        print("Success without new_page!")
    except Exception as e:
        print(f"Exception without new_page: {e}")
