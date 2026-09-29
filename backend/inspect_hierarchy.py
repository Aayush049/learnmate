import os
import sys
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.database import SessionLocal
from app.models.subject import Subject
from app.models.chapter import Chapter
from app.models.topic import Topic
from app.models.question import Question

db = SessionLocal()
try:
    subs = db.query(Subject).filter(Subject.branch_id == 2).order_by(Subject.id).all()
    for s in subs:
        print(f"=== Subject {s.id}: {s.name} (display_order={s.display_order}) ===")
        for c in s.chapters:
            print(f"   Chapter {c.id}: {c.name} (display_order={c.display_order})")
            for t in c.topics:
                q_count = db.query(Question).filter(Question.topic_id == t.id).count()
                print(f"      Topic {t.id}: '{t.name}' (display_order={t.display_order}) -> {q_count} questions")
finally:
    db.close()
