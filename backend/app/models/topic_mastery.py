from sqlalchemy import Column, Integer, DateTime, ForeignKey, Float
from sqlalchemy.sql import func
from app.database import Base

class UserTopicMastery(Base):
    __tablename__ = "user_topic_masteries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)

    # Bayesian Knowledge Tracing (BKT) State
    bkt_mastery_prob = Column(Float, default=0.10) # P(L_t) initialized to P(L_0) = 0.10
    total_attempts = Column(Integer, default=0)
    correct_count = Column(Integer, default=0)
    incorrect_count = Column(Integer, default=0)

    # 4-Quadrant Cognitive Load Counts
    fast_correct_count = Column(Integer, default=0)     # Quadrant 1: Fast Master (RTI <= 0.0, Correct)
    slow_correct_count = Column(Integer, default=0)     # Quadrant 2: Methodical (RTI > 0.0, Correct)
    fast_incorrect_count = Column(Integer, default=0)   # Quadrant 3: Speed Trap (RTI < -0.4, Incorrect)
    slow_incorrect_count = Column(Integer, default=0)   # Quadrant 4: High Load (RTI >= -0.4, Incorrect)

    # Time-Decayed Topic Mastery Index (TMI 0.0 - 100.0)
    tmi_score = Column(Float, default=10.0)

    last_practiced_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
