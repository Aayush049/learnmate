from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum

class DifficultyLevel(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

class QuestionOptionBase(BaseModel):
    option_text: str
    option_label: str

class QuestionOptionCreate(QuestionOptionBase):
    is_correct: bool

class QuestionOptionResponse(BaseModel):
    id: int
    option_text: str
    option_label: str

    class Config:
        from_attributes = True

class QuestionOptionWithCorrect(QuestionOptionResponse):
    is_correct: bool

class QuestionBase(BaseModel):
    question_text: str
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    marks: int = 1
    is_pyq: bool = False
    year: Optional[int] = None
    shift: Optional[str] = None
    source: Optional[str] = None
    topic_name: Optional[str] = None
    subject_name: Optional[str] = None
    explanation: Optional[str] = None

class QuestionCreate(QuestionBase):
    topic_id: int
    options: List[QuestionOptionCreate]

class QuestionUpdate(QuestionBase):
    topic_id: Optional[int] = None
    question_text: Optional[str] = None
    options: Optional[List[QuestionOptionCreate]] = None

class QuestionResponse(BaseModel):
    id: int
    topic_id: int
    question_text: str
    difficulty: DifficultyLevel
    marks: int
    is_pyq: bool = False
    year: Optional[int] = None
    shift: Optional[str] = None
    source: Optional[str] = None
    topic_name: Optional[str] = None
    subject_name: Optional[str] = None

    class Config:
        from_attributes = True

class QuestionWithOptions(BaseModel):
    id: int
    topic_id: int
    question_text: str
    difficulty: DifficultyLevel
    marks: int
    is_pyq: bool = False
    year: Optional[int] = None
    shift: Optional[str] = None
    source: Optional[str] = None
    topic_name: Optional[str] = None
    subject_name: Optional[str] = None
    options: List[QuestionOptionResponse]

class QuestionDetail(QuestionWithOptions):
    explanation: Optional[str] = None
    correct_option: str

class AnswerSubmission(BaseModel):
    question_id: int
    selected_option: Optional[str] = None
    time_taken_seconds: Optional[int] = None

class AnswerResult(BaseModel):
    question_id: int
    is_correct: bool
    correct_option: str
    explanation: Optional[str] = None
    selected_option: Optional[str] = None
    time_taken_seconds: Optional[int] = None
