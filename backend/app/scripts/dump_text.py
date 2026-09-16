import fitz
import sys

def dump_pages(pdf_path, start_page, end_page):
    try:
        doc = fitz.open(pdf_path)
        for i in range(start_page, end_page + 1):
            if i < len(doc):
                print(f"--- PAGE {i} ---")
                text = doc.load_page(i).get_text("text")
                print(text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    dump_pages(sys.argv[1], int(sys.argv[2]), int(sys.argv[3]))
