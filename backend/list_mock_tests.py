from app.database import SessionLocal
from app.models.mock_test import MockTest

db = SessionLocal()
tests = db.query(MockTest).all()
for t in tests:
    print(f"ID: {t.id} | Name: {t.name} | User: {t.user_id} | Baseline: {t.is_baseline}")
