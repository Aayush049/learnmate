from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
import random
from datetime import datetime, timezone

from app import schemas, models
from app.database import get_db
from app.auth import get_current_active_user, get_current_admin_user

router = APIRouter()


@router.post("/generate", response_model=schemas.MockTestResponse)
def generate_mock_test(
    data: schemas.MockTestGenerateRequest,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Generate a dynamic mock test by picking random questions.
    Admin only (or we can allow users to generate custom tests).
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to generate global mock tests")

    # Build query for questions based on hierarchy
    q_query = db.query(models.Question)
    
    if data.subject_id:
        q_query = q_query.join(models.Topic).join(models.Chapter).filter(models.Chapter.subject_id == data.subject_id)
    elif data.branch_id:
        q_query = q_query.join(models.Topic).join(models.Chapter).join(models.Subject).filter(models.Subject.branch_id == data.branch_id)
    elif data.exam_id:
        q_query = q_query.join(models.Topic).join(models.Chapter).join(models.Subject).join(models.Branch).filter(models.Branch.exam_id == data.exam_id)

    available_questions = q_query.all()
    
    if len(available_questions) < data.total_questions:
        raise HTTPException(status_code=400, detail=f"Not enough questions available. Found {len(available_questions)}, requested {data.total_questions}")

    selected_questions = random.sample(available_questions, data.total_questions)

    mock_test = models.MockTest(
        name=data.name,
        description=data.description,
        test_type=data.test_type,
        duration_minutes=data.duration_minutes,
        total_marks=data.total_marks,
        negative_marking=data.negative_marking
    )
    db.add(mock_test)
    db.commit()
    db.refresh(mock_test)

    for order, sq in enumerate(selected_questions, start=1):
        mtq = models.MockTestQuestion(
            mock_test_id=mock_test.id,
            question_id=sq.id,
            question_order=order
        )
        db.add(mtq)
    
    db.commit()
    return mock_test


@router.get("/", response_model=List[schemas.MockTestResponse])
def get_available_mock_tests(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Get all available mock tests.
    """
    tests = db.query(models.MockTest).offset(skip).limit(limit).all()
    return tests


@router.get("/{test_id}/start")
def start_mock_test(
    test_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Start a mock test - returns questions and creates an attempt record.
    """
    mock_test = db.query(models.MockTest).filter(models.MockTest.id == test_id).first()
    if not mock_test:
        raise HTTPException(status_code=404, detail="Mock test not found")

    # Get all questions for this test
    test_questions = db.query(models.MockTestQuestion).filter(
        models.MockTestQuestion.mock_test_id == test_id
    ).order_by(models.MockTestQuestion.question_order).all()

    if not test_questions:
        raise HTTPException(status_code=404, detail="No questions in this test")

    # Create attempt record
    attempt = models.MockTestAttempt(
        user_id=current_user.id,
        mock_test_id=test_id,
        started_at=datetime.now(timezone.utc),
        total_questions=len(test_questions),
        score=0,
        correct_answers=0,
        incorrect_answers=0,
        unattempted=len(test_questions)
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    # Prepare questions (without correct answers)
    questions = []
    for tq in test_questions:
        question = db.query(models.Question).filter(models.Question.id == tq.question_id).first()
        if question:
            options = db.query(models.QuestionOption).filter(
                models.QuestionOption.question_id == question.id
            ).all()
            questions.append(schemas.QuestionWithOptions(
                id=question.id,
                topic_id=question.topic_id,
                question_text=question.question_text,
                difficulty=question.difficulty,
                marks=question.marks,
                options=[schemas.QuestionOptionResponse(
                    id=opt.id,
                    option_text=opt.option_text,
                    option_label=opt.option_label
                ) for opt in options]
            ))

    return {
        "attempt_id": attempt.id,
        "mock_test": {
            "id": mock_test.id,
            "name": mock_test.name,
            "description": mock_test.description,
            "test_type": mock_test.test_type,
            "duration_minutes": mock_test.duration_minutes,
            "total_marks": mock_test.total_marks,
            "negative_marking": mock_test.negative_marking
        },
        "started_at": attempt.started_at,
        "total_questions": len(questions),
        "questions": questions
    }


@router.post("/attempt/{attempt_id}/submit")
def submit_mock_test(
    attempt_id: int,
    answers: List[schemas.AnswerSubmission],
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Submit a complete mock test with all answers.
    Calculates score and returns detailed results.
    """
    attempt = db.query(models.MockTestAttempt).filter(
        models.MockTestAttempt.id == attempt_id,
        models.MockTestAttempt.user_id == current_user.id
    ).first()

    if not attempt:
        raise HTTPException(status_code=404, detail="Test attempt not found")

    if attempt.completed_at:
        raise HTTPException(status_code=400, detail="Test already submitted")

    # Process each answer
    correct_count = 0
    incorrect_count = 0
    unattempted_count = 0
    total_score = 0.0

    answer_dict = {a.question_id: a for a in answers}

    # Get the mock test to get negative marking
    mock_test = db.query(models.MockTest).filter(models.MockTest.id == attempt.mock_test_id).first()
    negative_marking = mock_test.negative_marking if mock_test else 0.25

    # Get all questions in this test
    test_questions = db.query(models.MockTestQuestion).filter(
        models.MockTestQuestion.mock_test_id == attempt.mock_test_id
    ).all()

    for tq in test_questions:
        question = db.query(models.Question).filter(models.Question.id == tq.question_id).first()
        if not question:
            continue

        answer = answer_dict.get(question.id)
        selected_option = answer.selected_option if answer else None
        time_taken = answer.time_taken_seconds if answer else None

        # Get correct option
        correct_option_obj = db.query(models.QuestionOption).filter(
            models.QuestionOption.question_id == question.id,
            models.QuestionOption.is_correct == 1
        ).first()

        if not correct_option_obj:
            continue

        is_correct = selected_option == correct_option_obj.option_label if selected_option else False

        # Save question attempt
        question_attempt = models.QuestionAttempt(
            user_id=current_user.id,
            question_id=question.id,
            mock_test_attempt_id=attempt.id,
            selected_option=selected_option,
            is_correct=is_correct if selected_option else None,
            time_taken_seconds=time_taken
        )
        db.add(question_attempt)

        # Update counts
        if not selected_option:
            unattempted_count += 1
        elif is_correct:
            correct_count += 1
            total_score += float(question.marks)
        else:
            incorrect_count += 1
            total_score -= float(negative_marking)

    # Update attempt
    attempt.completed_at = datetime.now(timezone.utc)
    attempt.correct_answers = correct_count
    attempt.incorrect_answers = incorrect_count
    attempt.unattempted = unattempted_count
    attempt.score = total_score
    if attempt.started_at:
        time_diff = attempt.completed_at.replace(tzinfo=None) - attempt.started_at.replace(tzinfo=None)
        attempt.total_time_seconds = int(time_diff.total_seconds())

    db.commit()
    db.refresh(attempt)

    # Calculate accuracy
    attempted = correct_count + incorrect_count
    accuracy = (correct_count / attempted * 100) if attempted > 0 else 0.0

    return {
        "attempt_id": attempt.id,
        "score": total_score,
        "total_marks": db.query(models.MockTest).filter(models.MockTest.id == attempt.mock_test_id).first().total_marks,
        "total_questions": attempt.total_questions,
        "correct_answers": correct_count,
        "incorrect_answers": incorrect_count,
        "unattempted": unattempted_count,
        "accuracy": round(accuracy, 2),
        "total_time_seconds": attempt.total_time_seconds
    }


@router.get("/attempts")
def get_user_attempts(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get all mock test attempts for the current user.
    """
    attempts = db.query(models.MockTestAttempt).filter(
        models.MockTestAttempt.user_id == current_user.id
    ).order_by(models.MockTestAttempt.started_at.desc()).all()

    result = []
    for attempt in attempts:
        mock_test = db.query(models.MockTest).filter(models.MockTest.id == attempt.mock_test_id).first()
        result.append({
            "attempt_id": attempt.id,
            "mock_test_id": attempt.mock_test_id,
            "mock_test_name": mock_test.name if mock_test else "Unknown",
            "started_at": attempt.started_at,
            "completed_at": attempt.completed_at,
            "score": attempt.score,
            "total_questions": attempt.total_questions,
            "correct_answers": attempt.correct_answers,
            "incorrect_answers": attempt.incorrect_answers,
            "unattempted": attempt.unattempted
        })

    return result


@router.get("/result/{attempt_id}")
def get_mock_test_result(
    attempt_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed result for a specific mock test attempt.
    """
    attempt = db.query(models.MockTestAttempt).filter(
        models.MockTestAttempt.id == attempt_id,
        models.MockTestAttempt.user_id == current_user.id
    ).first()

    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    if not attempt.completed_at:
        raise HTTPException(status_code=400, detail="Test not yet submitted")

    mock_test = db.query(models.MockTest).filter(models.MockTest.id == attempt.mock_test_id).first()

    # Get all question attempts with correct answers
    question_attempts = db.query(models.QuestionAttempt).filter(
        models.QuestionAttempt.mock_test_attempt_id == attempt_id
    ).all()

    questions_data = []
    for qa in question_attempts:
        question = db.query(models.Question).filter(models.Question.id == qa.question_id).first()
        if not question:
            continue

        options = db.query(models.QuestionOption).filter(
            models.QuestionOption.question_id == question.id
        ).all()

        correct_option_obj = next((opt for opt in options if opt.is_correct), None)
        correct_label = correct_option_obj.option_label if correct_option_obj else None

        questions_data.append({
            "id": question.id,
            "topic_id": question.topic_id,
            "question_text": question.question_text,
            "difficulty": question.difficulty,
            "marks": question.marks,
            "options": [{"id": opt.id, "option_text": opt.option_text, "option_label": opt.option_label} for opt in options],
            "explanation": question.explanation,
            "correct_option": correct_label,
            "user_answer": qa.selected_option,
            "is_correct": qa.is_correct,
            "time_taken_seconds": qa.time_taken_seconds
        })

    # Calculate accuracy
    attempted = attempt.correct_answers + attempt.incorrect_answers
    accuracy = (attempt.correct_answers / attempted * 100) if attempted > 0 else 0.0

    return {
        "attempt_id": attempt.id,
        "mock_test_id": attempt.mock_test_id,
        "mock_test_name": mock_test.name if mock_test else "Unknown",
        "score": attempt.score,
        "total_marks": mock_test.total_marks if mock_test else 0,
        "negative_marking": mock_test.negative_marking if mock_test else 0.25,
        "total_questions": attempt.total_questions,
        "correct_answers": attempt.correct_answers,
        "incorrect_answers": attempt.incorrect_answers,
        "unattempted": attempt.unattempted,
        "accuracy": round(accuracy, 2),
        "total_time_seconds": attempt.total_time_seconds,
        "questions": questions_data
    }
@router.post("/", response_model=schemas.MockTestResponse)
def create_mock_test(
    data: schemas.MockTestCreate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin_user)
):
    """
    Create a new empty mock test (Admin only).
    """
    mock_test = models.MockTest(**data.model_dump())
    db.add(mock_test)
    db.commit()
    db.refresh(mock_test)
    return mock_test

@router.put("/{test_id}", response_model=schemas.MockTestResponse)
def update_mock_test(
    test_id: int,
    data: schemas.MockTestUpdate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin_user)
):
    """
    Update an existing mock test metadata (Admin only).
    """
    mock_test = db.query(models.MockTest).filter(models.MockTest.id == test_id).first()
    if not mock_test:
        raise HTTPException(status_code=404, detail="Mock test not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(mock_test, field, value)

    db.commit()
    db.refresh(mock_test)
    return mock_test

@router.delete("/{test_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mock_test(
    test_id: int,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin_user)
):
    """
    Delete a mock test (Admin only).
    """
    mock_test = db.query(models.MockTest).filter(models.MockTest.id == test_id).first()
    if not mock_test:
        raise HTTPException(status_code=404, detail="Mock test not found")

    db.delete(mock_test)
    db.commit()
    return None
