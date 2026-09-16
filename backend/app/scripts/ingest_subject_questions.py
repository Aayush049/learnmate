import json
import os
import sys

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.append(backend_dir)

from app.database import SessionLocal
from app.models import Exam, Branch, Subject, Chapter, Topic, Question, QuestionOption

def ingest_all():
    session = SessionLocal()
    data_dir = os.path.join(backend_dir, "..", "extracted_data")
    
    if not os.path.exists(data_dir):
        print(f"Data directory {data_dir} not found!")
        return

    json_files = [f for f in os.listdir(data_dir) if f.endswith(".json")]
    
    try:
        # Create a default Exam & Branch if none exist
        exam = session.query(Exam).first()
        if not exam:
            exam = Exam(name="Engineering Exam", description="Default Examination")
            session.add(exam)
            session.flush()
            
        branch = session.query(Branch).filter_by(exam_id=exam.id).first()
        if not branch:
            branch = Branch(exam_id=exam.id, name="General Engineering", description="Default Branch")
            session.add(branch)
            session.flush()

        total_questions = 0

        for file in json_files:
            file_path = os.path.join(data_dir, file)
            print(f"Processing {file}...")
            with open(file_path, "r", encoding="utf-8") as f:
                questions_data = json.load(f)
            
            for q_data in questions_data:
                sub_name = q_data.get("subject", "Uncategorized Subject")
                topic_name = q_data.get("topic", "Uncategorized Topic")
                chapter_name = f"{sub_name} - General Chapter" # Mock chapter
                
                # Fetch or create Subject
                subject = session.query(Subject).filter_by(name=sub_name, branch_id=branch.id).first()
                if not subject:
                    subject = Subject(branch_id=branch.id, name=sub_name)
                    session.add(subject)
                    session.flush()
                
                # Fetch or create Chapter
                chapter = session.query(Chapter).filter_by(name=chapter_name, subject_id=subject.id).first()
                if not chapter:
                    chapter = Chapter(subject_id=subject.id, name=chapter_name)
                    session.add(chapter)
                    session.flush()
                
                # Fetch or create Topic
                topic = session.query(Topic).filter_by(name=topic_name, chapter_id=chapter.id).first()
                if not topic:
                    topic = Topic(chapter_id=chapter.id, name=topic_name)
                    session.add(topic)
                    session.flush()
                
                # Insert Question
                q = Question(
                    topic_id=topic.id,
                    question_text=q_data.get("question_text", "Unknown"),
                    difficulty="medium",
                    marks=q_data.get("marks", 1),
                    year=q_data.get("year", None),
                    is_pyq=True if q_data.get("year") else False,
                    explanation=q_data.get("explanation")
                )
                session.add(q)
                session.flush()
                
                # Insert Options
                for opt in q_data.get("options", []):
                    o_label = opt.get("label", "")
                    o_text = opt.get("text", "")
                    is_correct = (o_label == q_data.get("correct_label"))
                    
                    option = QuestionOption(
                        question_id=q.id,
                        option_text=o_text,
                        option_label=o_label,
                        is_correct=is_correct
                    )
                    session.add(option)
                
                total_questions += 1
            
        session.commit()
        print(f"\nSuccessfully ingested {total_questions} questions across all topics!")
        
    except Exception as e:
        session.rollback()
        print(f"Error occurred: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    ingest_all()

