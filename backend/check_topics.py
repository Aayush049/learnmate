from app.database import SessionLocal
from app.models.question import Question
from app.models.topic import Topic
from app.models.chapter import Chapter
from sqlalchemy.orm import joinedload

db = SessionLocal()
topics_with_qs = db.query(Topic).join(Question).distinct().options(joinedload(Topic.chapter)).all()
print("Topics with ESE questions:")
for t in topics_with_qs:
    q_count = db.query(Question).filter_by(topic_id=t.id).count()
    print(f"Topic {t.id} '{t.name}' in Chapter {t.chapter.id} '{t.chapter.name}' - {q_count} questions")
