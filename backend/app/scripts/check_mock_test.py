import sys
import os

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.append(backend_dir)

from app.database import SessionLocal
from app.models import MockTest, MockTestQuestion

def check_questions():
    session = SessionLocal()
    mts = session.query(MockTest).all()
    for mt in mts:
        q_count = session.query(MockTestQuestion).filter_by(mock_test_id=mt.id).count()
        print(f"Test '{mt.name}' has {q_count} questions.")
    session.close()

if __name__ == '__main__':
    check_questions()
