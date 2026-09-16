import sys
import os

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.append(backend_dir)

from app.database import SessionLocal
from app.models import MockTest

def inspect_mock_test():
    session = SessionLocal()
    m = session.query(MockTest).first()
    print(f"Name: {m.name}, question_ids: {m.question_ids}")
    session.close()

if __name__ == '__main__':
    inspect_mock_test()
