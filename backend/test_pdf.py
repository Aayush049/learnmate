import pdfplumber
import sys

pdf_path = sys.argv[1]

try:
    with pdfplumber.open(pdf_path) as pdf:
        text = ""
        for i, page in enumerate(pdf.pages):
            text += f"--- Page {i+1} ---\n"
            text += page.extract_text() + "\n"
        print(text[:2000]) # Print first 2000 chars
except Exception as e:
    print("Error:", e)
