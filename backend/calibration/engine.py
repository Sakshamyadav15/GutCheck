"""
engine.py — Calibration Engine: Brier score, reliability diagram, Confidence Archetype.
Implements PRD §10.3 exactly.
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Tuple


# ---------------------------------------------------------------------------
# Brier Score (PRD §10.3)
# ---------------------------------------------------------------------------

def brier_score(probability: float, outcome: float) -> float:
    """
    Compute the Brier score for a single prediction.
      probability: user's stated probability (0–1)
      outcome: 1 (supported), 0 (contradicted), 0.5 (contested/mixed)
    Lower Brier score = better calibration.
    """
    p = max(0.0, min(1.0, float(probability)))
    o = float(outcome)
    return round((p - o) ** 2, 4)


def calibration_points(probability: float, outcome: float) -> int:
    """
    Convert Brier score to gamification points (0–100).
    Perfect = 100; worst possible = 0.
    """
    bs = brier_score(probability, outcome)
    return max(0, round((1.0 - bs) * 100))


# ---------------------------------------------------------------------------
# Reliability Diagram (PRD §10.3)
# ---------------------------------------------------------------------------

def reliability_diagram_data(
    predictions: List[Tuple[float, float]],
) -> Dict[str, Any]:
    """
    Compute a reliability diagram from a list of (probability, outcome) pairs.

    Returns:
        {
          "bins": [{"confidence_mid": float, "accuracy": float, "count": int}, ...],
          "overall_brier": float,
          "calibration_error": float,  # mean absolute calibration error
        }

    Bins predictions into decile buckets (10 bins of width 0.1),
    computes actual accuracy within each bin.
    """
    if not predictions:
        return {"bins": [], "overall_brier": None, "calibration_error": None}

    bin_count = 10
    bins: List[Dict[str, Any]] = []
    bucket_preds: List[List[Tuple[float, float]]] = [[] for _ in range(bin_count)]

    brier_sum = 0.0
    for p, o in predictions:
        p = max(0.0, min(1.0, float(p)))
        o = float(o)
        brier_sum += (p - o) ** 2
        bucket_idx = min(int(p * bin_count), bin_count - 1)
        bucket_preds[bucket_idx].append((p, o))

    calibration_errors = []
    for i, bucket in enumerate(bucket_preds):
        if not bucket:
            continue
        confidence_mid = (i + 0.5) / bin_count
        actual_accuracy = sum(o for _, o in bucket) / len(bucket)
        calibration_errors.append(abs(confidence_mid - actual_accuracy))
        bins.append({
            "confidence_mid": round(confidence_mid, 2),
            "accuracy": round(actual_accuracy, 3),
            "count": len(bucket),
        })

    overall_brier = round(brier_sum / len(predictions), 4)
    calibration_error = round(sum(calibration_errors) / len(calibration_errors), 4) if calibration_errors else None

    return {
        "bins": bins,
        "overall_brier": overall_brier,
        "calibration_error": calibration_error,
    }


# ---------------------------------------------------------------------------
# Confidence Archetype (PRD §10.3 / §5.6)
# ---------------------------------------------------------------------------

def compute_archetype(
    predictions: List[Tuple[float, float]],
) -> str:
    """
    Determine the user's Confidence Archetype from their calibration curve shape.

    Archetypes:
      - "Well-Calibrated": curve close to the ideal diagonal
      - "Overconfident / Confident Truster": systematically above diagonal
        (user states high confidence but is more often wrong)
      - "Underconfident / Cautious Skeptic": systematically below diagonal
        (user hedges too much)
      - "Inconsistent": high variance, no systematic bias
    """
    if len(predictions) < 3:
        return "Emerging"

    signed_errors = []
    for p, o in predictions:
        p = max(0.0, min(1.0, float(p)))
        o = float(o)
        # Positive = overconfident on this prediction
        signed_errors.append(p - o)

    mean_signed = sum(signed_errors) / len(signed_errors)
    variance = sum((e - mean_signed) ** 2 for e in signed_errors) / len(signed_errors)
    std = math.sqrt(variance)

    if abs(mean_signed) < 0.10 and std < 0.20:
        return "Well-Calibrated"
    elif mean_signed > 0.12:
        return "Confident Truster"
    elif mean_signed < -0.12:
        return "Cautious Skeptic"
    elif std > 0.30:
        return "Inconsistent"
    else:
        return "Developing"


# ---------------------------------------------------------------------------
# Teach Forward note generator (PRD §5.6)
# ---------------------------------------------------------------------------

REASON_TAG_LESSONS: Dict[str, Dict[str, str]] = {
    "sounds_oddly_specific": {
        "correct": "Specific numbers and details can signal accurate recall — your instinct served you well here.",
        "wrong": "High specificity can also be a hallucination signal — AI models tend to fabricate precise-sounding details. Specificity alone does not equal accuracy.",
    },
    "no_source_given": {
        "correct": "Sourceless claims can still be accurate — your skepticism was appropriate even when the claim turned out true.",
        "wrong": "You caught a sourceless claim and it was indeed inaccurate. Absence of citation is a genuine reliability signal.",
    },
    "matches_what_I_know": {
        "correct": "Prior knowledge aligned with the evidence — good calibration.",
        "wrong": "Your prior knowledge was contradicted by the evidence. This is called anchoring — what you already believed influenced your confidence more than the claim's verifiability signals.",
    },
    "confident_tone": {
        "correct": "Confident tone aligned with accuracy here, but this is coincidental — confident language is not a reliable accuracy signal.",
        "wrong": "You anchored on fluency. Confident tone does not equal accuracy — AI systems produce equally fluent text for both true and false claims.",
    },
    "just_trusting_the_AI": {
        "correct": "Trusting the AI happened to work here, but relying on this heuristic systematically will calibrate you poorly over time.",
        "wrong": "Trusting AI output without independent evaluation is exactly what this tool exists to address. AI systems confidently state false information — this was a live example.",
    },
    "vague_hedged_language": {
        "correct": "Hedged language did indicate lower reliability in this case. Noticing hedge words is a solid evaluative habit.",
        "wrong": "Hedging can indicate genuine uncertainty rather than inaccuracy — this claim was hedged but turned out supported by evidence.",
    },
}

DEFAULT_LESSONS = {
    "correct": "Your calibration was accurate on this claim. Continue building the habit of committing a prediction before seeking evidence.",
    "wrong": "This claim challenged your calibration. Review the evidence sources and consider what signals you could have noticed earlier.",
    "contested": "This was a genuinely contested claim — the evidence was mixed. Your instinct is measured against the partial-credit outcome.",
}


def teach_forward(
    reason_tag: Optional[str],
    outcome: float,
    user_probability: float,
) -> str:
    """
    Generate the Teach Forward note (PRD §5.6):
    one line naming the specific skill or bias just exercised,
    drawn from the reason tag and what happened at Reveal.
    """
    user_p = max(0.0, min(1.0, float(user_probability)))
    # Determine whether user was directionally correct
    if outcome == 0.5:
        direction = "contested"
    elif abs(user_p - outcome) <= 0.30:
        direction = "correct"
    else:
        direction = "wrong"

    if reason_tag and reason_tag in REASON_TAG_LESSONS:
        lessons = REASON_TAG_LESSONS[reason_tag]
        if direction in lessons:
            return lessons[direction]
        return DEFAULT_LESSONS.get(direction, DEFAULT_LESSONS["contested"])

    return DEFAULT_LESSONS.get(direction, DEFAULT_LESSONS["contested"])


# ---------------------------------------------------------------------------
# XP and Streak
# ---------------------------------------------------------------------------

XP_PER_CALIBRATE = 10      # base XP for completing Calibrate
XP_INVESTIGATE_BONUS = 5   # bonus for using Investigate before Reveal (PRD §8)
XP_DUEL_BONUS = 8          # bonus for Duel participation (PRD §8)
XP_PERFECT_BONUS = 20      # bonus for Brier score < 0.05


def compute_xp(
    brier: float,
    used_investigate: bool,
    is_duel: bool,
    hints_used: int,
) -> Dict[str, int]:
    """
    Compute XP breakdown for a single completed PIRC cycle.
    Hint usage docks max Calibrate points (PRD §5.4).
    """
    # Calibrate XP: base minus hint penalty
    hint_penalty = hints_used * 3
    calibrate_xp = max(0, XP_PER_CALIBRATE - hint_penalty)

    # Brier bonus
    perfect_bonus = XP_PERFECT_BONUS if brier < 0.05 else 0

    # Investigate bonus
    investigate_bonus = XP_INVESTIGATE_BONUS if used_investigate else 0

    # Duel participation bonus
    duel_bonus = XP_DUEL_BONUS if is_duel else 0

    total = calibrate_xp + perfect_bonus + investigate_bonus + duel_bonus
    return {
        "calibrate_xp": calibrate_xp,
        "perfect_bonus": perfect_bonus,
        "investigate_bonus": investigate_bonus,
        "duel_bonus": duel_bonus,
        "total": total,
    }


def compute_level(xp: int) -> int:
    """Simple XP → level mapping. 100 XP per level."""
    return max(1, xp // 100 + 1)
