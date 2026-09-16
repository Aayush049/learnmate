import sys
import fitz

def extract_text(pdf_path, page_num):
    doc = fitz.open(pdf_path)
    page = doc.load_page(page_num)
    text = page.get_text("text")
    print(text)

if __name__ == "__main__":
    extract_text(sys.argv[1], int(sys.argv[2]))
