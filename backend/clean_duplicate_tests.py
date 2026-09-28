import os
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.question import Question, QuestionOption
from app.models.mock_test import MockTest, MockTestQuestion

def clean_duplicates():
    db: Session = SessionLocal()
    
    test_ids_to_delete = [19, 20, 21, 22]
    total_q_deleted = 0
    
    for t_id in test_ids_to_delete:
        print(f"Cleaning Mock Test ID {t_id}...")
        
        # Get question IDs
        mtqs = db.query(MockTestQuestion).filter(MockTestQuestion.mock_test_id == t_id).all()
        q_ids = [mtq.question_id for mtq in mtqs]
        
        # Delete MTQs
        db.query(MockTestQuestion).filter(MockTestQuestion.mock_test_id == t_id).delete(synchronize_session=False)
        db.commit()
        
        # Delete Options and Questions
        chunk_size = 50
        for i in range(0, len(q_ids), chunk_size):
            chunk = q_ids[i:i+chunk_size]
            db.query(QuestionOption).filter(QuestionOption.question_id.in_(chunk)).delete(synchronize_session=False)
            db.query(Question).filter(Question.id.in_(chunk)).delete(synchronize_session=False)
            db.commit()
            
        total_q_deleted += len(q_ids)
        
        # Delete the MockTest
        db.query(MockTest).filter(MockTest.id == t_id).delete(synchronize_session=False)
        db.commit()
        
        print(f"  -> Deleted test {t_id} and {len(q_ids)} questions.")
        
    print(f"\nCleanup complete! Deleted {len(test_ids_to_delete)} duplicate mock tests and {total_q_deleted} floating questions.")

if __name__ == "__main__":
    clean_duplicates()
