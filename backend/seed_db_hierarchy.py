from app.database import SessionLocal
from app.models import Exam, Branch, Subject, Chapter, Topic

def seed():
    session = SessionLocal()
    try:
        # Check if already seeded
        if session.query(Exam).first():
            print("DB already has exams. Skipping seed.")
            return

        print("Seeding hierarchy...")
        # 1. Exam
        exam = Exam(name="SSC JE Civil", description="SSC Junior Engineer Civil Engineering", display_order=1)
        session.add(exam)
        session.flush()

        # 2. Branch
        branch = Branch(exam_id=exam.id, name="Civil Engineering", display_order=1)
        session.add(branch)
        session.flush()

        # 3. Subjects
        subjects_data = [
            {"name": "Building Materials", "icon": "BM", "color": "purple"},
            {"name": "Surveying", "icon": "SV", "color": "blue"},
            {"name": "Soil Mechanics", "icon": "SM", "color": "orange"},
            {"name": "Hydraulics & Irrigation", "icon": "HI", "color": "cyan"},
            {"name": "RCC & Steel Structures", "icon": "RS", "color": "red"},
            {"name": "Transportation Engineering", "icon": "TE", "color": "green"},
        ]
        
        for idx, s in enumerate(subjects_data, 1):
            subject = Subject(branch_id=branch.id, name=s["name"], description=f"{s['name']} Subject", icon=s["icon"], display_order=idx)
            session.add(subject)
            session.flush()

            # 4. Chapters & Topics for each subject
            chapter1 = Chapter(subject_id=subject.id, name=f"Basics of {s['name']}", display_order=1)
            chapter2 = Chapter(subject_id=subject.id, name=f"Advanced {s['name']}", display_order=2)
            session.add_all([chapter1, chapter2])
            session.flush()

            topic1 = Topic(chapter_id=chapter1.id, name="Intro", display_order=1)
            topic2 = Topic(chapter_id=chapter1.id, name="Properties", display_order=2)
            topic3 = Topic(chapter_id=chapter2.id, name="Applications", display_order=1)
            session.add_all([topic1, topic2, topic3])
        
        session.commit()
        print("Data seeded successfully!")
    finally:
        session.close()

if __name__ == "__main__":
    seed()
