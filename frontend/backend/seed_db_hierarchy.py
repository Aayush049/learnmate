import asyncio
from app.db.session import engine, async_session_maker
from app.models import Exam, Branch, Subject, Chapter, Topic
from sqlalchemy import select

async def seed():
    async with async_session_maker() as session:
        # Check if already seeded
        result = await session.execute(select(Exam))
        if result.scalars().first():
            print("DB already has exams. Skipping seed.")
            return

        print("Seeding hierarchy...")
        # 1. Exam
        exam = Exam(name="SSC JE Civil", description="SSC Junior Engineer Civil Engineering", display_order=1)
        session.add(exam)
        await session.flush()

        # 2. Branch
        branch = Branch(exam_id=exam.id, name="Civil Engineering", display_order=1)
        session.add(branch)
        await session.flush()

        # 3. Subjects
        subjects_data = [
            {"name": "Building Materials", "icon": "BM"},
            {"name": "Surveying", "icon": "SV"},
            {"name": "Soil Mechanics", "icon": "SM"},
        ]
        
        for idx, s in enumerate(subjects_data, 1):
            subject = Subject(branch_id=branch.id, name=s["name"], description=f"{s['name']} Subject", icon=s["icon"], display_order=idx)
            session.add(subject)
            await session.flush()

            # 4. Chapters & Topics for each subject
            chapter1 = Chapter(subject_id=subject.id, name=f"Basics of {s['name']}", display_order=1)
            chapter2 = Chapter(subject_id=subject.id, name=f"Advanced {s['name']}", display_order=2)
            session.add_all([chapter1, chapter2])
            await session.flush()

            topic1 = Topic(chapter_id=chapter1.id, name="Intro", display_order=1)
            topic2 = Topic(chapter_id=chapter1.id, name="Properties", display_order=2)
            topic3 = Topic(chapter_id=chapter2.id, name="Applications", display_order=1)
            session.add_all([topic1, topic2, topic3])
        
        await session.commit()
        print("Data seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
