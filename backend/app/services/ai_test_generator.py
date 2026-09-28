from sqlalchemy.orm import Session
from sqlalchemy import func, Integer, case
import random
import math

from app.models import MockTestAttempt, QuestionAttempt, Question, Topic, Subject, Chapter
from app.models.mock_test import MockTest, MockTestType, MockTestQuestion

def calculate_pyq_baseline_weights(db: Session, branch_id: int):
    """
    In a fully hydrated database, this would query all questions where is_pyq=True
    and calculate exact topic frequencies.
    As a fallback, we use known SSC JE Civil historic averages.
    """

    # Query database to check if we have enough PYQs to calculate dynamically
    pyq_topic_counts = db.query(
        Topic.id,
        Topic.name,
        func.count(Question.id).label("count")
    ).join(Question, Topic.id == Question.topic_id)\
     .filter(Question.is_pyq == True)\
     .group_by(Topic.id, Topic.name).all()

    total_pyqs = sum([row.count for row in pyq_topic_counts])

    weights = {}
    if total_pyqs > 100:  # We have enough data
        for row in pyq_topic_counts:
            weights[row.id] = row.count / total_pyqs
    else:
        # Fallback dictionary simulating standard SSC-JE Civil weightages mapped to subjects
        topics = db.query(Topic).join(Chapter).join(Subject).filter(Subject.branch_id == branch_id).all()
        # Fallback distribution logic
        for t in topics:
            subject_name = t.chapter.subject.name.lower()
            weight = 0.05
            if "material" in subject_name or "bmc" in subject_name: weight = 0.16
            elif "soil" in subject_name: weight = 0.10
            elif "fluid" in subject_name: weight = 0.10
            elif "survey" in subject_name: weight = 0.10
            elif "transportation" in subject_name: weight = 0.10
            elif "rcc" in subject_name: weight = 0.10
            elif "steel" in subject_name: weight = 0.08

            # Divide subject weight amongst its topics evenly
            subject_topics_count = len(t.chapter.subject.chapters) * 2 # rough approx
            weights[t.id] = weight / max(subject_topics_count, 1)

    return weights


def calculate_user_weaknesses(db: Session, user_id: int):
    """
    Calculate user weakness across topics by analyzing recent test attempts.

    Improvements:
    1. Uses exponential decay weighting to properly weight recent practice vs historical tests
    2. Includes ALL practice attempts, avoiding strict time windows that drop long-term weaknesses
    3. Returns dict: topic_id -> weakness_score (0.0 to 1.0, where 1.0 = very weak).
    """
    # Fetch the last 1500 question attempts (approx 15 mock tests + practice)
    recent_q_attempts = (
        db.query(
            Question.topic_id,
            QuestionAttempt.is_correct,
            QuestionAttempt.attempted_at
        )
        .join(Question, QuestionAttempt.question_id == Question.id)
        .filter(
            QuestionAttempt.user_id == user_id,
            QuestionAttempt.is_correct.isnot(None) # Ignore unattempted questions!
        )
        .order_by(QuestionAttempt.attempted_at.desc())
        .limit(1500)
        .all()
    )

    if not recent_q_attempts:
        return {} # No history

    # Apply exponential decay based on recency (position)
    # Most recent questions get weight 1.0, oldest in the window get ~0.3
    topic_stats = {}

    for i, row in enumerate(recent_q_attempts):
        t_id = row.topic_id
        is_correct = 1 if row.is_correct else 0

        # Exponential decay: weight = e^(-k * index)
        # e^(-k * 1500) = 0.3 -> -k * 1500 = ln(0.3) -> k = -ln(0.3)/1500 ~= 0.0008
        weight = math.exp(-0.0008 * i)

        if t_id not in topic_stats:
            topic_stats[t_id] = {"weighted_correct": 0.0, "total_weight": 0.0}

        topic_stats[t_id]["weighted_correct"] += (is_correct * weight)
        topic_stats[t_id]["total_weight"] += weight

    weakness_scores = {}
    for t_id, stats in topic_stats.items():
        if stats["total_weight"] > 0:
            accuracy = stats["weighted_correct"] / stats["total_weight"]
            weakness_scores[t_id] = 1.0 - accuracy # Higher score = weaker

    return weakness_scores


