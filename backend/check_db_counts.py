from app.database import SessionLocal
from app.models.question import Question
from app.models.exam import Exam
try:
    from app.models.mock_test import MockTest
except ImportError:
    MockTest = None

db = SessionLocal()
print('Questions:', db.query(Question).count())
print('Exams:', db.query(Exam).count())
if MockTest:
    print('MockTests:', db.query(MockTest).count())
