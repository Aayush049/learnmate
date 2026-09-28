import sys
import os
import json
import glob

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.append(backend_dir)

from app.database import SessionLocal, Base, engine
from app.models.subject import Subject
from app.models.chapter import Chapter
from app.models.topic import Topic
from app.models.question import Question, QuestionOption
from app.models.mock_test import MockTest, MockTestQuestion

def run():
    db = SessionLocal()
    
    # 1. Delete all mock questions
    print("Deleting mock questions...")
    q_mock = db.query(Question).filter(Question.source != "ESE/SSC JE PYQ").all()
    q_mock_none = db.query(Question).filter(Question.source == None).all()
    to_delete = q_mock + q_mock_none
    
    for q in to_delete:
        db.delete(q)
    print(f"Deleted {len(to_delete)} mock questions.")

    # 2. Delete mock subjects (like "Building Materials" ID=1 vs "Building Material Construction" ID=18)
    real_subjects = ["Building Material Construction", "Estimation-Costing", "Soil Mechanics", "Solid Mechanics", 
                     "Navigation Channel Harbour Dock", "Reinforcement Cement Concrete", "Earthquake", 
                     "Fluid Mechanics", "Hydraulic Machine", "Open Channel Flow", "Surveying", "Hydrology", 
                     "Irrigation", "Environmental Engineering", "Highway Engineering", "Airport engineering", 
                     "Tunnel Engineering", "Bridge Engineering", "Railway Engineering", "CPM & PERT", 
                     "Applied Mechanics", "Structural Analysis", "Design of Steel Structure", "Auto Cad"]

    all_subjects = db.query(Subject).all()
    deleted_subjects = 0
    # Keep the HIGHEST ID of real subjects if there are duplicates, delete everything else
    real_sub_ids = []
    
    for name in real_subjects:
        subs = db.query(Subject).filter(Subject.name == name).order_by(Subject.id.desc()).all()
        if subs:
            real_sub_ids.append(subs[0].id)
            # Delete older duplicates
            for s in subs[1:]:
                db.delete(s)
                deleted_subjects += 1
    
    print(f"Deleted {deleted_subjects} duplicate real subjects.")
    
    # Delete subjects that are not in real_sub_ids
    fake_subjects = 0
    for s in db.query(Subject).all():
        if s.id not in real_sub_ids:
            try:
                db.delete(s)
                fake_subjects += 1
            except Exception as e:
                print(f"Could not delete {s.name}: {e}")
                db.rollback()
                
    print(f"Deleted {fake_subjects} fake/mock subjects.")
    
    db.commit()
    print("Database cleaned up successfully! Re-run seed_syllabus.py and ingest_ese_json.py next.")

if __name__ == "__main__":
    run()
