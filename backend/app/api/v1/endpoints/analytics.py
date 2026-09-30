from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.database import get_db
from app.services.ai_personality import generate_student_profile, generate_study_plan, generate_mistake_explanation
from app.models.user import User
from app.models.attempt import MockTestAttempt, QuestionAttempt
from app.models.question import Question
from app.models.subject import Subject
from app.models.topic import Topic
from app.models.chapter import Chapter
from app.models.user_profile import UserWeaknessProfile
from app.models.performance_profile import UserPerformanceProfile
from app.models.topic_mastery import UserTopicMastery
from app.models.study_session import UserTopicStudySession
from app.auth import get_current_user, require_active_entitlement
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class StudyHeartbeatRequest(BaseModel):
    topic_id: int
    duration_seconds: int = 30
    activity_type: Optional[str] = "reading"


router = APIRouter()

@router.get("/dashboard-stats")
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    attempts = db.query(MockTestAttempt).filter(MockTestAttempt.user_id == current_user.id).all()
    q_attempts = db.query(QuestionAttempt).filter(QuestionAttempt.user_id == current_user.id).count()
    
    # Calculate real syllabus completion (attempted topics / total topics)
    total_topics = db.query(Topic).count()
    attempted_topics = db.query(Topic.id)        .join(Question, Topic.id == Question.topic_id)        .join(QuestionAttempt, Question.id == QuestionAttempt.question_id)        .filter(QuestionAttempt.user_id == current_user.id)        .distinct().count()
        
    syllabus_completion = round((attempted_topics / total_topics * 100)) if total_topics > 0 else 0
    
    # Add scattered question time (assume 2 mins per question attempt not in mock test)
    # This is a simplification.
    total_time_seconds = sum([a.total_time_seconds or 0 for a in attempts]) + (q_attempts * 120)
    
    # Calculate streak appropriately (count unique days with attempts)
    from sqlalchemy import func, cast, Date
    unique_days = db.query(cast(QuestionAttempt.attempted_at, Date))        .filter(QuestionAttempt.user_id == current_user.id)        .distinct().count()

    # Also add mock test days
    mock_days = db.query(cast(MockTestAttempt.started_at, Date))        .filter(MockTestAttempt.user_id == current_user.id)        .distinct().count()
        
    streak = max(unique_days, mock_days)
    
    return {
        "syllabus_completion_percent": syllabus_completion,
        "total_study_time_hours": round(total_time_seconds / 3600, 1),
        "pyqs_solved": q_attempts, 
        "streak_days": streak
    }

