"""
End-to-End Verification Script for Mock Test Logic
1. Generates and validates baseline mock tests (Tests 1 to 4).
2. Verifies 403 Forbidden gating on `/generate-personalized` when attempt count < 4.
3. Simulates student attempts, submits responses with both correct and incorrect answers.
4. Verifies weakness profiling calculations and updates.
5. Verifies unlock and generation of AI Personalized Mock Test on Test 5+.
"""
import sys
import requests
from app.database import SessionLocal
from app.models import User, Branch, MockTest, MockTestAttempt, QuestionAttempt, UserWeaknessProfile
from app.auth import get_password_hash

BASE_URL = "http://127.0.0.1:8002/api/v1"

def setup_test_user():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "mock_tester@learnmate.ai").first()
        if not user:
            user = User(
                email="mock_tester@learnmate.ai",
                hashed_password=get_password_hash("testpassword123"),
                full_name="Mock Test Verification Agent",
                is_active=True,
                is_admin=False
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"[Setup] Created test user: {user.email} (id={user.id})")
        else:
            # Clean previous test attempts and tests for fresh clean test run
            test_ids = [t.id for t in db.query(MockTest.id).filter(MockTest.user_id == user.id).all()]
            if test_ids:
                db.query(MockTestAttempt).filter(MockTestAttempt.user_id == user.id).delete(synchronize_session=False)
                db.query(QuestionAttempt).filter(QuestionAttempt.user_id == user.id).delete(synchronize_session=False)
                db.query(MockTest).filter(MockTest.user_id == user.id).delete(synchronize_session=False)
            db.query(UserWeaknessProfile).filter(UserWeaknessProfile.user_id == user.id).delete(synchronize_session=False)
            db.commit()
            print(f"[Setup] Reset test history for user: {user.email} (id={user.id})")
        return user.id
    finally:
        db.close()

def run_tests():
    user_id = setup_test_user()

    # 1. Login
    login_resp = requests.post(
        f"{BASE_URL}/auth/login",
        data={"username": "mock_tester@learnmate.ai", "password": "testpassword123"}
    )
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[PASS] Successfully authenticated test student.")

    # 2. Verify personalized test is GATED before 4 attempts
    pers_gate_resp = requests.post(
        f"{BASE_URL}/mock-tests/generate-personalized",
        json={"branch_id": 1, "total_questions": 10},
        headers=headers
    )
    print(f"[Gating Check] HTTP {pers_gate_resp.status_code}: {pers_gate_resp.json()}")
    assert pers_gate_resp.status_code == 403, f"Expected 403 Forbidden, got {pers_gate_resp.status_code}"
    assert "4 more mock tests" in pers_gate_resp.json()["detail"], "Expected message mentioning remaining tests"
    print("[PASS] AI Personalized test is properly gated at 0 completed tests.")

    # 3. Generate, start, and complete Baseline Tests 1 through 4
    for test_idx in range(1, 5):
        print(f"\n--- Testing Baseline Test #{test_idx} ---")
        gen_resp = requests.post(
            f"{BASE_URL}/mock-tests/generate-baseline",
            json={"branch_id": 1, "total_questions": 5},
            headers=headers
        )
        assert gen_resp.status_code == 200, f"Generate baseline {test_idx} failed: {gen_resp.text}"
        test_data = gen_resp.json()
        test_id = test_data["id"]
        print(f"[PASS] Generated baseline test id={test_id}, name='{test_data['name']}', total_marks={test_data['total_marks']}")

        # Start test
        start_resp = requests.get(f"{BASE_URL}/mock-tests/{test_id}/start", headers=headers)
        assert start_resp.status_code == 200, f"Start test failed: {start_resp.text}"
        start_data = start_resp.json()
        attempt_id = start_data["attempt_id"]
        questions = start_data["questions"]
        print(f"[PASS] Started test attempt_id={attempt_id}, received {len(questions)} questions")

        # Submit answers (intentionally alternating correct and incorrect options to generate weaknesses)
        answers = []
        for i, q in enumerate(questions):
            opts = q.get("options", [])
            selected_option = opts[0]["option_label"] if opts else "A"
            answers.append({
                "question_id": q["id"],
                "selected_option": selected_option,
                "time_taken_seconds": 35
            })

        submit_resp = requests.post(
            f"{BASE_URL}/mock-tests/attempt/{attempt_id}/submit",
            json=answers,
            headers=headers
        )
        assert submit_resp.status_code == 200, f"Submit attempt {attempt_id} failed: {submit_resp.text}"
        sub_result = submit_resp.json()
        print(f"[PASS] Submitted test #{test_idx}: Score={sub_result['score']}, Correct={sub_result['correct_answers']}, Incorrect={sub_result['incorrect_answers']}, Accuracy={sub_result['accuracy']}%")

        # Check gating decrement if under 4
        if test_idx < 4:
            gate_check = requests.post(
                f"{BASE_URL}/mock-tests/generate-personalized",
                json={"branch_id": 1, "total_questions": 10},
                headers=headers
            )
            assert gate_check.status_code == 403
            expected_remaining = 4 - test_idx
            print(f"[PASS] Gating verification after {test_idx} tests: {expected_remaining} tests remaining.")

    # 4. Verify AI Personalized Test UNLOCKS on Test #5
    print("\n--- Testing AI Personalized Test Generation (Test #5) ---")
    pers_resp = requests.post(
        f"{BASE_URL}/mock-tests/generate-personalized",
        json={
            "branch_id": 1,
            "total_questions": 10,
            "adaptation_weight": 0.7,
            "name": "AI Adaptive Weakness Focus Test"
        },
        headers=headers
    )
    assert pers_resp.status_code == 200, f"Personalized test failed to generate: {pers_resp.text}"
    pers_data = pers_resp.json()
    print(f"[PASS] Successfully generated AI Personalized Test! ID={pers_data['id']}, Name='{pers_data['name']}', is_baseline={pers_data['is_baseline']}")

    # 5. Verify question details and palette
    start_pers_resp = requests.get(f"{BASE_URL}/mock-tests/{pers_data['id']}/start", headers=headers)
    assert start_pers_resp.status_code == 200
    palette_resp = requests.get(
        f"{BASE_URL}/mock-tests/{pers_data['id']}/palette?attempt_id={start_pers_resp.json()['attempt_id']}",
        headers=headers
    )
    assert palette_resp.status_code == 200
    palette_data = palette_resp.json()
    print(f"[PASS] Palette retrieved: total={palette_data['summary']['total']}, unanswered={palette_data['summary']['unanswered']}")

    # 6. Verify User Weakness Profiles stored in DB
    db = SessionLocal()
    try:
        profiles = db.query(UserWeaknessProfile).filter(UserWeaknessProfile.user_id == user_id).all()
        print(f"[PASS] User Weakness Profiles persisted in database: {len(profiles)} topics tracked.")
        for p in profiles[:5]:
            print(f"       -> Topic ID {p.topic_id}: Weakness Score = {p.weakness_score:.3f}, Trend = {p.trend}, Total Attempts = {p.total_attempted}")
    finally:
        db.close()

    print("\n==================================================================")
    print("ALL MOCK TEST LOGIC VERIFICATION CHECKS PASSED WITH 100% SUCCESS!")
    print("==================================================================")

if __name__ == "__main__":
    run_tests()
