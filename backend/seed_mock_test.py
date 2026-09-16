import os
import sys

# Set up path so we can import from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app import models
import random

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

# Check if there are mock tests
existing = db.query(models.MockTest).count()
if existing == 0:
    print("Creating mock test...")
    questions = db.query(models.Question).all()
    selected = random.sample(questions, min(10, len(questions)))
    
    mock_test = models.MockTest(
        name="SSC JE Civil Mini Mock 1",
        description="A quick 10-question mock test to check the engine.",
        test_type="full_syllabus",
        duration_minutes=15,
        total_marks=10,
        negative_marking=0.25
    )
    db.add(mock_test)
    db.commit()
    db.refresh(mock_test)
    
    for i, q in enumerate(selected, 1):
        mtq = models.MockTestQuestion(
            mock_test_id=mock_test.id,
            question_id=q.id,
            question_order=i
        )
        db.add(mtq)
    
    db.commit()
    print("Mock test created successfully!")
else:
    print(f"Database already has {existing} mock tests.")

db.close()
