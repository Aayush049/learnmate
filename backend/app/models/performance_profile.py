from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float
from sqlalchemy.sql import func
from app.database import Base

class UserPerformanceProfile(Base):
    __tablename__ = "user_performance_profiles"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    # Welford's Running Statistics on Mock Test Percentage Scores
    tests_completed = Column(Integer, default=0)
    running_mean_score = Column(Float, default=0.0)
    running_m2 = Column(Float, default=0.0)          # Sum of squared differences from mean
    running_variance = Column(Float, default=0.0)
    running_std_dev = Column(Float, default=0.0)

    # Velocity & Trends
    score_velocity = Column(Float, default=0.0)      # d(score)/d(test)
    trend_direction = Column(String(30), default="Neutral") # Accelerating, Plateauing, Regressing

    # Archetype & Burnout
    archetype = Column(String(50), default="The Steady Builder")
    burnout_flag = Column(String(20), default="Normal") # Normal, Warning, Critical
    predicted_mock_score = Column(Float, default=0.0)

    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