@router.get("/weekly-activity")
def get_weekly_activity(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from datetime import datetime, timedelta
    
    # Generate last 7 days
    result = []
    today = datetime.now().date()
    
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        
        # Get attempts for this day
        from sqlalchemy import func, cast, Date
        
        # We don't have explicit sessions, so assume each QuestionAttempt takes 2 mins
        # or mock test attempts take their time
        mock_time = db.query(func.sum(MockTestAttempt.total_time_seconds)).filter(
            MockTestAttempt.user_id == current_user.id,
            cast(MockTestAttempt.completed_at, Date) == day
        ).scalar() or 0

        q_count = db.query(func.count(QuestionAttempt.id)).filter(
            QuestionAttempt.user_id == current_user.id,
            cast(QuestionAttempt.attempted_at, Date) == day
        ).scalar() or 0
        
        # approximate 2 min per q attempt if not in test
        total_seconds = mock_time + (q_count * 120)
        hours = round(total_seconds / 3600, 1)
        
        day_str = day.strftime("%a") # Mon, Tue
        result.append({"day": day_str, "hours": hours})
        
    return result

@router.get("/performance")
def get_performance(
    current_user: User = Depends(require_active_entitlement),
    db: Session = Depends(get_db)
):
    # Overall score/accuracy
    attempts = db.query(MockTestAttempt).filter(
        MockTestAttempt.user_id == current_user.id,
        MockTestAttempt.completed_at.isnot(None)
    ).all()
    
    total_correct = sum(a.correct_answers for a in attempts)
    total_incorrect = sum(a.incorrect_answers for a in attempts)
    total_attempted = total_correct + total_incorrect
    
    accuracy = round((total_correct / total_attempted * 100)) if total_attempted > 0 else 0
    overall_score = round(sum(a.score for a in attempts) / len(attempts)) if attempts else 0
    
    # Topic level (simplified for now to aggregate subjects)
    # Get all question attempts joined with subject
    from sqlalchemy.orm import aliased
    from sqlalchemy import case
    
    q_attempts = db.query(
        Subject.name,
        func.count(QuestionAttempt.id).label('total_attempted'),
        func.sum(case((QuestionAttempt.is_correct == True, 1), else_=0)).label('correct')
    ).select_from(QuestionAttempt)\
     .join(Question)\
     .join(Topic, Question.topic_id == Topic.id)\
     .join(Chapter, Topic.chapter_id == Chapter.id)\
     .join(Subject, Chapter.subject_id == Subject.id)\
     .filter(QuestionAttempt.user_id == current_user.id)\
     .group_by(Subject.name).all()
     
    topics_stats = []
    for qa in q_attempts:
        topics_stats.append({
            "name": qa.name,
            "totalAttempted": qa.total_attempted,
            "accuracy": round((qa.correct / qa.total_attempted * 100)) if qa.total_attempted > 0 else 0
        })
        
    topics_stats.sort(key=lambda x: x['accuracy'])
    weak = topics_stats[:3]
    strong = topics_stats[-3:] if len(topics_stats) > 3 else topics_stats
    
    return {
        "overallScore": overall_score,
        "accuracy": accuracy,
        "percentile": round(accuracy * 0.95), # Computed relative to accuracy for now
        "weakTopics": weak,
        "strongTopics": strong
    }

@router.get("/progress")
def get_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Total topics per subject vs attempted topics
    subjects = db.query(Subject).filter(Subject.branch_id == 2).all()
    result = []
    
    for sub in subjects:
        total_topics = db.query(Topic).join(Chapter).filter(Chapter.subject_id == sub.id).count()
        # Find topics where user attempted at least 1 question
        attempted_topics = db.query(Topic.id)\
            .join(Question, Topic.id == Question.topic_id)\
            .join(QuestionAttempt, Question.id == QuestionAttempt.question_id)\
            .join(Chapter, Topic.chapter_id == Chapter.id)\
            .filter(QuestionAttempt.user_id == current_user.id, Chapter.subject_id == sub.id)\
            .distinct().count()
            
        progress = round((attempted_topics / total_topics * 100)) if total_topics > 0 else 0
        
        result.append({
            "subject": sub.name,
            "totalTopics": total_topics,
            "completedTopics": attempted_topics,
            "progress": progress
        })
        
    return result


@router.get("/topic-progress")
def get_topic_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Calculate progress for each topic (total vs attempted questions)
    
    # Get total questions per topic
    total_q = db.query(Question.topic_id, func.count(Question.id).label('total'))        .group_by(Question.topic_id).all()
        
    total_dict = {t.topic_id: t.total for t in total_q}
    
    # Get attempted questions per topic for user
    attempted_q = db.query(Question.topic_id, func.count(func.distinct(QuestionAttempt.question_id)).label('attempted'))        .join(QuestionAttempt, Question.id == QuestionAttempt.question_id)        .filter(QuestionAttempt.user_id == current_user.id)        .group_by(Question.topic_id).all()
        
    attempted_dict = {a.topic_id: a.attempted for a in attempted_q}
    
    result = []
    topics = db.query(Topic).all()
    
    for t in topics:
        total = total_dict.get(t.id, 0)
        attempted = attempted_dict.get(t.id, 0)
        progress = round((attempted / total * 100)) if total > 0 else 0

        result.append({
            "topic_id": t.id,
            "progress": progress
        })

    return result

@router.get("/ai-profile")
def get_ai_profile(
    current_user: User = Depends(require_active_entitlement),
    db: Session = Depends(get_db)
):
    perf_data = get_performance(current_user, db)
    weekly_data = get_weekly_activity(current_user, db)
    profile_text = generate_student_profile(perf_data, weekly_data)
    return {
        "profile": profile_text
    }

@router.get("/weakness-profile")
def get_weakness_profile(
    current_user: User = Depends(require_active_entitlement),
    db: Session = Depends(get_db)
):
    profiles = db.query(UserWeaknessProfile).filter(UserWeaknessProfile.user_id == current_user.id).all()
    result = []
    for p in profiles:
        result.append({
            "topic_id": p.topic_id,
            "weakness_score": p.weakness_score,
            "trend": p.trend,
            "total_attempted": p.total_attempted,
            "total_correct": p.total_correct
        })
    return {"topics": result}

@router.post("/generate-study-plan")
def post_study_plan(
    data: dict = None,
    current_user: User = Depends(require_active_entitlement),
    db: Session = Depends(get_db)
):
    perf = get_performance(current_user, db)
    hours = data.get("available_hours", 2) if data else 2
    upcoming = data.get("upcoming_tests", []) if data else []
    return {"plan": generate_study_plan(perf, hours, upcoming)}

@router.post("/mistake-explanation")
def post_mistake_explanation(
    data: dict = None,
    current_user: User = Depends(require_active_entitlement),
    db: Session = Depends(get_db)
):
    topic = data.get("topic", "") if data else ""
    wrong = data.get("incorrect_answer", "") if data else ""
    correct = data.get("correct_answer", "") if data else ""
    return {"explanation": generate_mistake_explanation(topic, wrong, correct)}


@router.post("/study-session/heartbeat")
def record_study_heartbeat(
    payload: StudyHeartbeatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Heartbeat ping from learner's reading or practice session to accumulate time.
    """
    today = datetime.now().date()
    from sqlalchemy import cast, Date

    session = db.query(UserTopicStudySession).filter(
        UserTopicStudySession.user_id == current_user.id,
        UserTopicStudySession.topic_id == payload.topic_id,
        UserTopicStudySession.activity_type == payload.activity_type,
        cast(UserTopicStudySession.session_date, Date) == today
    ).first()

    if session:
        session.duration_seconds = (session.duration_seconds or 0) + payload.duration_seconds
    else:
        session = UserTopicStudySession(
            user_id=current_user.id,
            topic_id=payload.topic_id,
            duration_seconds=payload.duration_seconds,
            activity_type=payload.activity_type
        )
        db.add(session)

    db.commit()
    db.refresh(session)
    return {
        "status": "recorded",
        "topic_id": payload.topic_id,
        "total_duration_seconds": session.duration_seconds
    }


@router.get("/performance-overview")
def get_performance_overview(
    current_user: User = Depends(require_active_entitlement),
    db: Session = Depends(get_db)
):
    """
    Comprehensive diagnostics payload for Phase 5 Visual Analytics:
    - Welford running metrics and burnout detection
    - 4-Quadrant Cognitive Load Matrix totals
    - Top Priority Revision Feed (decayed mastery / speed traps)
    """
    profile = db.query(UserPerformanceProfile).filter(
        UserPerformanceProfile.user_id == current_user.id
    ).first()

    masteries = db.query(UserTopicMastery).filter(
        UserTopicMastery.user_id == current_user.id
    ).all()

    # Aggregate cognitive quadrants
    fast_master = sum(m.fast_correct_count or 0 for m in masteries)
    methodical = sum(m.slow_correct_count or 0 for m in masteries)
    speed_trap = sum(m.fast_incorrect_count or 0 for m in masteries)
    high_load = sum(m.slow_incorrect_count or 0 for m in masteries)

    # Priority Revision Feed: rank topics needing urgent review
    priority_topics = []
    for m in masteries:
        topic = db.query(Topic).filter(Topic.id == m.topic_id).first()
        topic_name = topic.name if topic else f"Topic {m.topic_id}"

        # Urgency heuristic: low TMI score + high speed trap / high load
        error_rate = (m.incorrect_count / m.total_attempts) if m.total_attempts > 0 else 0.0
        urgency_score = (100.0 - (m.tmi_score or 10.0)) * 0.6 + (error_rate * 40.0)

        # Classify recommendation reason
        reason = "Conceptual Gap"
        if (m.fast_incorrect_count or 0) >= (m.slow_incorrect_count or 0) and (m.fast_incorrect_count or 0) > 2:
            reason = "Speed Trap (Careless Errors)"
        elif (m.tmi_score or 10.0) < 40.0:
            reason = "Memory Decay / Low Retention"
        elif (m.slow_correct_count or 0) > 3 and (m.fast_correct_count or 0) == 0:
            reason = "Speed Optimization Needed"

        priority_topics.append({
            "topic_id": m.topic_id,
            "topic_name": topic_name,
            "tmi_score": round(m.tmi_score or 10.0, 1),
            "bkt_prob": round(m.bkt_mastery_prob or 0.10, 2),
            "total_attempts": m.total_attempts,
            "error_rate_percent": round(error_rate * 100, 1),
            "urgency_score": round(urgency_score, 1),
            "recommendation_reason": reason
        })

    priority_topics.sort(key=lambda x: x["urgency_score"], reverse=True)

    # Fallback/defaults if user has not completed mock tests yet
    profile_data = {
        "tests_completed": profile.tests_completed if profile else 0,
        "running_mean_score": round(profile.running_mean_score, 1) if profile else 0.0,
        "running_variance": round(profile.running_variance, 2) if profile else 0.0,
        "running_std_dev": round(profile.running_std_dev, 2) if profile else 0.0,
        "score_velocity": round(profile.score_velocity, 2) if profile else 0.0,
        "trend_direction": profile.trend_direction if profile else "Neutral",
        "archetype": profile.archetype if profile else "The Exploring Learner",
        "burnout_flag": profile.burnout_flag if profile else "Normal",
        "predicted_mock_score": round(profile.predicted_mock_score, 1) if profile else 0.0,
    }

    return {
        "profile": profile_data,
        "cognitive_matrix": {
            "fast_master": fast_master,
            "methodical": methodical,
            "speed_trap": speed_trap,
            "high_load": high_load,
            "total_analyzed": fast_master + methodical + speed_trap + high_load
        },
        "priority_revision_feed": priority_topics[:6],
    }


@router.get("/topic-breakdown")
def get_topic_breakdown(
    current_user: User = Depends(require_active_entitlement),
    db: Session = Depends(get_db)
):
    """
    Detailed topic-by-topic mastery, cognitive quadrants, and study duration.
    """
    topics = db.query(Topic).all()
    masteries = {
        m.topic_id: m for m in db.query(UserTopicMastery).filter(
            UserTopicMastery.user_id == current_user.id
        ).all()
    }

    # Sum study sessions per topic
    study_times = {}
    sessions = db.query(
        UserTopicStudySession.topic_id,
        func.sum(UserTopicStudySession.duration_seconds).label("total_seconds")
    ).filter(
        UserTopicStudySession.user_id == current_user.id
    ).group_by(UserTopicStudySession.topic_id).all()

    for s in sessions:
        study_times[s.topic_id] = s.total_seconds

    results = []
    for t in topics:
        m = masteries.get(t.id)
        chapter = db.query(Chapter).filter(Chapter.id == t.chapter_id).first() if t.chapter_id else None
        subject = db.query(Subject).filter(Subject.id == chapter.subject_id).first() if chapter and chapter.subject_id else None

        results.append({
            "topic_id": t.id,
            "topic_name": t.name,
            "chapter_name": chapter.name if chapter else None,
            "subject_name": subject.name if subject else None,
            "tmi_score": round(m.tmi_score, 1) if m and m.tmi_score is not None else 10.0,
            "bkt_prob": round(m.bkt_mastery_prob, 2) if m and m.bkt_mastery_prob is not None else 0.10,
            "total_attempts": m.total_attempts if m else 0,
            "correct_count": m.correct_count if m else 0,
            "incorrect_count": m.incorrect_count if m else 0,
            "fast_correct": m.fast_correct_count if m else 0,
            "slow_correct": m.slow_correct_count if m else 0,
            "fast_incorrect": m.fast_incorrect_count if m else 0,
            "slow_incorrect": m.slow_incorrect_count if m else 0,
            "study_duration_seconds": study_times.get(t.id, 0)
        })

    return results


