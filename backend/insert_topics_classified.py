import sys
import os
import json
import glob
import re

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__)))
sys.path.append(backend_dir)

from app.database import SessionLocal
from app.models.subject import Subject
from app.models.chapter import Chapter
from app.models.topic import Topic
from app.models.question import Question, QuestionOption

def normalize(name):
    # Normalize a name for matching
    name = str(name).lower().replace("&", "and")
    return re.sub(r'[^a-z0-9]', '', name)

def run():
    db = SessionLocal()

    # 1. Fetch all topics mapped by (Subject.name, Topic.name)
    subjects = db.query(Subject).all()
    sub_map = {normalize(s.name): s.id for s in subjects}

    topics = db.query(Topic).all()
    topic_map = {} # (subject_id, topic_name.lower()) -> topic_id
    for t in topics:
        topic_map[(t.chapter.subject_id, normalize(t.name.replace(" Concepts", "")))] = t.id

    print(f"Loaded {len(sub_map)} subjects, {len(topic_map)} topics from DB.")

    base_dir = "../extracted_data/topics_classified"

    inserted_questions = 0
    skipped = 0

    for subj_dir in glob.glob(os.path.join(base_dir, "*")):
        if not os.path.isdir(subj_dir):
            continue

        subj_name = os.path.basename(subj_dir)
        matched_sub_id = sub_map.get(normalize(subj_name))

        if not matched_sub_id:
            print(f"Could not map subject: {subj_name} for DB.")
            continue

        for topic_file in glob.glob(os.path.join(subj_dir, "*.json")):
            topic_name = os.path.basename(topic_file).replace(".json", "")

            matched_topic_id = topic_map.get((matched_sub_id, normalize(topic_name)))

            if not matched_topic_id:
                print(f"Could not map topic: {topic_name} in subject {subj_name}")
                continue

            with open(topic_file, 'r', encoding='utf-8') as f:
                qs = json.load(f)

            for q in qs:
                existing = db.query(Question).filter(
                    Question.topic_id == matched_topic_id,
                    Question.question_text == q.get('question_text')
                ).first()
                if existing:
                    skipped += 1
                    continue

                # Cleanup year/shift
                year_val = q.get('year')
                if year_val is None or str(year_val).lower() == 'none' or not str(year_val).isdigit():
                    year_val = 2023
                else:
                    year_val = int(year_val)

                shift_val = q.get('shift')
                if shift_val is None or str(shift_val).lower() == 'none':
                    shift_val = 'Shift-1'

                new_q = Question(
                    topic_id=matched_topic_id,
                    question_text=q.get('question_text'),
                    difficulty="medium",
                    marks=1,
                    is_pyq=True,
                    year=year_val,
                    shift=str(shift_val),
                    source=q.get("exam") or q.get("source") or "Civil_AE_2024",
                    explanation=q.get('explanation', '')
                )
                db.add(new_q)
                db.flush()

                # Add options
                opts_dict = q.get('options', {})
                correct_label = q.get('correct_answer') or q.get('answer', 'A')

                for label, text in opts_dict.items():
                    if not text:
                        continue
                    db.add(QuestionOption(
                        question_id=new_q.id,
                        option_label=label,
                        option_text=str(text),
                        is_correct=1 if (label == correct_label) else 0
                    ))
                inserted_questions += 1

            db.commit()

    print(f"Insertion complete. Inserted {inserted_questions}, skipped {skipped}")

if __name__ == "__main__":
    run()
