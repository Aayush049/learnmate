"""
Time-Decayed Topic Mastery Index (TMI).

Applies exponential recency decay over past question attempts with a 14-day half-life.
lambda = ln(2) / 14 ~ 0.04951

TMI = (0.60 * BKT_Probability + 0.40 * DecayedAccuracy) * 100
"""

import math
from datetime import datetime, timezone
from typing import List, Dict, Any

HALF_LIFE_DAYS = 14.0
LAMBDA_DECAY = math.log(2) / HALF_LIFE_DAYS

def calculate_time_decayed_accuracy(attempts: List[Dict[str, Any]]) -> float:
    """
    Computes exponentially weighted accuracy from historical attempts list.
    Each item in attempts is expected to have:
    - 'timestamp': datetime (UTC or naive)
    - 'is_correct': bool
    """
    if not attempts:
        return 0.0

    now = datetime.now(timezone.utc)
    total_weight = 0.0
    weighted_correct = 0.0

    for att in attempts:
        ts = att.get("timestamp")
        if not ts:
            continue
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)

        days_ago = max(0.0, (now - ts).total_seconds() / (24.0 * 3600.0))
        weight = math.exp(-LAMBDA_DECAY * days_ago)
        total_weight += weight
        if att.get("is_correct"):
            weighted_correct += weight

    if total_weight <= 0:
        return 0.0

    return float(weighted_correct / total_weight)

def compute_tmi_score(bkt_prob: float, decayed_accuracy: float) -> float:
    """
    Blends BKT latent probability and empirical decayed accuracy into a 0.0 - 100.0 score.
    """
    bkt = max(0.0, min(1.0, bkt_prob if bkt_prob is not None else 0.10))
    acc = max(0.0, min(1.0, decayed_accuracy if decayed_accuracy is not None else 0.0))
    tmi = (0.60 * bkt + 0.40 * acc) * 100.0
    return float(round(max(0.0, min(100.0, tmi)), 2))
