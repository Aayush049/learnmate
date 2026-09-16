import sys
import os

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.append(backend_dir)

from app.database import SessionLocal
from app.models import MockTest, MockTestQuestion, Question

def generate_mock():
    session = SessionLocal()
    questions = session.query(Question).limit(50).all()
    
    mt = MockTest(
        name="Grand 50-Question Technical Mock",
        description="A massive mock test spanning various subjects.",
        duration_minutes=60,
        total_marks=50,
        negative_marking=0.25
    )
    session.add(mt)
    session.flush()
    
    for i, q in enumerate(questions):
        mtq = MockTestQuestion(
            mock_test_id=mt.id,
            question_id=q.id,
            question_order=i+1
        )
        session.add(mtq)
        
    session.commit()
    print(f"Created '{mt.name}' with {len(questions)} linked questions.")

if __name__ == '__main__':
    generate_mock()
