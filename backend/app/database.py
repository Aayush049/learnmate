from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

connect_args = {}
# Enforce SSL for external cloud databases
if "localhost" not in settings.DATABASE_URL and "127.0.0.1" not in settings.DATABASE_URL:
    connect_args["sslmode"] = "require"

# Create database engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=settings.DB_ECHO,
    pool_size=3,          # Limit pool size for free tier databases
    max_overflow=2,       # Max pool size = 5, avoids EMAXCONNSESSION
    pool_timeout=30,      # Give up after 30 seconds of waiting
    connect_args=connect_args
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()


def get_db():
    """
    Dependency to get database session.
    Used in FastAPI endpoints with Depends(get_db).
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
