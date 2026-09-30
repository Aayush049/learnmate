"""
Relative Time Index (RTI) & 4-Quadrant Cognitive Load Matrix.

Pedagogical Quadrants:
1. Fast Master (Fluency): RTI <= 0.0 and Correct
2. Methodical (Deliberate): RTI > 0.0 and Correct
3. Speed Trap (Careless / Rushed): RTI < -0.4 and Incorrect
4. High Load (Conceptual Struggle): RTI >= -0.4 and Incorrect
"""

def calculate_rti(time_taken: float, mu_topic: float = 45.0, sigma_topic: float = 15.0) -> float:
    """
    Calculates standardized Z-score of time taken relative to topic benchmark.
    """
    if sigma_topic <= 0:
        return 0.0
    return float((time_taken - mu_topic) / sigma_topic)

def classify_cognitive_quadrant(rti: float, is_correct: bool) -> str:
    """
    Maps RTI and correctness to one of the 4 cognitive load quadrants.
    """
    if is_correct:
        if rti <= 0.0:
            return "Fast Master"
        else:
            return "Methodical"
    else:
        if rti < -0.4:
            return "Speed Trap"
        else:
            return "High Load"
