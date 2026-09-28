import os
import json
from dotenv import load_dotenv

load_dotenv()

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.question import Question, QuestionOption, DifficultyLevel
from app.models.mock_test import MockTest, MockTestQuestion, MockTestType
from app.models.topic import Topic

def ingest_pyq_mock_tests():
    files = [
        r"C:\Users\ELYSIUM\Documents\VSCODE\learnmate\pyq\json\SSC JE (Civil Engineering) Official Paper (Held On_ 03 Dec, 2025 Shift 1).json",
        r"C:\Users\ELYSIUM\Documents\VSCODE\learnmate\pyq\json\SSC JE (Civil Engineering) Official Paper (Held On_ 05 Dec, 2025 Shift 1).json"
    ]
    
    db: Session = SessionLocal()
    topic = db.query(Topic).first()
    topic_id = topic.id if topic else 1
        
    for index, filepath in enumerate(files):
        print(f"\nProcessing {filepath}...")
        with open(filepath, 'r', encoding='utf-8') as f:
            questions_data = json.load(f)
            
        test_name = os.path.basename(filepath).replace(".json", "")
        mock_test = MockTest(
            name=test_name,
            description="SSC JE Previous Year Question Paper",
            test_type=MockTestType.FULL_SYLLABUS,
            duration_minutes=120,
            total_marks=len(questions_data),
            negative_marking=0.25,
            is_baseline=0,
            user_id=None
        )
        db.add(mock_test)
        db.flush()  # Populates mock_test.id
        
        # Batch insert for speed
        for idx, q_data in enumerate(questions_data):
            q_text = q_data.get("question_text")
            if not q_text:
                q_text = f"Question {idx+1}"
            explanation = q_data.get("solution") or ""
            source = f"{q_data.get('exam', 'SSC JE')} {q_data.get('year', 2025)} {q_data.get('shift', 'Shift 1')}"
            
            q = Question(
                topic_id=topic_id,
                question_text=q_text,
                explanation=explanation,
                difficulty=DifficultyLevel.MEDIUM,
                is_pyq=True,
                source=source[:199]
            )
            db.add(q)
            db.flush()  # Populates q.id
            
            # Options
            options_dict = q_data.get("options", {})
            correct_ans = q_data.get("correct_answer")
            for label, opt_text in options_dict.items():
                is_corr = 1 if label == correct_ans else 0
                qo = QuestionOption(
                    question_id=q.id,
                    option_text=str(opt_text) if opt_text is not None else "",
                    option_label=label,
                    is_correct=is_corr
                )
                db.add(qo)
            
            mtq = MockTestQuestion(
                mock_test_id=mock_test.id,
                question_id=q.id,
                question_order=idx + 1
            )
            db.add(mtq)
            
            if (idx + 1) % 50 == 0:
                print(f"  Processed {idx + 1}/{len(questions_data)} questions...")
                
        db.commit()
        print(f"Created mock test '{test_name}' with ID {mock_test.id} and {len(questions_data)} questions.")
        
    db.close()

if __name__ == "__main__":
    ingest_pyq_mock_tests()
