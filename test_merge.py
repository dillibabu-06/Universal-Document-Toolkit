import fitz
from pathlib import Path

doc1 = fitz.open() # empty doc
print("Doc1 created")
doc2 = fitz.open()
print("Doc2 created")
try:
    doc1.insert_pdf(doc2)
    print("insert_pdf success")
except Exception as e:
    print(f"Exception: {e}")
