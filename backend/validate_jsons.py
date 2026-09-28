import os
import glob
import json

json_folder = "../pdfdata/ese_word_json"
json_files = glob.glob(os.path.join(json_folder, "*.json"))

invalid_files = []
total_questions = 0
for fp in json_files:
    try:
        with open(fp, "r", encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, list):
                print(f"{os.path.basename(fp)} does not contain a list.")
                invalid_files.append(fp)
                continue
            
            valid_qs = [
                q for q in data 
                if q.get("is_question_correct") == True 
                and str(q.get("correct_option")).lower() != "none"
                and q.get("question_text", "").strip() != ""
            ]
            total_questions += len(valid_qs)
            print(f"{os.path.basename(fp)}: {len(valid_qs)} valid questions out of {len(data)}")
    except Exception as e:
        print(f"Error reading {os.path.basename(fp)}: {e}")
        invalid_files.append(fp)

print(f"\nTotal json files: {len(json_files)}")
print(f"Total valid questions: {total_questions}")
