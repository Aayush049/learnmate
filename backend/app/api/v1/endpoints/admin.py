from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from typing import Dict, Any, Optional

from app.database import get_db
from app.auth import get_current_user
from app.models.user import User
from app.models.question import Question
from app.models.subject import Subject
from app.models.mock_test import MockTest, MockTestQuestion
from app.models.question import QuestionOption

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

    from app.models.attempt import MockTestAttempt

    total_users = db.query(func.count(User.id)).scalar()
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar()
    admin_users = db.query(func.count(User.id)).filter(User.is_admin == True).scalar()
    total_subjects = db.query(func.count(Subject.id)).scalar()
    total_questions = db.query(func.count(Question.id)).scalar()
    total_pyqs = db.query(func.count(Question.id)).filter(Question.is_pyq == True).scalar()
    total_mock_tests = db.query(func.count(MockTest.id)).scalar()
    total_attempts = db.query(func.count(MockTestAttempt.id)).scalar()

    return {
        "total_users": total_users or 0,
        "active_users": active_users or 0,
        "admin_users": admin_users or 0,
        "active_exams": total_subjects or 0, # Mapping subjects as active exams or similar
        "questions_bank": total_questions or 0,
        "pyq_count": total_pyqs or 0,
        "mock_tests": total_mock_tests or 0,
        "total_test_attempts": total_attempts or 0
    }


