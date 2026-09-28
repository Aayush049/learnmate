import sys
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.mock_test import MockTest

db = SessionLocal()
all_tests = db.query(MockTest).all()
for t in all_tests:
    print(f"ID: {t.id} - {t.name} (Type: {t.test_type})")
db.close()
