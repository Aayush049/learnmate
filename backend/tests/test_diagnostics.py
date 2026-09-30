import pytest
from datetime import datetime, timezone, timedelta
from app.services.diagnostics.bkt_engine import update_bkt
from app.services.diagnostics.tmi_calculator import calculate_time_decayed_accuracy, compute_tmi_score
from app.services.diagnostics.cognitive_profiler import calculate_rti, classify_cognitive_quadrant
from app.services.diagnostics.welford_detector import update_welford_stats, detect_burnout_flag, derive_archetype


def test_bkt_engine_updates():
    p_l0 = 0.10
    # After correct answer, mastery increases
    p_l1 = update_bkt(p_l0, is_correct=True)
    assert p_l1 > p_l0

    # After incorrect answer, mastery drops or remains lower
    p_l2 = update_bkt(p_l1, is_correct=False)
    assert p_l2 < p_l1

    # Check clamped limits
    assert update_bkt(0.99, True) <= 0.99
    assert update_bkt(0.01, False) >= 0.01


def test_tmi_score_computation():
    now = datetime.now(timezone.utc)
    attempts = [
        {"is_correct": True, "timestamp": now - timedelta(days=1)},
        {"is_correct": True, "timestamp": now - timedelta(days=2)},
    ]
    decayed_acc = calculate_time_decayed_accuracy(attempts)
    assert decayed_acc > 0.9

    tmi = compute_tmi_score(bkt_prob=0.8, decayed_accuracy=decayed_acc)
    assert 0.0 <= tmi <= 100.0
    assert tmi > 50.0


def test_rti_and_quadrant_classification():
    # Fast correct -> Fast Master
    rti_fast = calculate_rti(time_taken=25.0, mu_topic=45.0, sigma_topic=15.0)
    assert rti_fast < 0.0
    assert classify_cognitive_quadrant(rti_fast, is_correct=True) == "Fast Master"

    # Slow correct -> Methodical
    rti_slow = calculate_rti(time_taken=65.0, mu_topic=45.0, sigma_topic=15.0)
    assert rti_slow > 0.0
    assert classify_cognitive_quadrant(rti_slow, is_correct=True) == "Methodical"

    # Fast incorrect -> Speed Trap
    assert classify_cognitive_quadrant(-0.8, is_correct=False) == "Speed Trap"

    # Slow incorrect -> High Load
    assert classify_cognitive_quadrant(0.5, is_correct=False) == "High Load"


def test_welford_variance_and_burnout():
    count, mean, m2, var, std = update_welford_stats(0, 0.0, 0.0, 80.0)
    assert count == 1
    assert mean == 80.0
    assert var == 0.0

    count, mean, m2, var, std = update_welford_stats(count, mean, m2, 90.0)
    assert count == 2
    assert mean == 85.0
    assert var > 0.0
    assert std > 0.0

    # Burnout anomaly test: score drops significantly below mean with >= 5 tests
    flag = detect_burnout_flag(
        tests_completed=6,
        running_mean=80.0,
        running_std_dev=10.0,
        latest_score=40.0
    )
    assert flag == "Critical"

    archetype = derive_archetype(tests_completed=5, running_mean=82.0, score_velocity=1.5)
    assert archetype == "The Consistent High-Flyer"
