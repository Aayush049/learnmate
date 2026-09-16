from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any

from app.database import get_db
from app.auth import get_current_user
from app.models.user import User
from app.models.question import Question
from app.models.subject import Subject
from app.models.mock_test import MockTest

router = APIRouter()

def get_current_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

@router.get("/dashboard-stats")
def get_admin_dashboard_stats(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:

    total_users = db.query(func.count(User.id)).scalar()
    total_subjects = db.query(func.count(Subject.id)).scalar()
    total_questions = db.query(func.count(Question.id)).scalar()
    total_mock_tests = db.query(func.count(MockTest.id)).scalar()

    return {
        "total_users": total_users or 0,
        "active_exams": total_subjects or 0, # Mapping subjects as active exams or similar
        "questions_bank": total_questions or 0,
        "mock_tests": total_mock_tests or 0
    }

from app.schemas.user import UserResponse
from fastapi import status

@router.get("/users")
def get_all_users(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all users with basic info for admin."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    # Let's attach attempt count manually for the dashboard
    from app.models.attempt import MockTestAttempt
    
    result = []
    for u in users:
        attempt_count = db.query(func.count(MockTestAttempt.id)).filter(MockTestAttempt.user_id == u.id).scalar()
        result.append({
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "is_active": u.is_active,
            "is_admin": u.is_admin,
            "created_at": u.created_at,
            "total_attempts": attempt_count or 0
        })
    return result

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a user from the system."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.is_admin:
        raise HTTPException(status_code=400, detail="Cannot delete an admin user directly")
        
    db.delete(user)
    db.commit()
    return None

@router.get("/users/{user_id}/progress")
def get_user_progress(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get analytical progress for a specific user."""
    # We will compute basic stats like in the analytics endpoint but specifically for user_id
    from app.models.attempt import QuestionAttempt, MockTestAttempt
    from app.models.question import Question
    from app.models.topic import Topic
    from app.models.chapter import Chapter
    from app.models.subject import Subject
    from sqlalchemy import case
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Total questions attempted
    total_q = db.query(func.count(QuestionAttempt.id)).filter(QuestionAttempt.user_id == user_id).scalar() or 0
    correct_q = db.query(func.count(QuestionAttempt.id)).filter(
        QuestionAttempt.user_id == user_id, 
        QuestionAttempt.is_correct == True
    ).scalar() or 0
    
    accuracy = round((correct_q / total_q) * 100, 1) if total_q > 0 else 0
    
    # Subject-wise analytics
    subject_stats = []
    subject_attempts = db.query(
        Subject.name,
        func.count(QuestionAttempt.id).label('total'),
        func.sum(case((QuestionAttempt.is_correct == True, 1), else_=0)).label('correct')
    ).select_from(QuestionAttempt)\
     .join(Question)\
     .join(Topic, Question.topic_id == Topic.id)\
     .join(Chapter, Topic.chapter_id == Chapter.id)\
     .join(Subject, Chapter.subject_id == Subject.id)\
     .filter(QuestionAttempt.user_id == user_id)\
     .group_by(Subject.name).all()
     
    for s_name, s_total, s_correct in subject_attempts:
        subject_stats.append({
            "subject": s_name,
            "attempted": s_total,
            "accuracy": round((s_correct / s_total * 100), 1) if s_total > 0 else 0
        })

    # Mock test attempts
    mock_tests = db.query(
        MockTestAttempt.id,
        MockTest.name,
        MockTestAttempt.score,
        MockTestAttempt.total_questions,
        MockTestAttempt.completed_at
    ).join(MockTest, MockTestAttempt.mock_test_id == MockTest.id)\
     .filter(MockTestAttempt.user_id == user_id)\
     .order_by(MockTestAttempt.started_at.desc()).all()
     
    test_history = [
        {
            "id": mt.id,
            "test_name": mt.name,
            "score": mt.score,
            "total_questions": mt.total_questions,
            "completed_at": mt.completed_at
        } for mt in mock_tests
    ]

    return {
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email
        },
        "overall": {
            "total_questions_attempted": total_q,
            "overall_accuracy": accuracy
        },
        "subject_stats": subject_stats,
        "test_history": test_history
    }
