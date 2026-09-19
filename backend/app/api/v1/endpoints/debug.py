from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from sqlalchemy import text

router = APIRouter()

@router.get("/db-error")
def test_db_insert(db: Session = Depends(get_db)):
    from app.models.user import User
    import uuid
    import traceback
    try:
        user = User(
            email=f"test_{uuid.uuid4()}@example.com",
            hashed_password="test",
            full_name="Test"
        )
        db.add(user)
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        return {"error": str(e), "traceback": traceback.format_exc()}
