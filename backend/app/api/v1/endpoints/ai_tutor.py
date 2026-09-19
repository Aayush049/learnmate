from fastapi import APIRouter, Depends, HTTPException, status
import os
import google.generativeai as genai

from app.schemas.user import UserResponse
from app.auth import get_current_user
from pydantic import BaseModel

router = APIRouter()

class DoubtRequest(BaseModel):
    query: str
    topic_context: str = ""

@router.post("/solve")
def solve_doubt(
    request: DoubtRequest,
    current_user: UserResponse = Depends(get_current_user)
):
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key or api_key == "your_api_key_here" or not api_key.startswith("AIza"):
            # Fallback mock for development if no key configured or if it looks invalid
            return {"answer": f"Simulated AI Tutor Response for: '{request.query}'. (Please configure a valid GEMINI_API_KEY in Render dashboard to enable real AI)."}

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"You are a helpful engineering tutor focused on SSC JE Civil Engineering. Answer this student's question clearly and concisely.\n\nContext: {request.topic_context}\n\nQuestion: {request.query}"
        
        response = model.generate_content(prompt)
        return {"answer": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Service Error: {str(e)}")
