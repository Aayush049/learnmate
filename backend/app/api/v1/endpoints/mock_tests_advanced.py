"""
Advanced mock test endpoints: question navigation palette, auto-submit on timer expiry.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from datetime import datetime, timedelta, timezone

from app import schemas, models
from app.database import get_db
from app.auth import get_current_active_user, require_active_entitlement

router = APIRouter()


@router.get("/{test_id}/palette", response_model=Dict)
def get_question_palette(
    test_id: int,
    attempt_id: int,
    current_user: models.User = Depends(require_active_entitlement),
    db: Session = Depends(get_db)
):
    """
    Get the question palette showing status of each question in a test.
    States: Answered, Marked for Review, Unanswered, Visited.
    """
    attempt = db.query(models.MockTestAttempt).filter(
        models.MockTestAttempt.id == attempt_id,
        models.MockTestAttempt.user_id == current_user.id
    ).first()

    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    if attempt.completed_at:
        raise HTTPException(status_code=400, detail="Test already completed")

    # Get all questions in the test
    test_questions = db.query(models.MockTestQuestion).filter(
        models.MockTestQuestion.mock_test_id == test_id
    ).order_by(models.MockTestQuestion.question_order).all()

    if not test_questions:
        raise HTTPException(status_code=404, detail="No questions in test")

    # Get all attempts for this mock test attempt
    question_attempts = {
        qa.question_id: qa for qa in db.query(models.QuestionAttempt).filter(
            models.QuestionAttempt.mock_test_attempt_id == attempt_id
        ).all()
    }

    palette = []
    answered_count = 0
    marked_count = 0
    unanswered_count = 0

    for tq in test_questions:
        qa = question_attempts.get(tq.question_id)

        if qa and qa.selected_option:
            status = "answered"
            answered_count += 1
        elif qa and qa.is_marked_for_review:
            status = "marked"
            marked_count += 1
        else:
            status = "unanswered"
            unanswered_count += 1

        palette.append({
            "question_id": tq.question_id,
            "question_order": tq.question_order,
            "status": status,
            "marked_for_review": qa.is_marked_for_review if qa else False
        })

    return {
        "attempt_id": attempt_id,
        "questions": palette,
        "summary": {
            "total": len(test_questions),
            "answered": answered_count,
            "marked": marked_count,
            "unanswered": unanswered_count
        }
    }


@router.post("/{test_id}/mark-for-review")
def mark_for_review(
    test_id: int,
    attempt_id: int,
    question_id: int,
    current_user: models.User = Depends(require_active_entitlement),
    db: Session = Depends(get_db)
):
    """
    Mark or unmark a question for review.
    """
    attempt = db.query(models.MockTestAttempt).filter(
        models.MockTestAttempt.id == attempt_id,
        models.MockTestAttempt.user_id == current_user.id
    ).first()

    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    if attempt.completed_at:
        raise HTTPException(status_code=400, detail="Test already completed")

    # Get or create question attempt
    qa = db.query(models.QuestionAttempt).filter(
        models.QuestionAttempt.question_id == question_id,
        models.QuestionAttempt.mock_test_attempt_id == attempt_id,
        models.QuestionAttempt.user_id == current_user.id
    ).first()

    if not qa:
        qa = models.QuestionAttempt(
            user_id=current_user.id,
            question_id=question_id,
            mock_test_attempt_id=attempt_id
        )
        db.add(qa)

    # Toggle mark for review
    qa.is_marked_for_review = not qa.is_marked_for_review
    db.commit()

    return {
        "question_id": question_id,
        "marked_for_review": qa.is_marked_for_review
    }


@router.post("/{test_id}/auto-submit")
def auto_submit_on_expiry(
    test_id: int,
    attempt_id: int,
    current_user: models.User = Depends(require_active_entitlement),
    db: Session = Depends(get_db)
):
    """
    Auto-submit the test when timer expires.
    This endpoint should be called by the frontend when countdown reaches zero.
    """
    attempt = db.query(models.MockTestAttempt).filter(
        models.MockTestAttempt.id == attempt_id,
        models.MockTestAttempt.user_id == current_user.id
    ).first()

    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    if attempt.completed_at:
        raise HTTPException(status_code=400, detail="Test already completed")

    # Mark any unanswered questions
    test_questions = db.query(models.MockTestQuestion).filter(
        models.MockTestQuestion.mock_test_id == test_id
    ).all()

    for tq in test_questions:
        existing_qa = db.query(models.QuestionAttempt).filter(
            models.QuestionAttempt.question_id == tq.question_id,
            models.QuestionAttempt.mock_test_attempt_id == attempt_id
        ).first()

        if not existing_qa:
            # Create unanswered attempt
            qa = models.QuestionAttempt(
                user_id=current_user.id,
                question_id=tq.question_id,
                mock_test_attempt_id=attempt_id,
                selected_option=None,
                is_correct=None
            )
            db.add(qa)

    # Finalize the attempt. `started_at` comes back tz-aware from Postgres while
    # `datetime.utcnow()` is naive, so normalize before subtracting.
    attempt.completed_at = datetime.now(timezone.utc)
    if attempt.started_at:
        started_at = attempt.started_at
        if started_at.tzinfo is None:
            started_at = started_at.replace(tzinfo=timezone.utc)
        time_diff = attempt.completed_at - started_at
        attempt.total_time_seconds = int(time_diff.total_seconds())

    db.commit()
    db.refresh(attempt)

    return {
        "attempt_id": attempt_id,
        "auto_submitted": True,
        "message": "Test auto-submitted due to timer expiry"
    }


@router.get("/{test_id}/analytics/{attempt_id}")
def get_analytics(
    test_id: int,
    attempt_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed analytics for a completed test attempt.
    Includes: subject-wise performance, difficulty-wise performance, time analysis.
    """
    attempt = db.query(models.MockTestAttempt).filter(
        models.MockTestAttempt.id == attempt_id,
        models.MockTestAttempt.user_id == current_user.id
    ).first()

    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    if not attempt.completed_at:
        raise HTTPException(status_code=400, detail="Test not yet completed")

    # Get all question attempts
    question_attempts = db.query(models.QuestionAttempt).filter(
        models.QuestionAttempt.mock_test_attempt_id == attempt_id
    ).all()

    # Aggregate by subject, difficulty
    subject_stats = {}
    difficulty_stats = {}
    time_stats = []

    for qa in question_attempts:
        question = db.query(models.Question).filter(models.Question.id == qa.question_id).first()
        if not question:
            continue

        topic = db.query(models.Topic).filter(models.Topic.id == question.topic_id).first()
        chapter = db.query(models.Chapter).filter(models.Chapter.id == topic.chapter_id).first() if topic else None
        subject = db.query(models.Subject).filter(models.Subject.id == chapter.subject_id).first() if chapter else None
        subject_name = subject.name if subject else "Unknown"

        # Subject stats
        if subject_name not in subject_stats:
            subject_stats[subject_name] = {"correct": 0, "total": 0, "marks": 0}
        subject_stats[subject_name]["total"] += 1
        if qa.is_correct:
            subject_stats[subject_name]["correct"] += 1
            subject_stats[subject_name]["marks"] += question.marks

        # Difficulty stats
        difficulty = question.difficulty or "medium"
        if difficulty not in difficulty_stats:
            difficulty_stats[difficulty] = {"correct": 0, "total": 0}
        difficulty_stats[difficulty]["total"] += 1
        if qa.is_correct:
            difficulty_stats[difficulty]["correct"] += 1

        # Time stats
        if qa.time_taken_seconds:
            time_stats.append({
                "question_id": question.id,
                "time": qa.time_taken_seconds,
                "is_correct": qa.is_correct
            })

    avg_time = sum(t["time"] for t in time_stats) / len(time_stats) if time_stats else 0

    return {
        "attempt_id": attempt_id,
        "subject_performance": [
            {
                "subject": subj,
                "correct": stats["correct"],
                "total": stats["total"],
                "accuracy": round(stats["correct"] / stats["total"] * 100, 2) if stats["total"] > 0 else 0,
                "marks_obtained": stats["marks"]
            }
            for subj, stats in subject_stats.items()
        ],
        "difficulty_performance": [
            {
                "difficulty": diff,
                "correct": stats["correct"],
                "total": stats["total"],
                "accuracy": round(stats["correct"] / stats["total"] * 100, 2) if stats["total"] > 0 else 0
            }
            for diff, stats in difficulty_stats.items()
        ],
        "time_analysis": {
            "total_time_seconds": attempt.total_time_seconds,
            "average_time_per_question": round(avg_time, 2),
            "fastest_question": min((t["time"] for t in time_stats), default=0),
            "slowest_question": max((t["time"] for t in time_stats), default=0)
        }
    }
