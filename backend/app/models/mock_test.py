from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Float, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class MockTestType(str, enum.Enum):
    FULL_SYLLABUS = "full_syllabus"
    SUBJECT_WISE = "subject_wise"
    TOPIC_WISE = "topic_wise"
    CUSTOM = "custom"


class MockTest(Base):
    __tablename__ = "mock_tests"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    test_type = Column(Enum(MockTestType), default=MockTestType.FULL_SYLLABUS)
    duration_minutes = Column(Integer, nullable=False)  # Total duration in minutes
    total_marks = Column(Integer, nullable=False)
    negative_marking = Column(Float, default=0.25) # e.g. 0.25
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True) # For backward compatibility
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    is_baseline = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    mock_test_questions = relationship("MockTestQuestion", back_populates="mock_test", cascade="all, delete-orphan")
    attempts = relationship("MockTestAttempt", back_populates="mock_test", cascade="all, delete-orphan")
    creator = relationship("User", foreign_keys=[created_by_id], backref="created_mock_tests")

    def __repr__(self):
        return f"<MockTest(id={self.id}, name={self.name}, test_type={self.test_type})>"


class MockTestQuestion(Base):
    __tablename__ = "mock_test_questions"

    id = Column(Integer, primary_key=True, index=True)
    mock_test_id = Column(Integer, ForeignKey("mock_tests.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    question_order = Column(Integer, nullable=False)  # Order in the test (1-100)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    mock_test = relationship("MockTest", back_populates="mock_test_questions")
    question = relationship("Question", back_populates="mock_test_questions")

    def __repr__(self):
        return f"<MockTestQuestion(id={self.id}, mock_test_id={self.mock_test_id}, question_id={self.question_id}, order={self.question_order})>"
