import sys
import os

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.append(backend_dir)

from app.database import SessionLocal
from app.models.question import Question
from app.models.subject import Subject

def run():
    db = SessionLocal()
    
    q_mock = db.query(Question).filter(Question.source != "ESE/SSC JE PYQ").all()
    q_mock_none = db.query(Question).filter(Question.source == None).all()
    to_delete = q_mock + q_mock_none
    print(f"Would delete {len(to_delete)} mock questions.")
    
    real_subjects = ["Building Material Construction", "Estimation-Costing", "Soil Mechanics", "Solid Mechanics", 
                     "Navigation Channel Harbour Dock", "Reinforcement Cement Concrete", "Earthquake", 
                     "Fluid Mechanics", "Hydraulic Machine", "Open Channel Flow", "Surveying", "Hydrology", 
                     "Irrigation", "Environmental Engineering", "Highway Engineering", "Airport engineering", 
                     "Tunnel Engineering", "Bridge Engineering", "Railway Engineering", "CPM & PERT", 
                     "Applied Mechanics", "Structural Analysis", "Design of Steel Structure", "Auto Cad"]

    deleted_subjects = 0
    real_sub_ids = []
    
    for name in real_subjects:
        subs = db.query(Subject).filter(Subject.name == name).order_by(Subject.id.desc()).all()
        if subs:
            real_sub_ids.append(subs[0].id)
            deleted_subjects += len(subs) - 1
            
    print(f"Would delete {deleted_subjects} older duplicate real subjects.")
    
    fake_subjects = 0
    for s in db.query(Subject).all():
        if s.id not in real_sub_ids:
            fake_subjects += 1
                
    print(f"Would delete {fake_subjects} fake/mock subjects.")

if __name__ == "__main__":
    run()
