from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import random
from datetime import datetime

from app import schemas, models
from app.database import get_db
from app.auth import get_current_active_user, require_active_entitlement

router = APIRouter()


@router.post("/start")
def start_practice_session(
    topic_id: int = Query(..., description="Topic ID to practice"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty (easy/medium/hard)"),
    num_questions: int = Query(10, ge=1, le=50, description="Number of questions"),
    current_user: models.User = Depends(require_active_entitlement),
    db: Session = Depends(get_db)
):
    """
    Start a new practice session for a specific topic.
    Returns a set of randomized questions without correct answers.
    """
    # Verify topic exists
    topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    # Build query
    query = db.query(models.Question).filter(models.Question.topic_id == topic_id)

    if difficulty:
        query = query.filter(models.Question.difficulty == difficulty)

    # Get all matching questions and shuffle
    all_questions = query.all()

    if not all_questions:
        raise HTTPException(
            status_code=404,
            detail=f"No questions found for this topic{f' with difficulty {difficulty}' if difficulty else ''}"
        )

    if len(all_questions) < num_questions:
        num_questions = len(all_questions)

    selected_questions = random.sample(all_questions, num_questions)

    # Prepare response
    result = {
        "session_id": f"practice_{current_user.id}_{topic_id}_{datetime.utcnow().timestamp()}",
        "topic_id": topic_id,
        "topic_name": topic.name,
        "total_questions": num_questions,
        "current_question_index": 0,
        "questions": []
    }

    for q in selected_questions:
        options = db.query(models.QuestionOption).filter(
            models.QuestionOption.question_id == q.id
        ).all()
        result["questions"].append(schemas.QuestionWithOptions(
            id=q.id,
            topic_id=q.topic_id,
            question_text=q.question_text,
            difficulty=q.difficulty,
            marks=q.marks,
            options=[schemas.QuestionOptionResponse(
                id=opt.id,
                option_text=opt.option_text,
                option_label=opt.option_label
            ) for opt in options]
        ))

    return result


@router.post("/submit-answer")
def submit_practice_answer(
    answer: schemas.AnswerSubmission,
    current_user: models.User = Depends(require_active_entitlement),
    db: Session = Depends(get_db)
):
    """
    Submit an answer during practice mode and save the attempt.
    """
    question = db.query(models.Question).filter(models.Question.id == answer.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    # Get correct option
    correct_option_obj = db.query(models.QuestionOption).filter(
        models.QuestionOption.question_id == question.id,
        models.QuestionOption.is_correct == 1
    ).first()

    if not correct_option_obj:
        raise HTTPException(status_code=500, detail="Question has no correct answer configured")

    is_correct = answer.selected_option == correct_option_obj.option_label if answer.selected_option else False

    # Save the attempt
    attempt = models.QuestionAttempt(
        user_id=current_user.id,
        question_id=question.id,
        mock_test_attempt_id=None,  # Practice mode, not mock test
        selected_option=answer.selected_option,
        is_correct=is_correct if answer.selected_option else None,
        time_taken_seconds=answer.time_taken_seconds
    )
    db.add(attempt)
    db.commit()

    return {
        "question_id": question.id,
        "is_correct": is_correct,
        "correct_option": correct_option_obj.option_label,
        "explanation": question.explanation,
        "selected_option": answer.selected_option,
        "time_taken_seconds": answer.time_taken_seconds
    }


@router.post("/bookmark")
def bookmark_question(
    question_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Bookmark a question for later review.
    """
    question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    # Check if already bookmarked
    existing = db.query(models.Bookmark).filter(
        models.Bookmark.user_id == current_user.id,
        models.Bookmark.question_id == question_id
    ).first()

    if existing:
        return {"message": "Question already bookmarked", "bookmark_id": existing.id}

    bookmark = models.Bookmark(
        user_id=current_user.id,
        question_id=question_id
    )
    db.add(bookmark)
    db.commit()
    db.refresh(bookmark)

    return {"message": "Question bookmarked successfully", "bookmark_id": bookmark.id}


@router.delete("/bookmark/{question_id}")
def remove_bookmark(
    question_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Remove a bookmark for a question.
    """
    bookmark = db.query(models.Bookmark).filter(
        models.Bookmark.user_id == current_user.id,
        models.Bookmark.question_id == question_id
    ).first()

    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")

    db.delete(bookmark)
    db.commit()
    return {"message": "Bookmark removed successfully"}


@router.get("/bookmarks")
def get_user_bookmarks(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get all bookmarked questions for the current user.
    """
    bookmarks = db.query(models.Bookmark).filter(
        models.Bookmark.user_id == current_user.id
    ).all()

    result = []
    for bm in bookmarks:
        question = db.query(models.Question).filter(models.Question.id == bm.question_id).first()
        if question:
            topic = db.query(models.Topic).filter(models.Topic.id == question.topic_id).first()
            subject = db.query(models.Subject).filter(models.Subject.id == topic.subject_id).first() if topic else None
            result.append({
                "bookmark_id": bm.id,
                "question_id": question.id,
                "question_text": question.question_text,
                "topic_name": topic.name if topic else "Unknown",
                "subject_name": subject.name if subject else "Unknown",
                "bookmarked_at": bm.created_at
            })

    return result