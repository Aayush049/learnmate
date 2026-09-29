import sys
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.database import SessionLocal
from app.models.subject import Subject
from app.models.chapter import Chapter
from app.models.topic import Topic
from app.models.question import Question

def generate():
    db = SessionLocal()
    try:
        subjects = db.query(Subject).order_by(Subject.id).all()

        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        out_file_txt = os.path.join(root_dir, "topics_list.txt")
        out_file_csv = os.path.join(root_dir, "topics_list.csv")

        # 1. Generate text file
        with open(out_file_txt, "w", encoding="utf-8") as f:
            f.write("=" * 140 + "\n")
            f.write("                           LEARNMATE - COMPLETE TOPIC LIST & SYLLABUS MAPPING\n")
            f.write("=" * 140 + "\n\n")
            f.write(f"{'Topic ID':<10} | {'Topic Name':<55} | {'Questions':<10} | {'Chapter (ID)':<35} | {'Subject (ID)':<30}\n")
            f.write("-" * 140 + "\n")

            total_topics = 0
            total_questions = 0

            for s in subjects:
                if not s.chapters:
                    continue
                for c in s.chapters:
                    for t in c.topics:
                        q_count = db.query(Question).filter(Question.topic_id == t.id).count()
                        f.write(f"{t.id:<10} | {t.name:<55} | {q_count:<10} | {f'{c.name} ({c.id})':<35} | {f'{s.name} ({s.id})':<30}\n")
                        total_topics += 1
                        total_questions += q_count

            f.write("-" * 140 + "\n")
            f.write(f"Total Topics: {total_topics} | Total Questions Mapped: {total_questions}\n")
            f.write("=" * 140 + "\n")

        # 2. Generate CSV file for easy spreadsheet / Excel import
        import csv
        with open(out_file_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["Topic ID", "Topic Name", "Chapter ID", "Chapter Name", "Subject ID", "Subject Name", "Question Count"])
            for s in subjects:
                if not s.chapters:
                    continue
                for c in s.chapters:
                    for t in c.topics:
                        q_count = db.query(Question).filter(Question.topic_id == t.id).count()
                        writer.writerow([t.id, t.name, c.id, c.name, s.id, s.name, q_count])

        print(f"Generated text file: {out_file_txt}")
        print(f"Generated CSV file: {out_file_csv}")
        print(f"Total topics written: {total_topics}")
    finally:
        db.close()

if __name__ == "__main__":
    generate()
