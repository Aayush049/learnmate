"""
review_and_fix_ocr.py
─────────────────────
Iterates every JSON in extracted_data/topics_classified/**/*.json,
finds questions flagged with "ocr-text-needs-review", sends them in
batches to Gemini Flash for cleaning, and writes the fixed JSON back
in-place.

What Gemini is asked to fix per question:
  1. Strip exam/year/shift tags appended to option text (e.g. "BPSC AE 2012 Paper-V")
  2. Populate the `exam`, `year`, `shift` fields from those stripped tags if possible
  3. Fix OCR character errors in question_text and options
     (e.g. "densc" → "dense", "anglc" → "angle", "Ifa" → "If a")
  4. Strip answer explanations mixed into option D
  5. If correct_answer is null but answer is embedded in option text, extract it
  6. Set validation_status = "ok", clear review_flags = [], review_required = false

Run from the backend/ directory:
  python review_and_fix_ocr.py
"""

import json
import os
import sys
import glob
import re
import time

import google.generativeai as genai

# ── Config ────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "extracted_data", "topics_classified"))
BATCH_SIZE = 15          # questions per Gemini call
SLEEP_BETWEEN_CALLS = 2  # seconds, to stay within rate limits

# Load Gemini key from env or backend .env
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.startswith("GEMINI_API_KEY="):
                    GEMINI_API_KEY = line.strip().split("=", 1)[1].strip()
                    break

if not GEMINI_API_KEY:
    sys.exit("ERROR: GEMINI_API_KEY not found. Set it in the environment or backend/.env")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-3.6-flash")

# ── Prompt ────────────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are a question-bank editor for Indian civil engineering competitive exams (GATE, ESE, SSC JE, State AE/JE).

You will receive a JSON array of MCQ questions. Each question may have OCR errors. Your job is to return a corrected JSON array.

For EACH question, apply these fixes:
1. OPTION CLEANUP: Exam/year tags are often appended to the last option text (e.g. "dilatancy BPSC AE 2012 Paper-V" or "instrumental DMRC AM 2020"). Strip these tags from the option text so the option contains only the answer choice.
2. EXAM FIELD: If you stripped an exam tag, put the exam name into the "exam" field (e.g. "BPSC AE 2012"). If a year number is clearly part of the tag, set "year" (integer). Leave null if uncertain.
3. OCR ERRORS: Fix obvious OCR character substitutions in question_text and all option texts:
   - "densc" → "dense", "anglc" → "angle", "Ifa " → "If a ", "is " → "in " (only when clearly wrong in context), "ot" → "of" (mid-word), etc.
   - Fix broken/run-together words caused by OCR (e.g. "Ifa" → "If a", "ofthe" → "of the")
   - Fix obvious garbled math/symbol text where you can recognise the formula
4. EXPLANATION STRIP: Sometimes an answer explanation is appended to option D after the exam tag (e.g. "... OPSC 2019 Ans, (b): The explanation text..."). Strip the explanation entirely; it does not belong in the option.
5. CORRECT ANSWER: If "correct_answer" is null but an "Ans. (x)" or "Ans, (x)" pattern appears anywhere in the option text, extract the letter and set "correct_answer". Remove the ans-marker from the option text.
6. MARK AS CLEAN: Set "validation_status" to "ok", "review_flags" to [] and "review_required" to false for every question you process.
7. SUBJECT/TOPIC INTEGRITY: Do NOT change subject or topic fields.
8. PRESERVE STRUCTURE: Return a valid JSON array with exactly the same number of elements in the same order. Do not add or remove questions. Do not add any commentary — return ONLY the JSON array.
"""

def fix_batch(questions: list) -> list:
    """Send a batch to Gemini and return corrected questions."""
    payload = json.dumps(questions, ensure_ascii=False, indent=2)
    prompt = SYSTEM_PROMPT + "\n\nHere is the batch to fix:\n\n" + payload + "\n\nReturn ONLY the corrected JSON array."

    for attempt in range(3):
        try:
            response = model.generate_content(prompt)
            raw = response.text.strip()
            # Strip markdown fences if present
            if raw.startswith("```"):
                raw = re.sub(r"^```[a-z]*\n?", "", raw)
                raw = re.sub(r"\n?```$", "", raw)
            return json.loads(raw)
        except json.JSONDecodeError as e:
            print(f"    JSON parse error (attempt {attempt+1}): {e}")
            time.sleep(3)
        except Exception as e:
            print(f"    Gemini error (attempt {attempt+1}): {e}")
            time.sleep(5)
    print("    Failed after 3 attempts — returning original questions unchanged.")
    return questions


def process_file(filepath: str):
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Separate flagged vs clean questions, preserving their original indices
    flagged_indices = [
        i for i, q in enumerate(data)
        if isinstance(q.get("review_flags"), list) and "ocr-text-needs-review" in q["review_flags"]
    ]

    if not flagged_indices:
        return 0

    print(f"  {os.path.relpath(filepath, BASE_DIR)}: {len(flagged_indices)} flagged questions")

    fixed_count = 0
    # Process in batches
    for batch_start in range(0, len(flagged_indices), BATCH_SIZE):
        batch_idx = flagged_indices[batch_start:batch_start + BATCH_SIZE]
        batch_qs = [data[i] for i in batch_idx]

        fixed_qs = fix_batch(batch_qs)

        # Verify Gemini returned the right count
        if len(fixed_qs) != len(batch_qs):
            print(f"    WARNING: Gemini returned {len(fixed_qs)} items for {len(batch_qs)} — skipping batch")
            time.sleep(SLEEP_BETWEEN_CALLS)
            continue

        for orig_idx, fixed_q in zip(batch_idx, fixed_qs):
            data[orig_idx] = fixed_q
            fixed_count += 1

        time.sleep(SLEEP_BETWEEN_CALLS)

    # Write back in-place
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

    return fixed_count


def main():
    json_files = sorted(glob.glob(os.path.join(BASE_DIR, "**", "*.json"), recursive=True))
    # Skip the progress tracking file
    json_files = [f for f in json_files if "mapping_progress" not in f]

    print(f"Found {len(json_files)} topic JSON files under {BASE_DIR}\n")

    total_fixed = 0
    for filepath in json_files:
        try:
            n = process_file(filepath)
            total_fixed += n
        except Exception as e:
            print(f"  ERROR processing {filepath}: {e}")

    print(f"\n✓ Done. Fixed {total_fixed} questions across {len(json_files)} files.")


if __name__ == "__main__":
    main()
