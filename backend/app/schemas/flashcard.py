from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class FlashcardBase(BaseModel):
    front: str
    back: str

class FlashcardCreate(FlashcardBase):
    pass

class FlashcardUpdate(BaseModel):
    front: Optional[str] = None
    back: Optional[str] = None
    box: Optional[int] = None
    next_review_at: Optional[datetime] = None

class FlashcardReview(BaseModel):
    success: bool  # True if user answered correctly, False otherwise

class FlashcardResponse(FlashcardBase):
    id: int
    user_id: int
    box: int
    next_review_at: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
