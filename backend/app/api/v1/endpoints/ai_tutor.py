from fastapi import APIRouter, Depends, HTTPException, status
import os
import google.generativeai as genai

from app.models.user import User
from app.auth import require_active_entitlement
from pydantic import BaseModel

router = APIRouter()

class DoubtRequest(BaseModel):
    query: str
    topic_context: str = ""

@router.post("/solve")
def solve_doubt(
    request: DoubtRequest,
    current_user: User = Depends(require_active_entitlement)
):
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key or api_key == "your_api_key_here":
            # Fallback mock for development if no key configured or if it looks invalid
            return {"answer": f"Simulated AI Tutor Response for: '{request.query}'. (Please configure a valid GEMINI_API_KEY in Render dashboard to enable real AI)."}

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-flash-latest')

        prompt = f"You are a helpful engineering tutor focused on SSC JE Civil Engineering. Answer this student's question clearly and concisely.\n\nContext: {request.topic_context}\n\nQuestion: {request.query}"

        response = model.generate_content(prompt)
        return {"answer": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Service Error: {str(e)}")
