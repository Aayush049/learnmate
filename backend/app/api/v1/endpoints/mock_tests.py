from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func, case
from typing import List, Optional
import random
from datetime import datetime, timezone, timedelta

from app import schemas, models
from app.database import get_db
from app.services.ai_test_generator import generate_personalized_test_distribution, build_mock_test_from_distribution
from app.auth import get_current_active_user, get_current_admin_user, require_active_entitlement
from app.models.user_profile import UserWeaknessProfile
from app.services.diagnostics import evaluate_performance_updates


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
        negative_marking=data.negative_marking,
        created_by_id=current_user.id,
        user_id=current_user.id
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
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get all available mock tests (global ones + user's generated ones).
    """
    tests = db.query(models.MockTest).filter(
        (models.MockTest.created_by_id == None) |
        (models.MockTest.created_by_id == current_user.id) |
        (models.MockTest.user_id == None) |
        (models.MockTest.user_id == current_user.id)
    ).order_by(models.MockTest.id.asc()).offset(skip).limit(limit).all()
    return tests


@router.get("/{test_id}/start")
def start_mock_test(
    test_id: int,
    current_user: models.User = Depends(require_active_entitlement),
    db: Session = Depends(get_db)
):
    """
    Start a mock test - returns questions and creates an attempt record.
    """
    mock_test = db.query(models.MockTest).filter(models.MockTest.id == test_id).first()
    if not mock_test:
        raise HTTPException(status_code=404, detail="Mock test not found")

    # Get total questions without loading them all just to count
    total_questions = db.query(models.MockTestQuestion).filter(
        models.MockTestQuestion.mock_test_id == test_id
    ).count()

    if total_questions == 0:
        raise HTTPException(status_code=404, detail="No questions in this test")

    # Create attempt record FIRST
    attempt = models.MockTestAttempt(
        user_id=current_user.id,
        mock_test_id=test_id,
        started_at=datetime.now(timezone.utc),
        total_questions=total_questions,
        score=0,
        correct_answers=0,
        incorrect_answers=0,
        unattempted=total_questions
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    # NOW fetch questions recursively (AFTER commit, to avoid expire_on_commit invalidating them)
    test_questions = db.query(models.MockTestQuestion)\
        .options(
            selectinload(models.MockTestQuestion.question).selectinload(models.Question.options),
            selectinload(models.MockTestQuestion.question).selectinload(models.Question.topic)
        )\
        .filter(models.MockTestQuestion.mock_test_id == test_id)\
        .order_by(models.MockTestQuestion.question_order).all()

    # Prepare questions (without correct answers)
    questions = []
    for tq in test_questions:
        question = tq.question
        if question:
            options = question.options
            questions.append(schemas.QuestionWithOptions(
                id=question.id,
                topic_id=question.topic_id,
                question_text=question.question_text,
                difficulty=question.difficulty,
                marks=question.marks,
                topic_name=question.topic.name if question.topic else None,
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


def update_user_weakness_cache(user_id: int, attempt_id: int, db: Session = None):
    """
    Asynchronous hydration of UserWeaknessProfile table.
    Updates weakness profiles based on the just-completed test attempt.
    This runs in the background after test submission to avoid blocking the user.
    """
    from app.database import SessionLocal
    own_session = False
    if db is None:
        db = SessionLocal()
        own_session = True

    try:
        # Get all question attempts from this specific test
        question_attempts = (
            db.query(models.QuestionAttempt)
            .join(models.Question)
            .filter(models.QuestionAttempt.mock_test_attempt_id == attempt_id)
            .filter(models.QuestionAttempt.user_id == user_id)
            .all()
        )

        # Group by topic and calculate accuracy for this test
        topic_stats = {}
        for qa in question_attempts:
            topic_id = qa.question.topic_id
            if topic_id not in topic_stats:
                topic_stats[topic_id] = {'total': 0, 'correct': 0}

            topic_stats[topic_id]['total'] += 1
            if qa.is_correct:
                topic_stats[topic_id]['correct'] += 1

        # Update or create UserWeaknessProfile entries
        for topic_id, stats in topic_stats.items():
            if stats['total'] == 0:
                continue

            test_accuracy = stats['correct'] / stats['total']
            test_weakness = 1.0 - test_accuracy

            # Check if profile already exists
            existing_profile = (
                db.query(UserWeaknessProfile)
                .filter(
                    UserWeaknessProfile.user_id == user_id,
                    UserWeaknessProfile.topic_id == topic_id
                )
                .first()
            )

            if existing_profile:
                # Update using exponential moving average
                old_weakness = existing_profile.weakness_score
                new_weakness = (old_weakness * 0.7) + (test_weakness * 0.3)

                # Determine trend
                if new_weakness < old_weakness - 0.05:
                    trend = "improving"
                elif new_weakness > old_weakness + 0.05:
                    trend = "declining"
                else:
                    trend = "stable"

                existing_profile.total_attempted += stats['total']
                existing_profile.total_correct += stats['correct']
                existing_profile.weakness_score = new_weakness
                existing_profile.trend = trend
                existing_profile.last_attempted_at = datetime.now(timezone.utc)
                existing_profile.last_calculated_at = datetime.now(timezone.utc)
            else:
                # Create new profile
                new_profile = UserWeaknessProfile(
                    user_id=user_id,
                    topic_id=topic_id,
                    total_attempted=stats['total'],
                    total_correct=stats['correct'],
                    weakness_score=test_weakness,
                    trend="new",
                    last_attempted_at=datetime.now(timezone.utc),
                    last_calculated_at=datetime.now(timezone.utc)
                )
                db.add(new_profile)

        db.commit()
    except Exception as e:
        # Log error but don't fail the background task
        print(f"Background weakness profile update failed for user {user_id}: {e}")
        db.rollback()
    finally:
        if own_session:
            db.close()


@router.post("/attempt/{attempt_id}/submit")
def submit_mock_test(
    attempt_id: int,
    answers: List[schemas.AnswerSubmission],
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(require_active_entitlement),
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
    test_questions = db.query(models.MockTestQuestion)\
        .options(
            selectinload(models.MockTestQuestion.question).selectinload(models.Question.options),
            selectinload(models.MockTestQuestion.question).selectinload(models.Question.topic)
        )\
        .filter(models.MockTestQuestion.mock_test_id == attempt.mock_test_id)\
        .all()

    for tq in test_questions:
        question = tq.question
        if not question:
            continue

        answer = answer_dict.get(question.id)
        selected_option = answer.selected_option if answer else None
        time_taken = answer.time_taken_seconds if answer else None

        # Get correct option
        correct_option_obj = next((opt for opt in question.options if opt.is_correct == 1), None)

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

    # Evaluate BKT, cognitive load quadrants, and Welford running profile
    try:
        evaluate_performance_updates(db, current_user.id, attempt.id)
    except Exception as e:
        print(f"Diagnostics performance update error: {e}")

    # Trigger background task to update UserWeaknessProfile asynchronously
    background_tasks.add_task(update_user_weakness_cache, current_user.id, attempt.id)

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
    question_attempts = db.query(models.QuestionAttempt)\
        .options(
            selectinload(models.QuestionAttempt.question).selectinload(models.Question.options),
            selectinload(models.QuestionAttempt.question).selectinload(models.Question.topic)
        )\
        .filter(models.QuestionAttempt.mock_test_attempt_id == attempt_id)\
        .all()

    questions_data = []
    for qa in question_attempts:
        question = qa.question
        if not question:
            continue

        options = question.options

        correct_option_obj = next((opt for opt in options if opt.is_correct), None)
        correct_label = correct_option_obj.option_label if correct_option_obj else None

        questions_data.append({
            "id": question.id,
            "topic_id": question.topic_id,
            "question_text": question.question_text,
            "difficulty": question.difficulty,
            "marks": question.marks,
            "topic_name": question.topic.name if question.topic else None,
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


@router.post("/generate-personalized", response_model=schemas.MockTestResponse)
def generate_personalized_mock_test(
    data: schemas.PersonalizedTestRequest,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Generate an AI personalized mock test based on PYQ weightage and user's weakness profile.
    Requires at least 4 completed mock tests to unlock.
    Auto-expires abandoned tests.
    """
    # Check if there are any unfinished AI tests
    unfinished_tests = db.query(models.MockTest).filter(
        (models.MockTest.created_by_id == current_user.id) | (models.MockTest.user_id == current_user.id),
        models.MockTest.is_baseline == False
    ).all()

    for t in unfinished_tests:
        # Check if there's an incomplete attempt
        incomplete_attempt = next(
            (a for a in t.attempts if a.completed_at is None),
            None
        )

        if incomplete_attempt:
            max_duration = timedelta(minutes=t.duration_minutes + 15)
            time_elapsed = datetime.now(timezone.utc) - incomplete_attempt.started_at

            if time_elapsed > max_duration:
                # Auto-expire the attempt
                incomplete_attempt.completed_at = datetime.now(timezone.utc)
                incomplete_attempt.score = 0
                incomplete_attempt.unattempted = incomplete_attempt.total_questions
                db.commit()
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"You have an unfinished test '{t.name}'. Please complete it before generating a new one."
                )

    user_attempts_count = db.query(models.MockTestAttempt).filter(
        models.MockTestAttempt.user_id == current_user.id,
        models.MockTestAttempt.completed_at.isnot(None)
    ).count()

    if user_attempts_count < 4:
        remaining = 4 - user_attempts_count
        raise HTTPException(
            status_code=403,
            detail=f"You have to give {remaining} more mock test{'s' if remaining > 1 else ''} to unlock AI Personalized Tests."
        )

    # 1. Get ideal distribution
    distribution = generate_personalized_test_distribution(
        db=db,
        user_id=current_user.id,
        branch_id=data.branch_id,
        total_questions=data.total_questions,
        adaptation_weight=data.adaptation_weight,
        attempt_count=user_attempts_count
    )

    # 2. Build the test
    mock_test = build_mock_test_from_distribution(
        db=db,
        user_id=current_user.id,
        name=data.name or "AI Personalized Mock Test",
        description=data.description,
        total_questions=data.total_questions,
        distribution=distribution,
        is_baseline=False
    )

    return mock_test


