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

def generate_grouped():
    db = SessionLocal()
    try:
        subjects = db.query(Subject).order_by(Subject.id).all()
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        out_file = os.path.join(root_dir, "topics_by_subject.txt")

        with open(out_file, "w", encoding="utf-8") as f:
            f.write("=" * 100 + "\n")
            f.write("              LEARNMATE - SYLLABUS HIERARCHY (SUBJECT -> CHAPTER -> TOPIC)\n")
            f.write("=" * 100 + "\n\n")

            for s in subjects:
                if not s.chapters:
                    continue

                sub_q = sum(len(t.questions) for c in s.chapters for t in c.topics)
                f.write(f"\n{'#' * 90}\n")
                f.write(f"SUBJECT [{s.id}]: {s.name.upper()} (Total Questions: {sub_q})\n")
                f.write(f"{'#' * 90}\n")

                for c in s.chapters:
                    chap_q = sum(len(t.questions) for t in c.topics)
                    f.write(f"\n  ├── CHAPTER [{c.id}]: {c.name} (Questions: {chap_q})\n")
                    for t in c.topics:
                        t_q = len(t.questions)
                        f.write(f"  │     └── [Topic ID {t.id:3d}] {t.name:<55} (Questions: {t_q:3d})\n")

        print(f"Generated grouped topics file: {out_file}")
    finally:
        db.close()

if __name__ == "__main__":
    generate_grouped()
