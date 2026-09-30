"""
Bayesian Knowledge Tracing (BKT) Engine for LearnMate AI.

Implements two-step Bayesian update:
1. Posterior calculation P(L_t | Action)
2. Transition step P(L_{t+1}) = Posterior + (1 - Posterior) * P(T)

Default priors calibrated for SSC JE MCQ questions:
P(L_0) = 0.10 (Initial mastery)
P(T) = 0.15 (Transition / learning probability per question)
P(G) = 0.20 (Guess probability on 4-option MCQ)
P(S) = 0.10 (Slip / careless mistake probability)
"""

P_L0_DEFAULT = 0.10
P_T = 0.15
P_G = 0.20
P_S = 0.10

def update_bkt(p_l_prev: float, is_correct: bool) -> float:
    """
    Computes updated knowledge state probability P(L_{t+1}) given prior P(L_t) and correctness.
    Clamps bounds to [0.01, 0.99] to prevent mathematical degenerate states.
    """
    p_l = max(0.01, min(0.99, p_l_prev if p_l_prev is not None else P_L0_DEFAULT))

    if is_correct:
        numerator = p_l * (1.0 - P_S)
        denominator = (p_l * (1.0 - P_S)) + ((1.0 - p_l) * P_G)
    else:
        numerator = p_l * P_S
        denominator = (p_l * P_S) + ((1.0 - p_l) * (1.0 - P_G))

    if denominator == 0:
        p_l_updated = p_l
    else:
        p_l_updated = numerator / denominator

    # Transition step: learner might have learned from this step
    p_l_next = p_l_updated + (1.0 - p_l_updated) * P_T

    return float(max(0.01, min(0.99, p_l_next)))
