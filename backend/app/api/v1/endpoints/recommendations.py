from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.auth import get_current_user

router = APIRouter()

@router.get("/")
def get_ai_recommendation(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Dynamic recommendation based on weakness
    from app.models.attempt import QuestionAttempt
    from app.models.question import Question
    from app.models.topic import Topic
    from app.models.chapter import Chapter
    from app.models.subject import Subject
    from sqlalchemy import func, case
    
    # Get weakest topic/subject
    q_attempts = db.query(
        Subject.name,
        func.count(QuestionAttempt.id).label('total_attempted'),
        func.sum(case((QuestionAttempt.is_correct == True, 1), else_=0)).label('correct')
    ).select_from(QuestionAttempt)     .join(Question)     .join(Topic, Question.topic_id == Topic.id)     .join(Chapter, Topic.chapter_id == Chapter.id)     .join(Subject, Chapter.subject_id == Subject.id)     .filter(QuestionAttempt.user_id == current_user.id)     .group_by(Subject.name).all()
     
    if not q_attempts:
        return {
            "title": "Start Your Preparation",
            "rationale": "Welcome to LearnMate! Start by taking a mock test or answering practice questions so we can analyze your proficiency.",
            "action": "Start Practicing"
        }
        
    stats = []
    for qa in q_attempts:
        acc = round((qa.correct / qa.total_attempted * 100)) if qa.total_attempted > 0 else 0
        stats.append({"name": qa.name, "acc": acc})
        
    stats.sort(key=lambda x: x["acc"])
    weakest = stats[0]
    
    return {
        "title": f"Focus on {weakest['name']}",
        "rationale": f"Your accuracy in {weakest['name']} is {weakest['acc']}%. Spend some time revising the fundamentals and solve a few PYQs to master this topic.",
        "action": "Ask AI Tutor"
    }
