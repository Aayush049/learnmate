import pytest
from fastapi.testclient import TestClient
from main import app
from datetime import datetime
import uuid

client = TestClient(app)
from app.database import Base
from app.models import (
    Topic, Subject, Branch, Exam, Question, QuestionOption,
    MockTest, MockTestQuestion, MockTestAttempt, QuestionAttempt, Chapter, User
)


def test_generate_mock_test_admin(admin_token_headers, mock_test_hierarchy, db):
    """Test mock test generation by admin"""
    payload = {
        "name": "Generated Mock Test",
        "description": "Auto-generated test",
        "test_type": "subject_wise",
        "duration_minutes": 90,
        "total_questions": 10,
        "total_marks": 10,
        "negative_marking": 0.25,
        "subject_id": mock_test_hierarchy["subject"].id
    }
    response = client.post(
        "/api/v1/mock-tests/generate",
        json=payload,
        headers=admin_token_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Generated Mock Test"
    assert data["total_marks"] == 10
    assert data["negative_marking"] == 0.25


def test_generate_mock_test_unauthorized(student_token_headers, mock_test_hierarchy):
    """Test that non-admin cannot generate mock tests"""
    payload = {
        "name": "Unauthorized Test",
        "test_type": "full_syllabus",
        "duration_minutes": 60,
        "total_questions": 10,
        "total_marks": 10
    }
    response = client.post(
        "/api/v1/mock-tests/generate",
        json=payload,
        headers=student_token_headers
    )
    assert response.status_code == 403


def test_get_available_mock_tests(sample_mock_test, student_token_headers):
    """Test retrieving list of mock tests"""
    response = client.get("/api/v1/mock-tests/", headers=student_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_start_mock_test(sample_mock_test, student_token_headers):
    """Test starting a mock test"""
    response = client.get(
        f"/api/v1/mock-tests/{sample_mock_test.id}/start",
        headers=student_token_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "attempt_id" in data
    assert data["mock_test"]["id"] == sample_mock_test.id
    assert data["total_questions"] == 10
    assert len(data["questions"]) == 10


def test_start_mock_test_unauthorized(sample_mock_test):
    """Test starting mock test without authentication"""
    response = client.get(f"/api/v1/mock-tests/{sample_mock_test.id}/start")
    assert response.status_code == 401


def test_submit_mock_test(sample_mock_test, student_token_headers, db):
    """Test submitting a complete mock test"""
    # Start test first
    start_response = client.get(
        f"/api/v1/mock-tests/{sample_mock_test.id}/start",
        headers=student_token_headers
    )
    assert start_response.status_code == 200
    attempt_id = start_response.json()["attempt_id"]
    questions = start_response.json()["questions"]

    # Submit answers (5 correct, 3 incorrect, 2 unanswered)
    answers = []
    for i, q in enumerate(questions[:8]):
        answers.append({
            "question_id": q["id"],
            "selected_option": "A" if i < 5 else "B",  # First 5 correct, next 3 wrong
            "time_taken_seconds": 30 + i
        })

    response = client.post(
        f"/api/v1/mock-tests/attempt/{attempt_id}/submit",
        json=answers,
        headers=student_token_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["correct_answers"] == 5
    assert data["incorrect_answers"] == 3
    assert data["unattempted"] == 2
    # Score: 5 correct (5 marks) - 3 incorrect (3 * 0.25 = 0.75 negative) = 4.25
    assert data["score"] == 4.25


def test_submit_mock_test_already_submitted(sample_mock_test, student_token_headers, db):
    """Test that a test cannot be submitted twice"""
    # Start and submit test
    start_response = client.get(
        f"/api/v1/mock-tests/{sample_mock_test.id}/start",
        headers=student_token_headers
    )
    attempt_id = start_response.json()["attempt_id"]

    answers = [{
        "question_id": start_response.json()["questions"][0]["id"],
        "selected_option": "A",
        "time_taken_seconds": 20
    }]

    client.post(
        f"/api/v1/mock-tests/attempt/{attempt_id}/submit",
        json=answers,
        headers=student_token_headers
    )

    # Try to submit again
    response = client.post(
        f"/api/v1/mock-tests/attempt/{attempt_id}/submit",
        json=answers,
        headers=student_token_headers
    )
    assert response.status_code == 400
    assert "already submitted" in response.json()["detail"]


def test_get_user_attempts(sample_mock_test, student_token_headers, db):
    """Test retrieving user's mock test attempts"""
    # Start a test
    client.get(
        f"/api/v1/mock-tests/{sample_mock_test.id}/start",
        headers=student_token_headers
    )

    response = client.get(
        "/api/v1/mock-tests/attempts",
        headers=student_token_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_get_mock_test_result(sample_mock_test, student_token_headers, db):
    """Test retrieving detailed result for a completed test"""
    # Start and submit test
    start_response = client.get(
        f"/api/v1/mock-tests/{sample_mock_test.id}/start",
        headers=student_token_headers
    )
    attempt_id = start_response.json()["attempt_id"]
    questions = start_response.json()["questions"]

    answers = [{
        "question_id": q["id"],
        "selected_option": "A",
        "time_taken_seconds": 25
    } for q in questions[:5]]

    client.post(
        f"/api/v1/mock-tests/attempt/{attempt_id}/submit",
        json=answers,
        headers=student_token_headers
    )

    # Get result
    response = client.get(
        f"/api/v1/mock-tests/result/{attempt_id}",
        headers=student_token_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["attempt_id"] == attempt_id
    assert "questions" in data
    assert len(data["questions"]) == 10


def test_get_result_not_submitted(sample_mock_test, student_token_headers):
    """Test that result is not available before submission"""
    start_response = client.get(
        f"/api/v1/mock-tests/{sample_mock_test.id}/start",
        headers=student_token_headers
    )
    attempt_id = start_response.json()["attempt_id"]

    response = client.get(
        f"/api/v1/mock-tests/result/{attempt_id}",
        headers=student_token_headers
    )
    assert response.status_code == 400
    assert "not yet submitted" in response.json()["detail"]
