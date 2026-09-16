from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.schemas.question import QuestionResponse

class BookmarkBase(BaseModel):
    question_id: int

class BookmarkCreate(BookmarkBase):
    pass

class BookmarkResponse(BookmarkBase):
    id: int
    user_id: int
    created_at: datetime
    
    # We optionally include the bookmarked question data
    question: Optional[QuestionResponse] = None

    class Config:
        from_attributes = True
