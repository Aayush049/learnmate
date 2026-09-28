from app.database import SessionLocal
from app.models.question import Question

db = SessionLocal()
count = db.query(Question).filter_by(source="ESE/SSC JE PYQ").count()
print(f"Total REAL expected ESE questions in DB: {count}")
count_pyq = db.query(Question).filter_by(is_pyq=True).count()
print(f"Total PYQ marked in DB: {count_pyq}")