@router.get("/recent-activity")
def get_recent_activity(
    limit: int = 10,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Latest completed mock test attempts across all students, for the dashboard feed."""
    from app.models.attempt import MockTestAttempt

    limit = max(1, min(limit, 50))

    rows = (
        db.query(
            MockTestAttempt.id,
            MockTestAttempt.score,
            MockTestAttempt.total_questions,
            MockTestAttempt.correct_answers,
            MockTestAttempt.completed_at,
            MockTestAttempt.started_at,
            MockTest.name.label("test_name"),
            User.full_name,
            User.email,
        )
        .join(MockTest, MockTestAttempt.mock_test_id == MockTest.id)
        .join(User, MockTestAttempt.user_id == User.id)
        .filter(MockTestAttempt.completed_at.isnot(None))
        .order_by(MockTestAttempt.completed_at.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "attempt_id": r.id,
            "test_name": r.test_name,
            "user_name": r.full_name,
            "user_email": r.email,
            "score": r.score,
            "total_questions": r.total_questions,
            "correct_answers": r.correct_answers,
            "accuracy": round((r.correct_answers / r.total_questions) * 100, 1)
            if r.total_questions
            else 0.0,
            "completed_at": r.completed_at,
            "started_at": r.started_at,
        }
        for r in rows
    ]

from app.schemas.user import UserResponse
from fastapi import status

@router.get("/users")
def get_all_users(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = 1,
    page_size: int = 20,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Paginated, searchable user directory for admin."""
    from app.models.attempt import MockTestAttempt

    page = max(1, page)
    page_size = max(1, min(page_size, 100))

    query = db.query(User)

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(or_(User.full_name.ilike(term), User.email.ilike(term)))

    if status_filter == "active":
        query = query.filter(User.is_active == True)  # noqa: E712
    elif status_filter == "disabled":
        query = query.filter(User.is_active == False)  # noqa: E712
    elif status_filter == "admin":
        query = query.filter(User.is_admin == True)  # noqa: E712
    elif status_filter == "student":
        query = query.filter(User.is_admin == False)  # noqa: E712

    total = query.with_entities(func.count(User.id)).scalar() or 0

    sort_column = {
        "created_at": User.created_at,
        "full_name": User.full_name,
        "email": User.email,
    }.get(sort_by, User.created_at)
    order = sort_column.asc() if sort_order == "asc" else sort_column.desc()

    attempt_counts = (
        db.query(
            MockTestAttempt.user_id.label("user_id"),
            func.count(MockTestAttempt.id).label("total"),
        )
        .group_by(MockTestAttempt.user_id)
        .subquery()
    )

    users = (
        query.outerjoin(attempt_counts, attempt_counts.c.user_id == User.id)
        .add_columns(func.coalesce(attempt_counts.c.total, 0).label("total_attempts"))
        .order_by(order)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    # add_columns() makes each row a (User, total_attempts) tuple, not a User.
    items = [
        {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
            "created_at": user.created_at,
            "total_attempts": total_attempts,
        }
        for user, total_attempts in users
    ]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }

from pydantic import BaseModel

class UserStatusUpdate(BaseModel):
    is_active: bool

@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    status_update: UserStatusUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Toggle a user's active status."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_admin:
        raise HTTPException(status_code=400, detail="Cannot modify admin status directly")

    user.is_active = status_update.is_active
    db.commit()
    return {"status": "success", "is_active": user.is_active}

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


# ── Question Bank ────────────────────────────────────────────────────────────

OPTION_LABELS = ("A", "B", "C", "D", "E", "F")


def _topic_ids_for(db: Session, subject_id=None, chapter_id=None, topic_id=None):
    """Resolve a question-bank scope filter down to a list of topic ids."""
    from app.models.topic import Topic
    from app.models.chapter import Chapter

    if topic_id:
        return [topic_id]
    if chapter_id:
        return [t for (t,) in db.query(Topic.id).filter(Topic.chapter_id == chapter_id).all()]
    if subject_id:
        chapter_ids = [
            c for (c,) in db.query(Chapter.id).filter(Chapter.subject_id == subject_id).all()
        ]
        if not chapter_ids:
            return []
        return [t for (t,) in db.query(Topic.id).filter(Topic.chapter_id.in_(chapter_ids)).all()]
    return None


@router.get("/questions")
def list_questions(
    search: Optional[str] = None,
    subject_id: Optional[int] = None,
    chapter_id: Optional[int] = None,
    topic_id: Optional[int] = None,
    difficulty: Optional[str] = None,
    is_pyq: Optional[bool] = None,
    year: Optional[int] = None,
    shift: Optional[str] = None,
    page: int = 1,
    page_size: int = 25,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Paginated question bank with server-side search and filters.

    Only the requested page is loaded; options are counted with a subquery so
    the list payload stays small.
    """
    from app.models.topic import Topic

    page = max(1, page)
    page_size = max(1, min(page_size, 100))

    query = db.query(Question).options(joinedload(Question.topic))

    scoped_topic_ids = _topic_ids_for(db, subject_id, chapter_id, topic_id)
    if scoped_topic_ids is not None:
        if not scoped_topic_ids:
            return {
                "items": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "total_pages": 0,
            }
        query = query.filter(Question.topic_id.in_(scoped_topic_ids))

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(Question.question_text.ilike(term))

    if difficulty:
        query = query.filter(Question.difficulty == difficulty)

    if is_pyq is not None:
        query = query.filter(Question.is_pyq == is_pyq)

    if year:
        query = query.filter(Question.year == year)

    if shift:
        query = query.filter(Question.shift == shift)

    total = query.with_entities(func.count(Question.id)).scalar() or 0

    option_counts = (
        db.query(
            QuestionOption.question_id.label("question_id"),
            func.count(QuestionOption.id).label("option_count"),
        )
        .group_by(QuestionOption.question_id)
        .subquery()
    )

    rows = (
        query.outerjoin(option_counts, option_counts.c.question_id == Question.id)
        .add_columns(func.coalesce(option_counts.c.option_count, 0).label("option_count"))
        .order_by(Question.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    # add_columns() makes each row a (Question, option_count) tuple, not a Question.
    items = [
        {
            "id": question.id,
            "topic_id": question.topic_id,
            "question_text": question.question_text,
            "explanation": question.explanation,
            "difficulty": getattr(question.difficulty, "value", question.difficulty),
            "marks": question.marks,
            "is_pyq": bool(question.is_pyq),
            "year": question.year,
            "shift": question.shift,
            "source": question.source,
            "topic_name": question.topic.name if question.topic else None,
            "option_count": option_count,
        }
        for question, option_count in rows
    ]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("/questions/import/validate")
def validate_question_import(
    payload: Dict[str, Any],
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Structurally validate a batch of questions without writing anything.

    Returns per-row errors so the admin can review and fix before committing.
    """
    raw_items = payload.get("questions")
    if not isinstance(raw_items, list):
        raise HTTPException(status_code=400, detail="'questions' must be a list")

    default_topic_id = payload.get("topic_id")

    from app.models.topic import Topic as TopicModel
    valid_topic_ids = {t for (t,) in db.query(TopicModel.id).all()}

    results = []
    for index, item in enumerate(raw_items):
        errors: list = []

        if not isinstance(item, dict):
            results.append(
                {"index": index, "valid": False, "errors": ["Entry is not a JSON object"]}
            )
            continue

        text = (item.get("question_text") or "").strip()
        if not text:
            errors.append("Missing 'question_text'")

        resolved_topic_id = item.get("topic_id", default_topic_id)
        if resolved_topic_id is None:
            errors.append("Missing 'topic_id'")
        elif not isinstance(resolved_topic_id, int) or resolved_topic_id not in valid_topic_ids:
            errors.append(f"Unknown topic_id: {resolved_topic_id}")

        difficulty = item.get("difficulty", "medium")
        if difficulty not in ("easy", "medium", "hard"):
            errors.append(f"Invalid difficulty: {difficulty!r} (expected easy/medium/hard)")

        options = item.get("options")
        option_map: dict = {}
        if not isinstance(options, dict) or not options:
            errors.append("'options' must be a non-empty object keyed by option label")
        else:
            for label, opt_text in options.items():
                if label not in OPTION_LABELS:
                    errors.append(f"Invalid option label {label!r} (expected one of A-F)")
                if not str(opt_text or "").strip():
                    errors.append(f"Option {label} has empty text")
                option_map[label] = str(opt_text or "")

        correct = item.get("correct_answer")
        if not correct:
            errors.append("Missing 'correct_answer'")
        elif options and correct not in option_map:
            errors.append(f"correct_answer {correct!r} does not match any option key")

        if len(option_map) < 2:
            errors.append("A question needs at least 2 options")

        results.append(
            {
                "index": index,
                "valid": not errors,
                "errors": errors,
                "preview": text[:160] or None,
            }
        )

    valid_count = sum(1 for r in results if r["valid"])
    return {
        "total": len(results),
        "valid_count": valid_count,
        "invalid_count": len(results) - valid_count,
        "results": results,
    }


@router.post("/questions/import")
def import_questions(
    payload: Dict[str, Any],
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Insert a batch of validated questions. Invalid rows are skipped and reported."""
    raw_items = payload.get("questions")
    if not isinstance(raw_items, list):
        raise HTTPException(status_code=400, detail="'questions' must be a list")

    from app.models.topic import Topic as TopicModel

    default_topic_id = payload.get("topic_id")
    valid_topic_ids = {t for (t,) in db.query(TopicModel.id).all()}

    created = 0
    inserted_ids: list = []
    errors: list = []

    for index, item in enumerate(raw_items):
        if not isinstance(item, dict):
            errors.append({"index": index, "error": "Entry is not a JSON object"})
            continue

        text = (item.get("question_text") or "").strip()
        topic_id = item.get("topic_id", default_topic_id)
        options = item.get("options")
        correct = item.get("correct_answer")
        difficulty = item.get("difficulty", "medium")

        problem = None
        if not text:
            problem = "Missing 'question_text'"
        elif not isinstance(topic_id, int) or topic_id not in valid_topic_ids:
            problem = f"Unknown topic_id: {topic_id}"
        elif difficulty not in ("easy", "medium", "hard"):
            problem = f"Invalid difficulty: {difficulty!r}"
        elif not isinstance(options, dict) or len(options) < 2:
            problem = "'options' must be an object with at least 2 entries"
        elif any(lbl not in OPTION_LABELS for lbl in options):
            problem = "Invalid option label (expected A-F)"
        elif not correct or correct not in options:
            problem = "'correct_answer' must match one of the option keys"

        if problem:
            errors.append({"index": index, "error": problem})
            continue

        question = Question(
            topic_id=topic_id,
            question_text=text,
            explanation=(item.get("explanation") or item.get("solution") or None),
            difficulty=difficulty,
            marks=item.get("marks", 1),
            is_pyq=bool(item.get("is_pyq", False)),
            year=item.get("year"),
            shift=item.get("shift"),
            source=(item.get("source") or None),
        )
        db.add(question)
        db.flush()

        for label, opt_text in options.items():
            db.add(
                QuestionOption(
                    question_id=question.id,
                    option_text=str(opt_text),
                    option_label=label,
                    is_correct=1 if label == correct else 0,
                )
            )

        inserted_ids.append(question.id)
        created += 1

    db.commit()

    return {
        "created": created,
        "skipped": len(errors),
        "question_ids": inserted_ids,
        "errors": errors,
    }


# ── Hierarchy ────────────────────────────────────────────────────────────────

@router.get("/hierarchy/tree")
def get_hierarchy_tree(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Full exam → subject → chapter → topic tree with item and question counts."""
    from app.models.branch import Branch
    from app.models.chapter import Chapter
    from app.models.topic import Topic
    from app.models.question import Question as Q

    question_counts = dict(
        db.query(Q.topic_id, func.count(Q.id)).group_by(Q.topic_id).all()
    )

    topics = db.query(Topic).order_by(Topic.display_order, Topic.name).all()
    chapters = db.query(Chapter).order_by(Chapter.display_order, Chapter.name).all()
    subjects = db.query(Subject).order_by(Subject.name).all()
    branches = db.query(Branch).order_by(Branch.name).all()

    topics_by_chapter: dict = {}
    for topic in topics:
        topics_by_chapter.setdefault(topic.chapter_id, []).append(
            {
                "id": topic.id,
                "name": topic.name,
                "description": topic.description,
                "question_count": question_counts.get(topic.id, 0),
            }
        )

    chapters_by_subject: dict = {}
    for chapter in chapters:
        chapter_topics = topics_by_chapter.get(chapter.id, [])
        chapters_by_subject.setdefault(chapter.subject_id, []).append(
            {
                "id": chapter.id,
                "name": chapter.name,
                "description": chapter.description,
                "question_count": sum(t["question_count"] for t in chapter_topics),
                "topics": chapter_topics,
            }
        )

    subjects_by_branch: dict = {}
    for subject in subjects:
        subject_chapters = chapters_by_subject.get(subject.id, [])
        subjects_by_branch.setdefault(subject.branch_id, []).append(
            {
                "id": subject.id,
                "name": subject.name,
                "description": subject.description,
                "question_count": sum(c["question_count"] for c in subject_chapters),
                "chapters": subject_chapters,
            }
        )

    return {
        "branches": [
            {
                "id": branch.id,
                "name": branch.name,
                "description": branch.description,
                "question_count": sum(
                    s["question_count"] for s in subjects_by_branch.get(branch.id, [])
                ),
                "subjects": subjects_by_branch.get(branch.id, []),
            }
            for branch in branches
        ]
    }


# ── Mock Tests ───────────────────────────────────────────────────────────────

@router.get("/mock-tests")
def list_mock_tests(
    search: Optional[str] = None,
    test_type: Optional[str] = None,
    page: int = 1,
    page_size: int = 25,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Paginated mock test list with attempt counts."""
    from app.models.attempt import MockTestAttempt

    page = max(1, page)
    page_size = max(1, min(page_size, 100))

    query = db.query(MockTest)

    if search:
        query = query.filter(MockTest.name.ilike(f"%{search.strip()}%"))

    if test_type:
        query = query.filter(MockTest.test_type == test_type)

    total = query.with_entities(func.count(MockTest.id)).scalar() or 0

    attempt_stats = (
        db.query(
            MockTestAttempt.mock_test_id.label("mock_test_id"),
            func.count(MockTestAttempt.id).label("attempt_count"),
            func.avg(MockTestAttempt.score).label("avg_score"),
        )
        .group_by(MockTestAttempt.mock_test_id)
        .subquery()
    )

    question_counts = dict(
        db.query(MockTestQuestion.mock_test_id, func.count(MockTestQuestion.id))
        .group_by(MockTestQuestion.mock_test_id)
        .all()
    )

    rows = (
        query.outerjoin(attempt_stats, attempt_stats.c.mock_test_id == MockTest.id)
        .add_columns(
            func.coalesce(attempt_stats.c.attempt_count, 0).label("attempt_count"),
            attempt_stats.c.avg_score,
        )
        .order_by(MockTest.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    # add_columns() makes each row a (MockTest, attempt_count, avg_score) tuple.
    items = [
        {
            "id": test.id,
            "name": test.name,
            "description": test.description,
            "test_type": getattr(test.test_type, "value", test.test_type),
            "duration_minutes": test.duration_minutes,
            "total_marks": test.total_marks,
            "negative_marking": test.negative_marking,
            "is_baseline": test.is_baseline,
            "created_at": test.created_at,
            "question_count": question_counts.get(test.id, 0),
            "attempt_count": attempt_count,
            "avg_score": round(avg_score, 2) if avg_score is not None else None,
        }
        for test, attempt_count, avg_score in rows
    ]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("/mock-tests")
def create_mock_test(
    payload: Dict[str, Any],
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Create a mock test shell (metadata). Questions are attached separately."""
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="'name' is required")

    test_type = payload.get("test_type", "full_syllabus")
    valid_types = {"full_syllabus", "subject_wise", "topic_wise", "custom"}
    if test_type not in valid_types:
        raise HTTPException(
            status_code=400, detail=f"Invalid test_type {test_type!r}. Expected one of {sorted(valid_types)}"
        )

    duration = int(payload.get("duration_minutes") or 0)
    if duration <= 0:
        raise HTTPException(status_code=400, detail="'duration_minutes' must be greater than 0")

    test = MockTest(
        name=name,
        description=payload.get("description") or None,
        test_type=test_type,
        duration_minutes=duration,
        total_marks=int(payload.get("total_marks") or 0),
        negative_marking=float(payload.get("negative_marking", 0.25)),
        is_baseline=int(payload.get("is_baseline", 0)),
        user_id=None,  # admin-created tests are global
    )
    db.add(test)
    db.commit()
    db.refresh(test)

    return {
        "id": test.id,
        "name": test.name,
        "test_type": getattr(test.test_type, "value", test.test_type),
        "duration_minutes": test.duration_minutes,
        "total_marks": test.total_marks,
        "negative_marking": test.negative_marking,
        "question_count": 0,
    }


@router.get("/mock-tests/{test_id}")
def get_mock_test(
    test_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Fetch complete mock test metadata and all attached questions in sequence order."""
    from app.models.attempt import MockTestAttempt
    from app.models.chapter import Chapter
    from app.models.topic import Topic

    test = db.query(MockTest).filter(MockTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Mock test not found")

    attempt_stats = (
        db.query(
            func.count(MockTestAttempt.id).label("attempt_count"),
            func.avg(MockTestAttempt.score).label("avg_score"),
        )
        .filter(MockTestAttempt.mock_test_id == test_id)
        .first()
    )
    attempt_count = attempt_stats.attempt_count if attempt_stats else 0
    avg_score = attempt_stats.avg_score if attempt_stats and attempt_stats.avg_score is not None else None

    mock_questions = (
        db.query(MockTestQuestion)
        .filter(MockTestQuestion.mock_test_id == test_id)
        .order_by(MockTestQuestion.question_order.asc())
        .options(
            joinedload(MockTestQuestion.question).joinedload(Question.options),
            joinedload(MockTestQuestion.question)
            .joinedload(Question.topic)
            .joinedload(Topic.chapter)
            .joinedload(Chapter.subject),
        )
        .all()
    )

    questions_data = []
    for mq in mock_questions:
        q = mq.question
        if not q:
            continue
        correct_opt = next((opt.option_label for opt in q.options if opt.is_correct == 1), None)
        options_data = [
            {
                "id": opt.id,
                "label": opt.option_label,
                "text": opt.option_text,
                "is_correct": bool(opt.is_correct),
            }
            for opt in sorted(q.options, key=lambda o: o.option_label)
        ]

        subject_name = (
            q.topic.chapter.subject.name
            if q.topic and q.topic.chapter and q.topic.chapter.subject
            else None
        )
        chapter_name = q.topic.chapter.name if q.topic and q.topic.chapter else None
        topic_name = q.topic.name if q.topic else None

        questions_data.append(
            {
                "id": q.id,
                "mock_test_question_id": mq.id,
                "question_order": mq.question_order,
                "question_text": q.question_text,
                "explanation": q.explanation,
                "difficulty": getattr(q.difficulty, "value", q.difficulty),
                "marks": q.marks,
                "is_pyq": q.is_pyq,
                "year": q.year,
                "shift": q.shift,
                "subject_name": subject_name,
                "chapter_name": chapter_name,
                "topic_name": topic_name,
                "options": options_data,
                "correct_answer": correct_opt,
            }
        )

    return {
        "id": test.id,
        "name": test.name,
        "description": test.description,
        "test_type": getattr(test.test_type, "value", test.test_type),
        "duration_minutes": test.duration_minutes,
        "total_marks": test.total_marks,
        "negative_marking": test.negative_marking,
        "is_baseline": test.is_baseline,
        "created_at": test.created_at,
        "question_count": len(questions_data),
        "attempt_count": attempt_count,
        "avg_score": round(avg_score, 2) if avg_score is not None else None,
        "questions": questions_data,
    }


@router.put("/mock-tests/{test_id}")
def update_mock_test(
    test_id: int,
    payload: Dict[str, Any],
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update mock test metadata."""
    test = db.query(MockTest).filter(MockTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Mock test not found")

    if "name" in payload:
        name = (payload["name"] or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="'name' cannot be empty")
        test.name = name

    if "description" in payload:
        test.description = payload["description"]

    if "test_type" in payload:
        test_type = payload["test_type"]
        valid_types = {"full_syllabus", "subject_wise", "topic_wise", "custom"}
        if test_type not in valid_types:
            raise HTTPException(status_code=400, detail=f"Invalid test_type {test_type!r}")
        test.test_type = test_type

    if "duration_minutes" in payload:
        duration = int(payload["duration_minutes"] or 0)
        if duration <= 0:
            raise HTTPException(status_code=400, detail="'duration_minutes' must be greater than 0")
        test.duration_minutes = duration

    if "total_marks" in payload:
        test.total_marks = int(payload["total_marks"] or 0)

    if "negative_marking" in payload:
        test.negative_marking = float(payload["negative_marking"] or 0.0)

    if "is_baseline" in payload:
        test.is_baseline = int(payload["is_baseline"] or 0)

    db.commit()
    db.refresh(test)

    q_count = (
        db.query(func.count(MockTestQuestion.id))
        .filter(MockTestQuestion.mock_test_id == test.id)
        .scalar()
        or 0
    )

    return {
        "id": test.id,
        "name": test.name,
        "description": test.description,
        "test_type": getattr(test.test_type, "value", test.test_type),
        "duration_minutes": test.duration_minutes,
        "total_marks": test.total_marks,
        "negative_marking": test.negative_marking,
        "is_baseline": test.is_baseline,
        "question_count": q_count,
    }


@router.put("/mock-tests/{test_id}/questions")
def set_mock_test_questions(
    test_id: int,
    payload: Dict[str, Any],
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Replace the entire question set and order for a mock test.
    Payload format:
      { "question_ids": [101, 102, 103, ...], "auto_calculate_marks": true/false }
    """
    test = db.query(MockTest).filter(MockTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Mock test not found")

    question_ids = []
    if "question_ids" in payload and isinstance(payload["question_ids"], list):
        question_ids = [int(qid) for qid in payload["question_ids"] if qid is not None]
    elif "questions" in payload and isinstance(payload["questions"], list):
        sorted_items = sorted(payload["questions"], key=lambda x: x.get("order", 0))
        question_ids = [int(item["question_id"]) for item in sorted_items if "question_id" in item]

    # Validate that all question_ids exist
    if question_ids:
        unique_ids = list(dict.fromkeys(question_ids))
        existing_qs = db.query(Question.id).filter(Question.id.in_(unique_ids)).all()
        existing_ids = {qid for (qid,) in existing_qs}
        missing_ids = [qid for qid in unique_ids if qid not in existing_ids]
        if missing_ids:
            raise HTTPException(
                status_code=400,
                detail=f"Questions with IDs {missing_ids[:5]} do not exist in the Question Bank",
            )

    # Delete existing mappings
    db.query(MockTestQuestion).filter(MockTestQuestion.mock_test_id == test_id).delete(
        synchronize_session=False
    )

    # Bulk create new mappings with sequential 1-based order
    new_links = [
        MockTestQuestion(
            mock_test_id=test_id,
            question_id=qid,
            question_order=idx + 1,
        )
        for idx, qid in enumerate(question_ids)
    ]
    if new_links:
        db.add_all(new_links)

    if payload.get("auto_calculate_marks") and question_ids:
        total_marks = (
            db.query(func.coalesce(func.sum(Question.marks), 0))
            .filter(Question.id.in_(question_ids))
            .scalar()
            or len(question_ids)
        )
        test.total_marks = total_marks

    db.commit()

    return {
        "mock_test_id": test.id,
        "question_count": len(new_links),
        "question_ids": question_ids,
        "total_marks": test.total_marks,
    }


@router.get("/mock-tests/{test_id}/attempts")
def list_mock_test_attempts(
    test_id: int,
    page: int = 1,
    page_size: int = 20,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Retrieve historical user attempts for a given mock test."""
    from app.models.attempt import MockTestAttempt

    test = db.query(MockTest).filter(MockTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Mock test not found")

    page = max(1, page)
    page_size = max(1, min(page_size, 100))

    query = (
        db.query(MockTestAttempt, User)
        .join(User, MockTestAttempt.user_id == User.id)
        .filter(MockTestAttempt.mock_test_id == test_id)
    )

    total = query.with_entities(func.count(MockTestAttempt.id)).scalar() or 0

    rows = (
        query.order_by(MockTestAttempt.started_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [
        {
            "id": attempt.id,
            "user_id": user.id,
            "user_name": user.full_name,
            "user_email": user.email,
            "score": round(attempt.score, 2),
            "total_questions": attempt.total_questions,
            "correct_answers": attempt.correct_answers,
            "incorrect_answers": attempt.incorrect_answers,
            "unattempted": attempt.unattempted,
            "total_time_seconds": attempt.total_time_seconds,
            "started_at": attempt.started_at,
            "completed_at": attempt.completed_at,
        }
        for attempt, user in rows
    ]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if total > 0 else 1,
    }


@router.delete("/mock-tests/{test_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mock_test(
    test_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    test = db.query(MockTest).filter(MockTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Mock test not found")
    db.delete(test)
    db.commit()
    return None
