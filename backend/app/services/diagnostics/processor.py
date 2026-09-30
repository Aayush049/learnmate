"""
Performance & Diagnostics Batch Processor.

Orchestrates post-test and post-practice evaluation:
- BKT Bayesian updates per topic
- Cognitive quadrant accumulation
- Time-decayed accuracy & TMI score recalculation
- Welford running variance and burnout anomaly detection
"""

from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.models.attempt import MockTestAttempt, QuestionAttempt
from app.models.topic_mastery import UserTopicMastery
from app.models.performance_profile import UserPerformanceProfile
from app.models.question import Question
from app.services.diagnostics.bkt_engine import update_bkt
from app.services.diagnostics.cognitive_profiler import calculate_rti, classify_cognitive_quadrant
from app.services.diagnostics.tmi_calculator import calculate_time_decayed_accuracy, compute_tmi_score
from app.services.diagnostics.welford_detector import update_welford_stats, detect_burnout_flag, derive_archetype

def evaluate_performance_updates(db: Session, user_id: int, attempt_id: int):
    """
    Called upon mock test attempt completion to update mastery, cognitive load, and Welford profile.
    """
    attempt = db.query(MockTestAttempt).filter(
        MockTestAttempt.id == attempt_id,
        MockTestAttempt.user_id == user_id
    ).first()

    if not attempt:
        return

    # Fetch question attempts belonging to this test attempt
    q_attempts = db.query(QuestionAttempt).filter(
        QuestionAttempt.mock_test_attempt_id == attempt_id,
        QuestionAttempt.user_id == user_id
    ).all()

    affected_topics = set()

    for qa in q_attempts:
        if qa.is_correct is None:
            continue

        # Get question topic
        question = db.query(Question).filter(Question.id == qa.question_id).first()
        if not question or not question.topic_id:
            continue

        topic_id = question.topic_id
        affected_topics.add(topic_id)

        # Fetch or initialize topic mastery record
        mastery = db.query(UserTopicMastery).filter(
            UserTopicMastery.user_id == user_id,
            UserTopicMastery.topic_id == topic_id
        ).first()

        if not mastery:
            mastery = UserTopicMastery(
                user_id=user_id,
                topic_id=topic_id,
                bkt_mastery_prob=0.10,
                tmi_score=10.0
            )
            db.add(mastery)
            db.flush()

        # Update BKT
        mastery.bkt_mastery_prob = update_bkt(mastery.bkt_mastery_prob, bool(qa.is_correct))
        mastery.total_attempts = (mastery.total_attempts or 0) + 1

        if qa.is_correct:
            mastery.correct_count = (mastery.correct_count or 0) + 1
        else:
            mastery.incorrect_count = (mastery.incorrect_count or 0) + 1

        # Calculate RTI and classify quadrant (topic benchmark 45s, sigma 15s)
        time_spent = float(qa.time_taken_seconds or 45.0)
        rti = calculate_rti(time_spent, 45.0, 15.0)
        quadrant = classify_cognitive_quadrant(rti, bool(qa.is_correct))

        if quadrant == "Fast Master":
            mastery.fast_correct_count = (mastery.fast_correct_count or 0) + 1
        elif quadrant == "Methodical":
            mastery.slow_correct_count = (mastery.slow_correct_count or 0) + 1
        elif quadrant == "Speed Trap":
            mastery.fast_incorrect_count = (mastery.fast_incorrect_count or 0) + 1
        elif quadrant == "High Load":
            mastery.slow_incorrect_count = (mastery.slow_incorrect_count or 0) + 1

        mastery.last_practiced_at = datetime.now(timezone.utc)

    # Recalculate TMI score for affected topics
    for tid in affected_topics:
        mastery = db.query(UserTopicMastery).filter(
            UserTopicMastery.user_id == user_id,
            UserTopicMastery.topic_id == tid
        ).first()
        if not mastery:
            continue

        # Fetch recent attempts for this topic across mock and practice
        historical_qas = db.query(QuestionAttempt).join(
            Question, QuestionAttempt.question_id == Question.id
        ).filter(
            QuestionAttempt.user_id == user_id,
            Question.topic_id == tid,
            QuestionAttempt.is_correct.isnot(None)
        ).order_by(QuestionAttempt.created_at.desc()).limit(50).all()

        attempts_data = [
            {"timestamp": hqa.created_at, "is_correct": bool(hqa.is_correct)}
            for hqa in historical_qas
        ]

        decayed_acc = calculate_time_decayed_accuracy(attempts_data)
        mastery.tmi_score = compute_tmi_score(mastery.bkt_mastery_prob, decayed_acc)

    # Update Welford Performance Profile
    profile = db.query(UserPerformanceProfile).filter(
        UserPerformanceProfile.user_id == user_id
    ).first()

    if not profile:
        profile = UserPerformanceProfile(user_id=user_id)
        db.add(profile)
        db.flush()

    # Percentage score
    percentage_score = float(attempt.score or 0.0)
    old_mean = float(profile.running_mean_score or 0.0)

    n, new_mean, new_m2, new_var, new_std = update_welford_stats(
        profile.tests_completed or 0,
        profile.running_mean_score or 0.0,
        profile.running_m2 or 0.0,
        percentage_score
    )

    # Score velocity: change in mean per test
    score_velocity = new_mean - old_mean if (profile.tests_completed or 0) > 0 else 0.0
    trend_dir = "Accelerating" if score_velocity > 1.0 else ("Regressing" if score_velocity < -1.0 else "Plateauing")

    profile.tests_completed = n
    profile.running_mean_score = new_mean
    profile.running_m2 = new_m2
    profile.running_variance = new_var
    profile.running_std_dev = new_std
    profile.score_velocity = score_velocity
    profile.trend_direction = trend_dir
    profile.burnout_flag = detect_burnout_flag(n, new_mean, new_std, percentage_score)
    profile.archetype = derive_archetype(n, new_mean, score_velocity)
    profile.predicted_mock_score = float(round(max(0.0, min(100.0, new_mean + (score_velocity * 1.5))), 1))

    db.commit()