@router.post("/generate-baseline", response_model=schemas.MockTestResponse)
def generate_baseline_mock_test(
    data: schemas.PersonalizedTestRequest,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Generate a baseline PYQ mock test (Mock Test 1 to 4).
    """
    # Check if there are any unfinished baseline tests
    unfinished_tests = db.query(models.MockTest).filter(
        (models.MockTest.created_by_id == current_user.id) | (models.MockTest.user_id == current_user.id),
        models.MockTest.is_baseline == True
    ).all()

    for t in unfinished_tests:
        completed = any(a.completed_at is not None for a in t.attempts)
        if not completed:
            raise HTTPException(
                status_code=400,
                detail="You have an unfinished baseline test. Please complete it before generating the next one."
            )

    user_attempts_count = db.query(models.MockTestAttempt).filter(
        models.MockTestAttempt.user_id == current_user.id,
        models.MockTestAttempt.completed_at.isnot(None)
    ).count()

    test_number = user_attempts_count + 1

    # 1. Get PYQ baseline distribution
    distribution = generate_personalized_test_distribution(
        db=db,
        user_id=current_user.id,
        branch_id=data.branch_id,
        total_questions=data.total_questions,
        adaptation_weight=0.0,  # Enforce 0 adaptation for baseline
        attempt_count=0         # Force attempt_count < 4 logic in inner service
    )

    # 2. Build the test
    test_name = f"Mock Test {test_number}"
    if data.name and data.name != "AI Personalized PYQ Mock Test":
        test_name = data.name

    mock_test = build_mock_test_from_distribution(
        db=db,
        user_id=current_user.id,
        name=test_name,
        description=data.description or f"Standardized PYQ Baseline Test #{test_number}",
        total_questions=data.total_questions,
        distribution=distribution,
        is_baseline=True
    )

    return mock_test
