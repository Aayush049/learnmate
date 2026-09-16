import json
import argparse
import sys
import os
from sqlalchemy.orm import Session
from pathlib import Path

# Add the parent directory to Python path so we can import app modules
sys.path.append(str(Path(__file__).resolve().parents[2]))

from app.database import SessionLocal
from app.models.exam import Exam
from app.models.branch import Branch
from app.models.subject import Subject
from app.models.chapter import Chapter
from app.models.topic import Topic
from app.models.question import Question, QuestionOption, DifficultyLevel


def get_or_create(session: Session, model, defaults=None, **kwargs):
    instance = session.query(model).filter_by(**kwargs).first()
    if instance:
        return instance, False
    else:
        params = dict((k, v) for k, v in kwargs.items())
        params.update(defaults or {})
        instance = model(**params)
        session.add(instance)
        session.flush() # flush to get the ID without committing
        return instance, True


def ingest_questions(json_path: str, default_exam: str = "SSC JE", default_branch: str = "Civil Engineering"):
    if not os.path.exists(json_path):
        print(f"Error: File '{json_path}' not found.")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if not isinstance(data, list):
        print("Error: JSON root must be a list of questions.")
        return

    db: Session = SessionLocal()

    try:
        # Resolve Defaults for Exam and Branch
        exam, _ = get_or_create(db, Exam, name=default_exam)
        branch, _ = get_or_create(db, Branch, exam_id=exam.id, name=default_branch)

        inserted_count = 0

        for idx, item in enumerate(data):
            try:
                subj_name = item.get("subject", "Uncategorized Subject")
                chap_name = item.get("chapter", "Uncategorized Chapter")
                topic_name = item.get("topic", "Uncategorized Topic")

                q_text = item.get("question_text")
                if not q_text:
                    print(f"Skipping index {idx}: missing 'question_text'")
                    continue

                subject, _ = get_or_create(db, Subject, branch_id=branch.id, name=subj_name)
                chapter, _ = get_or_create(db, Chapter, subject_id=subject.id, name=chap_name)
                topic, _ = get_or_create(db, Topic, chapter_id=chapter.id, name=topic_name)

                # Check if question already exists under this topic to avoid duplicates
                existing_q = db.query(Question).filter(
                    Question.topic_id == topic.id,
                    Question.question_text == q_text
                ).first()

                if existing_q:
                    print(f"Question already exists: '{q_text[:30]}...' -> Skipping.")
                    continue

                diff_str = item.get("difficulty", "medium").lower()
                diff_enum = DifficultyLevel.MEDIUM
                if diff_str == "easy": diff_enum = DifficultyLevel.EASY
                elif diff_str == "hard": diff_enum = DifficultyLevel.HARD

                new_q = Question(
                    topic_id=topic.id,
                    question_text=q_text,
                    explanation=item.get("explanation", ""),
                    difficulty=diff_enum,
                    marks=item.get("marks", 1),
                    is_pyq=item.get("is_pyq", False) or bool(item.get("year")),
                    year=item.get("year"),
                    shift=item.get("shift"),
                    source=item.get("source")
                )
                db.add(new_q)
                db.flush()

                # Add Options
                options_data = item.get("options", [])
                correct_label = str(item.get("correct_label", "")).upper()
                for opt in options_data:
                    opt_label = str(opt.get("label", "")).upper()
                    new_opt = QuestionOption(
                        question_id=new_q.id,
                        option_text=opt.get("text", ""),
                        option_label=opt_label,
                        is_correct=1 if opt_label == correct_label else 0
                    )
                    db.add(new_opt)

                inserted_count += 1
            except Exception as e:
                print(f"Error processing item at index {idx}: {e}")
                db.rollback()
                raise e

        db.commit()
        print(f"\nSuccess! Successfully ingested {inserted_count} questions into the database.")

    except Exception as e:
        print(f"\nIngestion failed: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest questions JSON into the database.")
    parser.add_argument("file", help="Path to the JSON file containing questions")
    parser.add_argument("--exam", default="SSC JE", help="Default Exam name")
    parser.add_argument("--branch", default="Civil Engineering", help="Default Branch name")

    args = parser.parse_args()

    ingest_questions(args.file, default_exam=args.exam, default_branch=args.branch)
