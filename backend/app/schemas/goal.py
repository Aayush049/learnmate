from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class GoalBase(BaseModel):
    text: str

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    is_completed: bool

class GoalResponse(GoalBase):
    id: int
    user_id: int
    is_completed: bool
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
