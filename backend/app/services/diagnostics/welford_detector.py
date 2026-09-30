"""
Welford's Algorithm & Burnout Anomaly Detector.

Calculates single-pass, numerically stable running mean and sample variance for mock test scores:
M_1 = x_1, S_1 = 0
M_k = M_{k-1} + (x_k - M_{k-1}) / k
S_k = S_{k-1} + (x_k - M_{k-1}) * (x_k - M_k)
Variance = S_k / (k - 1) for k > 1

Burnout Anomaly Trigger:
- k >= 5 tests completed
- Sample standard deviation > 0
- Z-score < -2.0 (drop > 2 standard deviations)
- Absolute drop >= 15.0 percentage points below running mean
"""

import math
from typing import Tuple

def update_welford_stats(
    count: int,
    mean: float,
    m2: float,
    new_value: float
) -> Tuple[int, float, float, float, float]:
    """
    Updates running stats with a new observation.
    Returns: (new_count, new_mean, new_m2, new_variance, new_std_dev)
    """
    k = (count or 0) + 1
    old_mean = mean or 0.0
    old_m2 = m2 or 0.0

    delta = new_value - old_mean
    new_mean = old_mean + (delta / k)
    delta2 = new_value - new_mean
    new_m2 = old_m2 + (delta * delta2)

    new_variance = (new_m2 / (k - 1)) if k > 1 else 0.0
    new_std_dev = math.sqrt(max(0.0, new_variance))

    return k, float(new_mean), float(new_m2), float(new_variance), float(new_std_dev)

def detect_burnout_flag(
    tests_completed: int,
    running_mean: float,
    running_std_dev: float,
    latest_score: float
) -> str:
    """
    Evaluates burnout anomaly condition.
    Returns 'Critical', 'Warning', or 'Normal'.
    """
    if (tests_completed or 0) < 5 or (running_std_dev or 0.0) <= 0.0:
        return "Normal"

    drop = (running_mean or 0.0) - latest_score
    z_score = (latest_score - (running_mean or 0.0)) / running_std_dev

    if z_score < -2.0 and drop >= 15.0:
        return "Critical"
    elif z_score < -1.5 and drop >= 10.0:
        return "Warning"

    return "Normal"

def derive_archetype(tests_completed: int, running_mean: float, score_velocity: float) -> str:
    """
    Determines learner archetype based on consistency, volume, and velocity.
    """
    if (tests_completed or 0) < 3:
        return "The Exploring Learner"

    if score_velocity > 2.0:
        return "The Rapid Sprinter"
    elif score_velocity >= 0.0:
        if (running_mean or 0.0) >= 75.0:
            return "The Consistent High-Flyer"
        else:
            return "The Steady Builder"
    else:
        if (running_mean or 0.0) >= 70.0:
            return "The Calibrated Veteran"
        else:
            return "The Recalibrating Striver"
