from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func
from typing import List, Optional
import random

from app import schemas, models
from app.database import get_db
from app.auth import get_current_admin_user, get_current_user_optional
from app.models.attempt import QuestionAttempt


router = APIRouter()

@router.get("/pyq-meta")
def get_pyq_metadata(
    subject_id: Optional[int] = None,
    topic_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get distinct years, shifts, and paper groupings for all authentic PYQs.
    Provides metadata for the PYQ filter frontend.
    """
    query = db.query(
        models.Question.year,
        models.Question.shift,
        func.count(models.Question.id).label("question_count")
    ).filter(models.Question.is_pyq == True)

    if topic_id:
        query = query.filter(models.Question.topic_id == topic_id)
    elif subject_id:
        from app.models.chapter import Chapter
        from app.models.topic import Topic

        chapter_ids = [c.id for c in db.query(Chapter.id).filter(Chapter.subject_id == subject_id).all()]
        topic_ids = [t.id for t in db.query(Topic.id).filter(Topic.chapter_id.in_(chapter_ids if chapter_ids else [-1])).all()]
        query = query.filter(models.Question.topic_id.in_(topic_ids if topic_ids else [-1]))

    results = query.group_by(models.Question.year, models.Question.shift).all()

    papers = []
    years = set()
    shifts = set()

    for r in results:
        if r.year:
            years.add(r.year)
        if r.shift:
            shifts.add(r.shift)

        papers.append({
            "year": r.year,
            "shift": r.shift,
            "count": r.question_count
        })

    return {
        "years": sorted(list(years), reverse=True),
        "shifts": sorted(list(shifts)),
        "papers": sorted(papers, key=lambda x: (x["year"] or 0, x["shift"] or ""), reverse=True)
    }


@router.get("/pyq-index")
def get_pyq_index(
    is_pyq: bool = Query(True, description="Must be true for PYQ index"),
    year: Optional[int] = Query(None, description="PYQ year"),
    shift: Optional[str] = Query(None, description="PYQ shift"),
    db: Session = Depends(get_db),
):
    """Return a lightweight navigator index for a single PYQ paper.

    This endpoint must NOT return full question payloads.
    """

    # For the PYQ navigator index we require a single paper.
    # If year/shift are missing, return empty rather than erroring to keep UI robust.
    if not is_pyq:
        return []

    if year is None or shift is None:
        return []

    # Stable ordering: preserve the existing frontend's question ordering behavior
    # (the bulk endpoint previously had no explicit ORDER BY, which effectively
    # results in primary-key ordering in practice).
    query = (
        db.query(
            models.Question.id.label("id"),
            models.Question.year.label("year"),
            models.Question.shift.label("shift"),
            models.Topic.name.label("topic"),
            models.Subject.name.label("subject"),
        )
        .join(models.Topic, models.Question.topic_id == models.Topic.id)
        .join(models.Chapter, models.Topic.chapter_id == models.Chapter.id)
        .join(models.Subject, models.Chapter.subject_id == models.Subject.id)
        .filter(models.Question.is_pyq == True)
        .filter(models.Question.year == year)
        .filter(models.Question.shift == shift)
        .order_by(models.Question.id.asc())
    )

    rows = query.all()

    # question number / ordering is the 1-based index in the ordered result
    return [
        {
            "id": r.id,
            "number": idx + 1,
            "year": r.year,
            "shift": r.shift,
            "subject": r.subject,
            "topic": r.topic,
        }
        for idx, r in enumerate(rows)
    ]


@router.get("/", response_model=None)
def get_questions(
    topic_id: Optional[int] = None,
    chapter_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    branch_id: Optional[int] = None,
    difficulty: Optional[str] = None,
    is_pyq: Optional[bool] = None,
    year: Optional[int] = None,
    shift: Optional[str] = None,
    limit: int = Query(10, ge=1, le=10000),
    shuffle: bool = False,
    db: Session = Depends(get_db)
):
    import time
    t0 = time.time()

    # Eagerly load options, topic → chapter → subject in two SQL statements
    # (selectinload for options avoids N+1; joinedload for topic chain is one JOIN)
    query = db.query(models.Question).options(
        selectinload(models.Question.options),
        joinedload(models.Question.topic)
            .joinedload(models.Topic.chapter)
            .joinedload(models.Chapter.subject)
    )

    if topic_id:
        query = query.filter(models.Question.topic_id == topic_id)
    elif chapter_id:
        topic_ids = [t.id for t in db.query(models.Topic.id).filter(models.Topic.chapter_id == chapter_id).all()]
        query = query.filter(models.Question.topic_id.in_(topic_ids if topic_ids else [-1]))
    elif subject_id:
        chapter_ids = [c.id for c in db.query(models.Chapter.id).filter(models.Chapter.subject_id == subject_id).all()]
        topic_ids = [t.id for t in db.query(models.Topic.id).filter(models.Topic.chapter_id.in_(chapter_ids if chapter_ids else [-1])).all()]
        query = query.filter(models.Question.topic_id.in_(topic_ids if topic_ids else [-1]))
    elif branch_id:
        subject_ids = [s.id for s in db.query(models.Subject.id).filter(models.Subject.branch_id == branch_id).all()]
        chapter_ids = [c.id for c in db.query(models.Chapter.id).filter(models.Chapter.subject_id.in_(subject_ids if subject_ids else [-1])).all()]
        topic_ids = [t.id for t in db.query(models.Topic.id).filter(models.Topic.chapter_id.in_(chapter_ids if chapter_ids else [-1])).all()]
        query = query.filter(models.Question.topic_id.in_(topic_ids if topic_ids else [-1]))

    if difficulty:
        query = query.filter(models.Question.difficulty == difficulty)

    if is_pyq is not None:
        query = query.filter(models.Question.is_pyq == is_pyq)

    if year:
        query = query.filter(models.Question.year == year)

    if shift:
        query = query.filter(models.Question.shift == shift)

    t1 = time.time()
    if shuffle:
        questions = query.all()
        random.shuffle(questions)
        questions = questions[:limit]
    else:
        questions = query.limit(limit).all()

    t2 = time.time()

    def difficulty_to_str(difficulty):
        # Pydantic enums expose `.value`; plain strings pass through unchanged.
        return getattr(difficulty, "value", difficulty)

    payload = [
        {
            "id": q.id,
            "topic_id": q.topic_id,
            "question_text": q.question_text,
            "difficulty": difficulty_to_str(q.difficulty),
            "marks": q.marks,
            "is_pyq": bool(q.is_pyq),
            "year": q.year,
            "shift": q.shift,
            "source": q.source,
            "topic_name": q.topic.name if q.topic else None,
            "subject_name": (
                q.topic.chapter.subject.name
                if q.topic and q.topic.chapter and q.topic.chapter.subject
                else None
            ),
            "options": [
                {
                    "id": opt.id,
                    "option_text": opt.option_text,
                    "option_label": opt.option_label,
                }
                for opt in q.options
            ],
        }
        for q in questions
    ]
    t3 = time.time()

    print(
        f"DEBUG TIMING - Setup: {t1-t0:.4f}s | DB execution: {t2-t1:.4f}s | Dict mapping: {t3-t2:.4f}s | Count: {len(payload)}"
    )

    # We return a plain JSON-serializable payload to avoid FastAPI response_model overhead.
    return JSONResponse(content=payload)

@router.get("/{question_id}", response_model=schemas.QuestionDetail)
def get_question_detail(
    question_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a single question with all details including correct answer and explanation.
    """
    question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    options = db.query(models.QuestionOption).filter(
        models.QuestionOption.question_id == question.id
    ).all()

    correct_option = next((opt.option_label for opt in options if opt.is_correct), None)

    return schemas.QuestionDetail(
        id=question.id,
        topic_id=question.topic_id,
        question_text=question.question_text,
        difficulty=question.difficulty,
        marks=question.marks,
        is_pyq=bool(question.is_pyq),
        year=question.year,
        shift=question.shift,
        source=question.source,
        topic_name=question.topic.name if question.topic else None,
        subject_name=question.topic.chapter.subject.name if question.topic and question.topic.chapter and question.topic.chapter.subject else None,
        options=[schemas.QuestionOptionResponse(
            id=opt.id,
            option_text=opt.option_text,
            option_label=opt.option_label
        ) for opt in options],
        explanation=question.explanation,
        correct_option=correct_option or ""
    )

@router.post("/submit", response_model=schemas.AnswerResult)
def submit_answer(
    answer: schemas.AnswerSubmission,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """
    Submit an answer for a question and get the result.
    If authenticated, marks the attempt in the database.
    """
    question = db.query(models.Question).filter(models.Question.id == answer.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    correct_option_obj = db.query(models.QuestionOption).filter(
        models.QuestionOption.question_id == question.id,
        models.QuestionOption.is_correct == 1
    ).first()

    if not correct_option_obj:
        raise HTTPException(status_code=500, detail="Question has no correct answer configured")

    is_correct = answer.selected_option == correct_option_obj.option_label

    if current_user:
        attempt = QuestionAttempt(
            user_id=current_user.id,
            question_id=question.id,
            selected_option=answer.selected_option,
            is_correct=is_correct,
            time_taken_seconds=answer.time_taken_seconds or 15
        )
        db.add(attempt)
        db.commit()

    return schemas.AnswerResult(
        question_id=question.id,
        is_correct=is_correct,
        correct_option=correct_option_obj.option_label,
        explanation=question.explanation,
        selected_option=answer.selected_option,
        time_taken_seconds=answer.time_taken_seconds
    )

@router.post("/", response_model=schemas.QuestionDetail)
def create_question(
    question_in: schemas.QuestionCreate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin_user),
):
    """
    Create a new question with options (Admin only).
    """
    # Create the question
    question_data = question_in.model_dump(exclude={"options"})
    question = models.Question(**question_data)
    db.add(question)
    db.commit()
    db.refresh(question)

    # Create the options
    for opt in question_in.options:
        option = models.QuestionOption(
            question_id=question.id,
            **opt.model_dump()
        )
        db.add(option)
    
    db.commit()
    
    return get_question_detail(question.id, db)

@router.put("/{question_id}", response_model=schemas.QuestionDetail)
def update_question(
    question_id: int,
    question_in: schemas.QuestionUpdate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin_user),
):
    """
    Update a question and its options (Admin only).
    """
    question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    update_data = question_in.model_dump(exclude={"options"}, exclude_unset=True)
    for field, value in update_data.items():
        setattr(question, field, value)
        
    if question_in.options is not None:
        # Delete old options
        db.query(models.QuestionOption).filter(models.QuestionOption.question_id == question_id).delete()
        # Add new options
        for opt in question_in.options:
            option = models.QuestionOption(
                question_id=question.id,
                **opt.model_dump()
            )
            db.add(option)
            
    db.commit()
    return get_question_detail(question.id, db)
    
@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin_user),
):
    """
    Delete a question (Admin only).
    """
    question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    db.delete(question)
    db.commit()
    return None
