import os
import glob
import json
import time
from traceback import format_exc
import docx
import google.generativeai as genai
from typing import List
import sys
import codecs
from dotenv import load_dotenv

load_dotenv()

# Use UTF-8 for prints
if hasattr(sys.stdout, 'detach'):
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())

API_KEY = os.environ.get("GEMINI_API_KEY")
genai.configure(api_key=API_KEY)

generation_config = genai.types.GenerationConfig(
    temperature=0.2,
    response_mime_type="application/json"
)
model = genai.GenerativeModel('gemini-flash-lite-latest', generation_config=generation_config)

def generate_with_retry(prompt, retries=10):
    for i in range(retries):
        try:
            print("Calling Gemini...")
            response = model.generate_content(prompt, request_options={"timeout": 600})
            if not response.text:
                raise Exception("Empty response text")
            return json.loads(response.text)
        except Exception as e:
            err_str = str(e)
            if "Deadline" in err_str or "504" in err_str or "503" in err_str:
                print(f"Timeout/Unavailable on try {i+1}. Retrying in 15 seconds...")
                time.sleep(15)
            elif "429" in err_str or "Quota exceeded" in err_str:
                print(f"Rate limited on try {i+1}. Sleeping for 65 seconds...")
                time.sleep(65)
            else:
                print(f"Error on try {i+1}: {e}")
                time.sleep(10)
    raise Exception("Max retries exceeded")

def process_word_doc(docx_path):
    print(f"\n--- Reading {docx_path} ---")

    doc = docx.Document(docx_path)
    full_text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])

    if not full_text:
        return []

    # Chunk the text carefully to avoid breaking a question in half if possible,
    # but the simplest way is character chunking with overlap
    chunk_size = 2000 # Increased slightly since word has no headers/footers to confuse things
    overlap = 200

    all_questions = []
    start = 0
    chunk_index = 1

    while start < len(full_text):
        end = min(start + chunk_size, len(full_text))
        chunk_text = full_text[start:end]

        prompt = """
        You are an expert Civil Engineering professor.
        Extract ALL the multiple choice questions from the provided text chunk.
        Be careful, questions might be cut off at the start or end of the chunk; ONLY process full complete questions.
        For EACH complete question:
        1. Extract the question number, question text, and all options (A, B, C, D).
        2. Provide a concise technical solution based on your knowledge.
        3. Make sure 'is_question_correct' is true/false based on technical soundness (are options sensible? Does it have a valid answer?).
        4. Provide 'correct_option' (a/b/c/d/none) based on your expert knowledge.

        Output MUST be a valid JSON array of objects with the following schema:
        [
            {
                "question_number": int,
                "question_text": "string",
                "options": {"a": "string", "b": "string", "c": "string", "d": "string"},
                "is_question_correct": boolean,
                "solution": "detailed string",
                "correct_option": "a/b/c/d/none"
            }
        ]

        Return ONLY the JSON array. Output `[]` if there are no full questions.

        TEXT CHUNK:
        """ + chunk_text

        print(f"Sending chunk {chunk_index} to Gemini ({len(chunk_text)} chars)...")
        try:
            data = generate_with_retry(prompt)
            if data:
                all_questions.extend(data)
                print(f"Extracted {len(data)} questions from chunk {chunk_index}.")
        except Exception as e:
            print("Failed to process chunk", chunk_index)
            print(e)

        start += chunk_size - overlap
        chunk_index += 1

    # Deduplicate questions by question_number
    unique_questions = {}
    for q in all_questions:
        q_num = q.get("question_number")
        if q_num and q_num not in unique_questions:
            unique_questions[q_num] = q

    final_list = list(unique_questions.values())
    final_list.sort(key=lambda x: x["question_number"] if isinstance(x.get("question_number"), int) else 0)
    return final_list

if __name__ == "__main__":
    word_dir = "../pdfdata/ese word"
    output_dir = "../pdfdata/ese_word_json"

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    run_count = 0
    # Process .doc and .docx files
    word_files = glob.glob(os.path.join(word_dir, "*.doc*"))
    print(f"Found {len(word_files)} Word files.")

    for word_file in word_files:
        if word_file.startswith("~"): continue # Skip temp word files

        base_name = os.path.basename(word_file).split('.')[0]
        out_file = os.path.join(output_dir, f"{base_name}.json")
        if os.path.exists(out_file):
            print(f"Skipping {base_name}, already processed.")
            continue

        try:
            data = process_word_doc(word_file)
            with open(out_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
            print(f"Successfully saved {out_file} with {len(data)} questions.")

            # Simple sleep to spread out the rate limiting slightly
            time.sleep(2)
            run_count += 1

            # Let's run just 1 file at first to verify it works
            if False:
                print("Stopping after 1 file for safety. Remove run_count check to run all.")
                break

        except Exception as e:
            print(f"Error processing {word_file}: {e}")
