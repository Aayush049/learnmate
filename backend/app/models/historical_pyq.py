from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class HistoricalPYQ(Base):
    __tablename__ = "historical_pyq"
    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    year = Column(Integer, nullable=False)
    frequency = Column(Float, default=1.0)
    weightage = Column(Float, default=0.05)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    topic = relationship("Topic", back_populates="historical_pyqs")
