from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
from app.database import get_db
from app.models.flashcard import Flashcard
from app.models.user import User
from app.schemas.flashcard import FlashcardCreate, FlashcardUpdate, FlashcardResponse, FlashcardReview
from app.auth import get_current_user

router = APIRouter()

# Simple spaced repetition intervals mapped by Leitner box (in days)
BOX_INTERVALS = {
    1: 1,
    2: 3,
    3: 7,
    4: 14,
    5: 30
}

@router.get("/", response_model=List[FlashcardResponse])
def get_flashcards(skip: int = 0, limit: int = 100, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Flashcard).filter(Flashcard.user_id == current_user.id).order_by(Flashcard.created_at.desc()).offset(skip).limit(limit).all()

@router.get("/due", response_model=List[FlashcardResponse])
def get_due_flashcards(limit: int = 50, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    now = datetime.utcnow()
    return db.query(Flashcard).filter(
        Flashcard.user_id == current_user.id,
        Flashcard.next_review_at <= now
    ).order_by(Flashcard.next_review_at.asc()).limit(limit).all()

@router.post("/", response_model=FlashcardResponse, status_code=status.HTTP_201_CREATED)
def create_flashcard(flashcard: FlashcardCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_flashcard = Flashcard(
        user_id=current_user.id,
        front=flashcard.front,
        back=flashcard.back,
        next_review_at=datetime.utcnow()
    )
    db.add(db_flashcard)
    db.commit()
    db.refresh(db_flashcard)
    return db_flashcard

@router.patch("/{flashcard_id}", response_model=FlashcardResponse)
def update_flashcard(flashcard_id: int, flashcard_update: FlashcardUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_flashcard = db.query(Flashcard).filter(Flashcard.id == flashcard_id, Flashcard.user_id == current_user.id).first()
    if not db_flashcard:
        raise HTTPException(status_code=404, detail="Flashcard not found")

    update_data = flashcard_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_flashcard, key, value)

    db.commit()
    db.refresh(db_flashcard)
    return db_flashcard

@router.post("/{flashcard_id}/review", response_model=FlashcardResponse)
def review_flashcard(flashcard_id: int, review: FlashcardReview, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_flashcard = db.query(Flashcard).filter(Flashcard.id == flashcard_id, Flashcard.user_id == current_user.id).first()
    if not db_flashcard:
        raise HTTPException(status_code=404, detail="Flashcard not found")

    if review.success:
        db_flashcard.box = min(db_flashcard.box + 1, 5)
    else:
        db_flashcard.box = 1  # Reset to box 1 on failure

    interval_days = BOX_INTERVALS.get(db_flashcard.box, 1)
    db_flashcard.next_review_at = datetime.utcnow() + timedelta(days=interval_days)

    db.commit()
    db.refresh(db_flashcard)
    return db_flashcard

@router.delete("/{flashcard_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_flashcard(flashcard_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_flashcard = db.query(Flashcard).filter(Flashcard.id == flashcard_id, Flashcard.user_id == current_user.id).first()
    if not db_flashcard:
        raise HTTPException(status_code=404, detail="Flashcard not found")
    db.delete(db_flashcard)
    db.commit()
    return None
