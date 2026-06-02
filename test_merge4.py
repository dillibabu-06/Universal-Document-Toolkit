import fitz
from PIL import Image

Image.new("RGB", (100, 100), "red").save("test.png")

doc1 = fitz.Document()
doc2 = fitz.open("test.png")
try:
    doc1.insert_pdf(doc2)
except Exception as e:
    print(f"Exception: {e}")
