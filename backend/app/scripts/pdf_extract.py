import os
import sys
import json
import asyncio
import traceback
from pathlib import Path
from dotenv import load_dotenv

try:
    import pymupdf as fitz  # PyMuPDF
    import google.generativeai as genai
except ImportError:
    print("Missing requirements! Please run:")
    print("! source backend/venv/Scripts/activate && pip install pymupdf google-generativeai")
    sys.exit(1)

# Ensure the backend src is in path to import models if needed
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.append(backend_dir)

# Load .env from the backend directory
env_path = os.path.join(backend_dir, ".env")
load_dotenv(env_path)

# Setup Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print(f"CRITICAL: GEMINI_API_KEY is not set in {env_path}")
    sys.exit(1)

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash-latest')

PROMPT = """
You are an expert engineer and educational content parser.
I will give you an image of an Engineering Question Paper page.
Extract all multiple-choice questions visible on this page.

Output purely a JSON array of objects with this exact structure:
[
  {
    "question_text": "Text of the question",
    "subject": "The core engineering subject (e.g., Fluid Mechanics, Thermodynamics, Soil Mechanics)",
    "topic": "The specific chapter or sub-topic (e.g., Buoyancy, Shear Strength)",
    "options": [
      {"label": "A", "text": "First option"},
      {"label": "B", "text": "Second option"},
      {"label": "C", "text": "Third option"},
      {"label": "D", "text": "Fourth option"}
    ],
    "correct_label": "A", // If it is visibly marked or indicated in the paper, otherwise null
    "explanation": "", // Any answer explanation provided, otherwise null
    "year": null,      // Extract if year metadata is present
    "marks": 1         // Default 1, extract if visible
  }
]
Do NOT return backticks or markdown, ONLY valid JSON. If there are no questions on the page, return [].
"""

async def extract_questions_from_page(image_path: str):
    try:
        sample_file = genai.upload_file(path=image_path)
        response = model.generate_content([sample_file, PROMPT])
        
        # Cleanup uploaded file immediately
        genai.delete_file(sample_file.name)
        
        text = response.text.strip()
        # Clean markdown if accidentally sent
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        
        data = json.loads(text.strip())
        return data
    except Exception as e:
        print(f"Error parsing {image_path}: {e}")
        return []

async def process_pdf(pdf_path: str, start_page: int, end_page: int, output_dir: str):
    print(f"Opening PDF: {pdf_path}")
    doc = fitz.open(pdf_path)
    
    # Store questions grouped by subject
    subjectwise_questions = {}
    
    # Ensure a local temp dir for images
    temp_dir = Path("temp_pdf_images")
    temp_dir.mkdir(exist_ok=True)
    
    out_path = Path(output_dir)
    out_path.mkdir(exist_ok=True, parents=True)
    
    # Restrict end_page to document bounds
    end_page = min(end_page, len(doc) - 1)
    
    total_parsed = 0

    for page_num in range(start_page, end_page + 1):
        print(f"Processing page {page_num}...")
        page = doc.load_page(page_num)
        
        # High resolution render
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        img_path = temp_dir / f"page_{page_num}.png"
        pix.save(str(img_path))
        
        questions = await extract_questions_from_page(str(img_path))
        print(f"Extracted {len(questions)} questions from page {page_num}")
        
        for q in questions:
            subject = q.get("subject", "Uncategorized").strip()
            # Normalize subject name for filenames
            safe_subject = "".join([c if c.isalnum() else "_" for c in subject])
            if safe_subject not in subjectwise_questions:
                subjectwise_questions[safe_subject] = []
            
            subjectwise_questions[safe_subject].append(q)
            total_parsed += 1
            
        # Clean up image
        if img_path.exists():
            img_path.unlink()
            
    doc.close()
    
    # Save output subject-wise
    for subject, q_list in subjectwise_questions.items():
        subject_file = out_path / f"{subject}.json"
        
        # If file exists, load and append
        if subject_file.exists():
            with open(subject_file, 'r', encoding='utf-8') as f:
                existing = json.load(f)
            q_list = existing + q_list
            
        with open(subject_file, 'w', encoding='utf-8') as f:
            json.dump(q_list, f, indent=2, ensure_ascii=False)
        print(f"Saved {len(q_list)} total questions to {subject_file}")
    
    print(f"\nDone! Processed {total_parsed} questions across {len(subjectwise_questions)} subjects.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Extract Questions from PDF pages subject-wise.")
    parser.add_argument("pdf_path", type=str, help="Path to the PDF file")
    parser.add_argument("--start", type=int, default=0, help="Starting page index (0-based)")
    parser.add_argument("--end", type=int, default=1, help="Ending page index (0-based)")
    parser.add_argument("--out-dir", type=str, default="extracted_data", help="Output directory for subject JSONs")
    
    args = parser.parse_args()
    
    asyncio.run(process_pdf(args.pdf_path, args.start, args.end, args.out_dir))
