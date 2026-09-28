import os
import json
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.question import Question, QuestionOption, DifficultyLevel
from app.models.mock_test import MockTest, MockTestQuestion, MockTestType
from app.models.topic import Topic

import google.generativeai as genai

# Prompt for Gemini to generate SSC JE Civil Engineering questions
PROMPT = """
You are an expert civil engineering professor.
Please generate a realistic mock test paper for SSC JE Civil Engineering.
Provide exactly 20 high-quality questions.
Return the output strictly as a JSON array of objects, with NO markdown formatting, NO backticks, and NO other text.
Each object must have exactly this structure:
{
  "question_text": "string",
  "options": [
    {"option_label": "A", "option_text": "string"},
    {"option_label": "B", "option_text": "string"},
    {"option_label": "C", "option_text": "string"},
    {"option_label": "D", "option_text": "string"}
  ],
  "correct_option": "A or B or C or D",
  "explanation": "string",
  "difficulty": "medium"
}
Make sure the questions cover diverse subjects like Building Materials, Surveying, Fluid Mechanics, Estimating, etc.
"""

def generate_and_insert_mock_test():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Error: Gemini API key not configured.")
        return

    genai.configure(api_key=api_key)
    print("Fetching mock test paper from Gemini (Internet/Model Knowledge)...")

    model = genai.GenerativeModel('models/gemini-2.5-flash-lite')
    response = model.generate_content(PROMPT)

    text_resp = response.text.strip()
    if text_resp.startswith("```json"):
        text_resp = text_resp[7:]
    if text_resp.startswith("```"):
        text_resp = text_resp[3:]
    if text_resp.endswith("```"):
        text_resp = text_resp[:-3]
    text_resp = text_resp.strip()

    try:
        questions_data = json.loads(text_resp)
        print(f"Successfully generated {len(questions_data)} questions.")
    except Exception as e:
        print(f"Failed to parse JSON response: {e}")
        print(text_resp[:200])
        return

    db: Session = SessionLocal()
    try:
        # Get a valid topic_id to assign these questions
        # Just grab the first available topic, e.g. Building Materials -> Bricks
        topic = db.query(Topic).first()
        topic_id = topic.id if topic else 1

        # Create Mock Test
        mock_test = MockTest(
            name="SSC JE Civil Mock Paper (Web Target)",
            description="A realistic 20-question mock test paper sourced dynamically.",
            test_type=MockTestType.FULL_SYLLABUS,
            duration_minutes=20,
            total_marks=20,
            negative_marking=0.25,
            is_baseline=0,
            user_id=None
        )
        db.add(mock_test)
        db.commit()
        db.refresh(mock_test)

        # Insert questions and link them
        for idx, q_data in enumerate(questions_data):
            difficulty_str = q_data.get("difficulty", "medium").upper()
            try:
                diff_enum = DifficultyLevel[difficulty_str]
            except KeyError:
                diff_enum = DifficultyLevel.MEDIUM

            q = Question(
                topic_id=topic_id,
                question_text=q_data["question_text"],
                explanation=q_data.get("explanation", ""),
                difficulty=diff_enum,
                is_pyq=False,
                source="Internet Web Mock"
            )
            db.add(q)
            db.commit()
            db.refresh(q)

            # Insert Options
            for opt in q_data["options"]:
                is_corr = 1 if opt["option_label"] == q_data["correct_option"] else 0
                qo = QuestionOption(
                    question_id=q.id,
                    option_text=opt["option_text"],
                    option_label=opt["option_label"],
                    is_correct=is_corr
                )
                db.add(qo)

            # Link to mock test
            mtq = MockTestQuestion(
                mock_test_id=mock_test.id,
                question_id=q.id,
                question_order=idx + 1
            )
            db.add(mtq)

        db.commit()
        print(f"Mock Test created successfully! ID: {mock_test.id}. Added {len(questions_data)} questions.")
    except Exception as e:
        db.rollback()
        print(f"Database error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    generate_and_insert_mock_test()
