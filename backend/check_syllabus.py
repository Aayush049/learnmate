import os
import sys
# sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from app.database import SessionLocal
from app.models.topic import Topic
from app.models.chapter import Chapter
from sqlalchemy.orm import joinedload

db = SessionLocal()
chapters = db.query(Chapter).all()
for c in chapters:
    if "Fluid Mechanics" in c.subject.name or "Fluid" in c.name or "Open Channel Flow" in c.subject.name or "Open Channel Flow" in c.name:
        print(f"Chapter ID {c.id}: {c.name}")
        for t in c.topics:
            print(f"  - Topic ID {t.id}: {t.name}")
