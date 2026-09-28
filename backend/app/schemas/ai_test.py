from pydantic import BaseModel, Field
from typing import Optional

class PersonalizedTestRequest(BaseModel):
    branch_id: int
    total_questions: int = Field(default=100, ge=1, le=200, description="Number of questions (1-200)")
    adaptation_weight: float = Field(default=0.5, ge=0.0, le=1.0, description="Weight for personalization (0.0-1.0)")
    name: Optional[str] = "AI Personalized PYQ Mock Test"
    description: Optional[str] = "Auto-generated based on PYQ weightage and user weaknesses"
