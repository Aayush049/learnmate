from datetime import datetime, timedelta
from typing import Optional
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User

# bcrypt has a 72-byte input limit; we trim silently rather than failing at the edge.
_BCRYPT_MAX_BYTES = 72

# OAuth2 scheme — tokenUrl points at the login endpoint
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_user_model():
    """Return the User model class (avoids circular imports in some call sites)."""
    return User


def _truncate_password(password: str) -> bytes:
    """Encode and trim to bcrypt's 72-byte limit."""
    encoded = password.encode("utf-8")
    return encoded[:_BCRYPT_MAX_BYTES]


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    if not hashed_password:
        return False
    try:
        return bcrypt.checkpw(_truncate_password(plain_password), hashed_password.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def get_password_hash(password: str) -> str:
    """Generate a bcrypt hash of the password."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(_truncate_password(password), salt).decode("utf-8")


def authenticate_user(db: Session, email: str, password: str):
    """Authenticate user with email and password"""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token. `subject` is typically the user's email or id."""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Decode the JWT and return the current user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: Optional[str] = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Return the current user only if their account is active."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def get_current_admin_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Return the current user only if they have admin privileges."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return current_user

def get_current_user_optional(
    token: Optional[str] = Depends(OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: Optional[str] = payload.get("sub")
        if email is None:
            return None
        return db.query(User).filter(User.email == email).first()
    except JWTError:
        return None
