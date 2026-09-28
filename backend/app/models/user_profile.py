from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class UserWeaknessProfile(Base):
    __tablename__ = "user_weakness_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    total_attempted = Column(Integer, default=0)
    total_correct = Column(Integer, default=0)
    weakness_score = Column(Float, default=0.5)
    trend = Column(String(20), nullable=True)
    last_attempted_at = Column(DateTime(timezone=True), nullable=True)
    last_calculated_at = Column(DateTime(timezone=True), nullable=True)
    user = relationship("User", back_populates="weakness_profiles")
    topic = relationship("Topic", back_populates="weakness_profiles")
    __table_args__ = (UniqueConstraint('user_id', 'topic_id'),)
