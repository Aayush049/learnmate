import sys
import os

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.append(backend_dir)

from app.database import SessionLocal
from app.models import MockTest, Question, Exam
import random

def create_mock_test():
    session = SessionLocal()
    try:
        # Check if we have one
        existing = session.query(MockTest).first()
        if existing:
            print(f"Mock test '{existing.name}' already exists.")
            return

        exam = session.query(Exam).first()
        if not exam:
            print("No exam found. Run ingestion first.")
            return

        # Fetch some questions
        all_questions = session.query(Question).limit(50).all()
        q_ids = [q.id for q in all_questions]

        if not q_ids:
            print("No questions found in DB to link to.")
            return

        ms = MockTest(
            exam_id=exam.id,
            name="Grand Full Syllabus Mock 1",
            description="A comprehensive test over all 4 subjects we ingested.",
            test_type="full_syllabus",
            duration_minutes=60,
            total_marks=len(q_ids) * 1, # assuming 1 mark each for now
            negative_marking=0.25,
            question_ids=q_ids
        )
        session.add(ms)
        session.commit()
        print(f"Created Mock Test: {ms.name} with {len(q_ids)} questions!")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        session.close()

if __name__ == '__main__':
    create_mock_test()
