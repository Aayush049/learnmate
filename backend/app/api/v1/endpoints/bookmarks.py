from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.bookmark import Bookmark
from app.models.question import Question
from app.models.user import User
from app.schemas.bookmark import BookmarkCreate, BookmarkResponse
from app.auth import get_current_user

router = APIRouter()

@router.post("/", response_model=BookmarkResponse, status_code=status.HTTP_201_CREATED)
def create_bookmark(
    bookmark: BookmarkCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify question exists
    question = db.query(Question).filter(Question.id == bookmark.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    # Verify not already bookmarked
    existing = db.query(Bookmark).filter(
        Bookmark.user_id == current_user.id,
        Bookmark.question_id == bookmark.question_id
    ).first()
    
    if existing:
        return existing
        
    db_bookmark = Bookmark(
        user_id=current_user.id,
        question_id=bookmark.question_id
    )
    db.add(db_bookmark)
    db.commit()
    db.refresh(db_bookmark)
    return db_bookmark

@router.get("/", response_model=List[BookmarkResponse])
def get_bookmarks(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get bookmarks for user and load relationship manually if needed
    bookmarks = db.query(Bookmark).options(joinedload(Bookmark.question)).filter(Bookmark.user_id == current_user.id).offset(skip).limit(limit).all()
    return bookmarks

@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bookmark(
    question_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_bookmark = db.query(Bookmark).filter(
        Bookmark.user_id == current_user.id,
        Bookmark.question_id == question_id
    ).first()
    
    if not db_bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
        
    db.delete(db_bookmark)
    db.commit()
    return None

@router.get("/{question_id}/status", response_model=bool)
def check_bookmark_status(
    question_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing = db.query(Bookmark).filter(
        Bookmark.user_id == current_user.id,
        Bookmark.question_id == question_id
    ).first()
    return existing is not None