def generate_personalized_test_distribution(
    db: Session,
    user_id: int,
    branch_id: int,
    total_questions: int,
    adaptation_weight: float = 0.5,
    attempt_count: int = 0
):
    """
    Generate a personalized test distribution that blends historical PYQ weightages
    with user-specific weaknesses.
    """
    # First 4 mock tests follow PDF PYQ weightages only (no weakness blend)
    if attempt_count < 4:
        adaptation_weight = 0.0

    pyq_weights = calculate_pyq_baseline_weights(db, branch_id)
    user_weaknesses = calculate_user_weaknesses(db, user_id) if adaptation_weight > 0 else {}

    final_weights = {}

    all_topics = set(pyq_weights.keys()).union(set(user_weaknesses.keys()))

    for t_id in all_topics:
        p_wt = pyq_weights.get(t_id, 0.02)  # base small weight

        # If user has a weakness score, blend it.
        # If no weakness score, assume average (0.5)
        u_weak = user_weaknesses.get(t_id, 0.5)

        # Blend instead of multiply
        final_score = (p_wt * (1.0 - adaptation_weight)) + (u_weak * adaptation_weight)
        final_weights[t_id] = final_score

    # Normalize final weights
    total_score = sum(final_weights.values())

    distribution = {}
    remaining_qs = total_questions

    # Calculate initial distribution using floor
    for t_id, score in final_weights.items():
        normalized = score / total_score if total_score > 0 else 0
        allocated = math.floor(normalized * total_questions)
        distribution[t_id] = allocated
        remaining_qs -= allocated

    # Distribute remainder to highest fractional parts
    fractional = {
        t_id: ((score / total_score * total_questions) - math.floor(score / total_score * total_questions))
        for t_id, score in final_weights.items()
    }
    sorted_fracts = sorted(fractional.items(), key=lambda x: x[1], reverse=True)

    for i in range(remaining_qs):
        if i < len(sorted_fracts):
            distribution[sorted_fracts[i][0]] += 1

    return distribution


def build_mock_test_from_distribution(
    db: Session,
    user_id: int,
    name: str,
    description: str,
    total_questions: int,
    distribution: dict,
    is_baseline: bool = False
) -> MockTest:
    """
    Build a mock test from a pre-calculated distribution of questions by topic.
    Uses bulk queries to avoid N+1 issues.
    """

    mock_test = MockTest(
        name=name,
        description=description,
        test_type=MockTestType.CUSTOM,
        duration_minutes=120, # Enforced 120 mins
        total_marks=total_questions,
        negative_marking=0.25,
        is_baseline=is_baseline,
        created_by_id=user_id,
        user_id=user_id
    )
    db.add(mock_test)
    db.flush() # get ID

    # Get the attempt IDs of the user's last 3 tests to exclude their questions
    last_3_attempts_ids = [a[0] for a in db.query(MockTestAttempt.id).filter(
        MockTestAttempt.user_id == user_id
    ).order_by(MockTestAttempt.completed_at.desc().nulls_last()).limit(3).all()]

    recent_q_attempts_ids = []
    if last_3_attempts_ids:
        recent_q_attempts_ids = [q[0] for q in db.query(QuestionAttempt.question_id).filter(
            QuestionAttempt.user_id == user_id,
            QuestionAttempt.mock_test_attempt_id.in_(last_3_attempts_ids)
        ).all()]

    all_selected_questions = []

    # Optimize query: fetch questions for all topics at once
    needed_topic_ids = [t for t, count in distribution.items() if count > 0]

    if needed_topic_ids:
        query = db.query(Question).filter(Question.topic_id.in_(needed_topic_ids))
        if recent_q_attempts_ids:
            query = query.filter(Question.id.notin_(recent_q_attempts_ids))

        all_potential_qs = query.all()
        qs_by_topic = {}
        for q in all_potential_qs:
            qs_by_topic.setdefault(q.topic_id, []).append(q)

        # Shuffle local pool
        for t_id, qs_list in qs_by_topic.items():
            random.shuffle(qs_list)

        for topic_id, count in distribution.items():
            if count <= 0: continue

            available_qs = qs_by_topic.get(topic_id, [])
            selected = available_qs[:count]

            # Fallback: if we didn't find enough fresh questions, pull from recent attempts too
            if len(selected) < count:
                remaining = count - len(selected)
                exclude_ids = [q.id for q in selected]
                more_query = db.query(Question).filter(Question.topic_id == topic_id)
                if exclude_ids:
                    more_query = more_query.filter(Question.id.notin_(exclude_ids))
                more_qs = more_query.order_by(func.random()).limit(remaining).all()
                selected.extend(more_qs)

            all_selected_questions.extend(selected)

    # Question Deficit Fix:
    # Fill remaining gaps across whole branch if subject-level limits were exhausted
    if len(all_selected_questions) < total_questions:
        shortfall = total_questions - len(all_selected_questions)
        exclude_overall_ids = [q.id for q in all_selected_questions]

        gap_fill_query = db.query(Question)
        if exclude_overall_ids:
             gap_fill_query = gap_fill_query.filter(Question.id.notin_(exclude_overall_ids))

        gap_fill_qs = gap_fill_query.order_by(func.random()).limit(shortfall).all()
        all_selected_questions.extend(gap_fill_qs)

    # Combine all questions and shuffle them to simulate the real exam
    random.shuffle(all_selected_questions)

    order = 1
    for q in all_selected_questions:
        mtq = MockTestQuestion(
            mock_test_id=mock_test.id,
            question_id=q.id,
            question_order=order
        )
        db.add(mtq)
        order += 1

    db.commit()
    db.refresh(mock_test)
    return mock_test
