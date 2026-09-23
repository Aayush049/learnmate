from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from app.config import settings

connect_args = {}
# Enforce SSL for external cloud databases
is_cloud_db = ("localhost" not in settings.DATABASE_URL and "127.0.0.1" not in settings.DATABASE_URL)
if is_cloud_db:
    connect_args["sslmode"] = "require"

# Create database engine
# For cloud databases on free tiers (like Supabase), we use NullPool
# to aggressively close connections instead of pooling and exhausting the 15-conn limit
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=settings.DB_ECHO,
    poolclass=NullPool if is_cloud_db else None,
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
