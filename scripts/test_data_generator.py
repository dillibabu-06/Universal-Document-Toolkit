import os
import random
import string
from io import BytesIO

# Generate synthetic files for stress testing the FTS5 database and recursive crawlers.

BASE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "test-data")

def create_dirs():
    if not os.path.exists(BASE_DIR):
        os.makedirs(BASE_DIR)
        
    for category in ["invoices", "resumes", "spreadsheets", "deep_nested"]:
        path = os.path.join(BASE_DIR, category)
        if not os.path.exists(path):
            os.makedirs(path)

def create_fake_image(path):
    # Just a small text file masquerading as a png/jpg to satisfy basic indexing. 
    # Real image generation would be slow for 1000 items, and we just want to stress test SQLite row limits and walking.
    with open(path, "w") as f:
        f.write("Fake image data - Invoice amount: $1,250.00 Vendor: Acme Corp")

def create_fake_pdf(path):
    with open(path, "w") as f:
        f.write("%PDF-1.4\n%Fake PDF content for resume - Python Developer")

def create_fake_excel(path):
    with open(path, "w") as f:
        f.write("PK\x03\x04 fake excel data")

def generate_data():
    create_dirs()
    
    print("Generating 1000 invoices (images)...")
    for i in range(1000):
        create_fake_image(os.path.join(BASE_DIR, "invoices", f"invoice_{i:04d}.png"))
        
    print("Generating 500 resumes (PDFs)...")
    for i in range(500):
        create_fake_pdf(os.path.join(BASE_DIR, "resumes", f"resume_candidate_{i:04d}.pdf"))
        
    print("Generating 500 spreadsheets (XLSX)...")
    for i in range(500):
        create_fake_excel(os.path.join(BASE_DIR, "spreadsheets", f"financial_report_{i:04d}.xlsx"))
        
    print("Generating deep nested directory structure...")
    curr_path = os.path.join(BASE_DIR, "deep_nested")
    for i in range(100):
        curr_path = os.path.join(curr_path, f"layer_{i}")
        os.makedirs(curr_path, exist_ok=True)
        # Put a couple files in each layer
        create_fake_pdf(os.path.join(curr_path, f"hidden_doc_{i}.pdf"))

    print("Test data generation complete. Total files: ~2100")

if __name__ == "__main__":
    generate_data()
