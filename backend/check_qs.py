from app.database import SessionLocal
from app.models.question import Question

db = SessionLocal()
qs = db.query(Question).filter_by(topic_id=28).all()
for q in qs[:3]:
    print("Q:", q.question_text)
    print("Source:", q.source)
    print("Is PYQ:", q.is_pyq)
