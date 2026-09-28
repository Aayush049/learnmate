from app.database import SessionLocal
from app.models.question import Question

db = SessionLocal()
print('Total questions in DB:', db.query(Question).count())
