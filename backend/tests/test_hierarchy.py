import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_get_exams():
    res = client.get("/api/v1/exams/")
    assert res.status_code == 200
    data = res.json()
    assert len(data) > 0
    # V1 targets SSC JE Civil specifically.
    assert data[0]["name"].startswith("SSC JE")

def test_get_exam_by_id():
    res = client.get("/api/v1/exams/")
    exam_id = res.json()[0]["id"]

    res = client.get(f"/api/v1/exams/{exam_id}")
    assert res.status_code == 200
    assert res.json()["name"].startswith("SSC JE")

def test_get_branches_for_exam():
    res = client.get("/api/v1/exams/")
    exam_id = res.json()[0]["id"]

    res = client.get(f"/api/v1/exams/{exam_id}/branches")
    assert res.status_code == 200
    data = res.json()
    assert len(data) > 0
    assert data[0]["name"] == "Civil Engineering"

def test_get_branches():
    res = client.get("/api/v1/branches/")
    assert res.status_code == 200
    assert len(res.json()) > 0

def test_get_subjects():
    res = client.get("/api/v1/subjects/")
    assert res.status_code == 200
    data = res.json()
    assert len(data) > 0
    assert "chapters" in data[0]

def test_get_subject_by_id():
    res = client.get("/api/v1/subjects/")
    subject_id = res.json()[0]["id"]

    res = client.get(f"/api/v1/subjects/{subject_id}")
    assert res.status_code == 200
    assert "chapters" in res.json()

def test_get_chapters():
    res = client.get("/api/v1/chapters/")
    assert res.status_code == 200
    assert len(res.json()) > 0
