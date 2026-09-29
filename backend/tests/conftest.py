import pytest
from httpx import AsyncClient, ASGITransport
import asyncio
from main import app
from app.database import get_db, Base, engine, SessionLocal
from app.auth import create_access_token
from app.models.user import User

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
def db_engine():
    Base.metadata.create_all(bind=engine)
    yield engine

@pytest.fixture
def db(db_engine):
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()

@pytest.fixture
def override_get_db(db):
    def _override():
        yield db
    app.dependency_overrides[get_db] = _override
    yield
    app.dependency_overrides.pop(get_db, None)

import pytest_asyncio

@pytest_asyncio.fixture
async def async_client(override_get_db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

@pytest.fixture
def student_user(db):
    user = db.query(User).filter(User.email == "student_practice@test.com").first()
    if not user:
        user = User(
            email="student_practice@test.com",
            full_name="Student Test",
            hashed_password="fake",
            is_active=True,
            is_admin=False
        )
        db.add(user)
        db.commit()
    return user

@pytest.fixture
def student_token_headers(entitled_student):
    access_token = create_access_token(subject=entitled_student.email)
    return {"Authorization": f"Bearer {access_token}"}


def grant_lifetime_entitlement(db, user):
    """Give a user the V1 'SSC JE Civil Full Access' lifetime entitlement."""
    from app.models.payment import Plan, Entitlement
    from app.services.payment_service import PaymentService

    existing = db.query(Entitlement).filter(
        Entitlement.user_id == user.id,
        Entitlement.status == "active"
    ).first()
    if existing:
        return existing

    plan = db.query(Plan).filter(Plan.code == "lifetime").first()
    if not plan:
        PaymentService.seed_default_plans(db)
        db.commit()
        plan = db.query(Plan).filter(Plan.code == "lifetime").first()

    entitlement = Entitlement(
        user_id=user.id,
        plan_id=plan.id,
        status="active",
        is_lifetime=True,
        expires_at=None,          # NULL == lifetime access, per V1
        granted_by="admin_manual"
    )
    db.add(entitlement)
    db.commit()
    db.refresh(entitlement)
    return entitlement


def revoke_entitlements(db, user):
    """Strip any active entitlement so the access gate rejects this user."""
    from app.models.payment import Entitlement

    for e in db.query(Entitlement).filter(Entitlement.user_id == user.id).all():
        e.status = "revoked"
    db.commit()


@pytest.fixture
def entitled_student(db, student_user):
    """Student holding an active lifetime entitlement (the normal V1 paid user)."""
    grant_lifetime_entitlement(db, student_user)
    return student_user


@pytest.fixture
def unentitled_student(db, student_user):
    """Authenticated student with no commercial entitlement (hits the 403 gate)."""
    revoke_entitlements(db, student_user)
    return student_user


@pytest.fixture
def unentitled_token_headers(unentitled_student):
    access_token = create_access_token(subject=unentitled_student.email)
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture
def admin_user(db):
    user = db.query(User).filter(User.email == "admin_mock@test.com").first()
    if not user:
        user = User(
            email="admin_mock@test.com",
            full_name="Admin Mock",
            hashed_password="fake",
            is_active=True,
            is_admin=True
        )
        db.add(user)
        db.commit()
    return user


@pytest.fixture
def admin_token_headers(admin_user):
    access_token = create_access_token(subject=admin_user.email)
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture
def mock_test_hierarchy(db):
    """Complete hierarchy with questions, shared by the mock test endpoint suites."""
    import uuid
    from app.models import (
        Topic, Subject, Branch, Exam, Question, QuestionOption, Chapter
    )

    exam = db.query(Exam).filter_by(name="Mock Test Exam").first()
    if not exam:
        exam = Exam(name="Mock Test Exam", display_order=1)
        db.add(exam)
        db.commit()

    branch = db.query(Branch).filter_by(name="Mock Test Branch").first()
    if not branch:
        branch = Branch(exam_id=exam.id, name="Mock Test Branch", display_order=1)
        db.add(branch)
        db.commit()

    subject = db.query(Subject).filter_by(name="Mock Test Subject", branch_id=branch.id).first()
    if not subject:
        subject = Subject(branch_id=branch.id, name="Mock Test Subject", display_order=1)
        db.add(subject)
        db.commit()

    chapter = db.query(Chapter).filter_by(name="Mock Test Chapter", subject_id=subject.id).first()
    if not chapter:
        chapter = Chapter(subject_id=subject.id, name="Mock Test Chapter", display_order=1)
        db.add(chapter)
        db.commit()

    topic = db.query(Topic).filter_by(name="Mock Test Topic", chapter_id=chapter.id).first()
    if not topic:
        topic = Topic(chapter_id=chapter.id, name="Mock Test Topic", display_order=1)
        db.add(topic)
        db.commit()

    # Create 15 questions for testing
    questions = []
    run_id = str(uuid.uuid4())[:8]
    for i in range(15):
        q = Question(
            topic_id=topic.id,
            question_text=f"Mock Test Question {i+1} {run_id}",
            explanation=f"Explanation {i+1}",
            difficulty="medium",
            marks=1
        )
        db.add(q)
        db.flush()

        for label in ["A", "B", "C", "D"]:
            db.add(QuestionOption(
                question_id=q.id,
                option_text=f"Option {label} for Q{i+1}",
                option_label=label,
                is_correct=1 if label == "A" else 0
            ))
        questions.append(q)

    db.commit()
    return {
        "exam": exam, "branch": branch, "subject": subject,
        "chapter": chapter, "topic": topic, "questions": questions
    }


@pytest.fixture
def sample_mock_test(db, mock_test_hierarchy):
    """A 10-question mock test reused by the mock test and advanced suites."""
    from app.models import MockTest, MockTestQuestion

    mock_test = MockTest(
        name="Sample Mock Test",
        description="Test for mock test endpoints",
        test_type="full_syllabus",
        duration_minutes=60,
        total_marks=10,
        negative_marking=0.25
    )
    db.add(mock_test)
    db.commit()
    db.refresh(mock_test)

    for order, q in enumerate(mock_test_hierarchy["questions"][:10], start=1):
        db.add(MockTestQuestion(
            mock_test_id=mock_test.id,
            question_id=q.id,
            question_order=order
        ))
    db.commit()
    return mock_test
