"""User-related Pydantic schemas"""
from pydantic import BaseModel, Field, field_validator
import re
from typing import Optional
from datetime import datetime


def _validate_email_address(value: str) -> str:
    """
    Validate an email address.
    """
    if not value or not isinstance(value, str):
        raise ValueError("Email is required")
    # Simple regex for email validation
    if not re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", value):
        raise ValueError("Email is not valid")
    return value.strip().lower()


class UserCreate(BaseModel):
    """User registration schema"""
    email: str
    password: str = Field(..., min_length=6, max_length=100)
    full_name: str = Field(..., min_length=2, max_length=100)
    phone: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    address: Optional[str] = None

    @field_validator("email")
    @classmethod
    def _email_valid(cls, v: str) -> str:
        return _validate_email_address(v)


class UserLogin(BaseModel):
    """User login schema"""
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def _email_valid(cls, v: str) -> str:
        return _validate_email_address(v)


class UserUpdate(BaseModel):
    """User profile update schema"""
    full_name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    address: Optional[str] = None


class UserResponse(BaseModel):
    """User response schema (public info)"""
    id: int
    email: str
    full_name: str
    roll_number: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """JWT token response"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class GoogleLoginRequest(BaseModel):
    """Google OAuth login schema"""
    credential: str
