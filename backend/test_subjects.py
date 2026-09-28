from app.database import SessionLocal
from app.models.subject import Subject

db = SessionLocal()
for s in db.query(Subject).all():
    print(f"Subject ID {s.id}: {s.name}")
