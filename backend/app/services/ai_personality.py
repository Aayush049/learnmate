import os
import google.generativeai as genai
from app.config import settings

def _get_configured_model():
    api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_api_key_here":
        return None
    try:
        genai.configure(api_key=api_key)
        return genai.GenerativeModel('gemini-flash-latest')
    except Exception as e:
        print(f"Error configuring Gemini model: {e}")
        return None

def generate_student_profile(performance_data: dict, weekly_activity: list) -> str:
    """
    Generate a personality/prep profile based on student's performance.
    """
    accuracy = performance_data.get('accuracy', 0)
    weak_names = [t['name'] for t in performance_data.get('weakTopics', []) if isinstance(t, dict) and 'name' in t]
    strong_names = [t['name'] for t in performance_data.get('strongTopics', []) if isinstance(t, dict) and 'name' in t]

    model = _get_configured_model()
    if not model:
        # Fallback profile when AI is not configured or in dev mode
        weak_str = ", ".join(weak_names) if weak_names else "General revision topics"
        strong_str = ", ".join(strong_names) if strong_names else "Foundational concepts"
        return f"""**Your Test Profile: The Strategic Builder**

You show consistent dedication with an overall accuracy of {accuracy}%. Your strengths in {strong_str} provide a solid scoring baseline for SSC JE.

**Action Plan:**
- Target your high-yield weak areas ({weak_str}) with focused 20-minute daily practice sessions.
- Review bookmarked formulas and IS code provisions 15 minutes before attempting full-length mocks.
- Maintain your current revision rhythm to steadily boost your speed and precision."""

    try:
        prompt = f"""
        You are an expert tutor and academic coach for SSC JE Civil Exam prep. Analyze this student's data and give them a "Candidate Profile" (like a Myers-Briggs personality for test takers) and 3 short, actionable tips. Be encouraging, concise, and professional. Keep it under 200 words.

        Data:
        Overall Accuracy: {accuracy}%
        Weak Topics: {weak_names}
        Strong Topics: {strong_names}

        Format your response like:
        **Your Test Profile: [Catchy Title]**
        [1 paragraph analysis]

        **Action Plan:**
        - [Tip 1]
        - [Tip 2]
        - [Tip 3]
        """
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        # Fallback gracefully in case of quota or network glitch
        weak_str = ", ".join(weak_names) if weak_names else "General revision topics"
        return f"""**Your Test Profile: The Analytical Aspirant**

Your accuracy is currently tracking at {accuracy}%. Keep honing your conceptual foundation across core SSC JE Civil topics.

**Action Plan:**
- Focus on strengthening key concepts in {weak_str}.
- Complete at least one timed mock test every 3 days.
- Revise previous year question patterns daily."""

def generate_study_plan(performance_data: dict, available_hours: int, upcoming_tests: list) -> str:
    weak = [t['name'] for t in performance_data.get('weakTopics', []) if isinstance(t, dict) and 'name' in t]
    model = _get_configured_model()
    if not model:
        return f"Study Plan ({available_hours} hrs/day):\n- 1 hr: Deep dive into weak topics ({', '.join(weak) if weak else 'Core Civil'})\n- 45 min: PYQ practice & formula flashcards\n- 15 min: Daily error log review"

    try:
        prompt = f"""You are an SSC JE academic coach. Create a weekly study plan for a student with {available_hours} hrs/day.
Weak topics: {weak}
Upcoming tests: {upcoming_tests}
Include daily focus, revision slots, and mistake-review time. Keep under 250 words."""
        return model.generate_content(prompt).text
    except Exception as e:
        return f"Study plan error: {e}"

def generate_mistake_explanation(topic: str, incorrect_answer: str, correct_answer: str) -> str:
    model = _get_configured_model()
    if not model:
        return f"For {topic}: '{correct_answer}' is the correct standard provision according to SSC JE Civil codes, whereas '{incorrect_answer}' violates typical boundary conditions or codal limits."

    try:
        prompt = f"Explain why '{incorrect_answer}' is wrong for {topic} and why '{correct_answer}' is correct in SSC JE Civil Engineering. Keep under 100 words, encouraging tone."
        return model.generate_content(prompt).text
    except Exception as e:
        return f"Mistake explanation error: {e}"
