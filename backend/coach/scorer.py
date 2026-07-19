"""
scorer.py — Coach Engine: XGBoost + SHAP risk scorer and hint generator.

Architecture (PRD §10.2):
  - Input: the _features dict produced by extractor.py for a claim.
  - Output: a probability score (the "AI's own Predict-equivalent") and
    a list of graduated hint strings (three levels, from least to most specific).

For the MVP, the XGBoost model is trained on a synthetic labelled dataset
seeded with real claims from the community_claim_bank. In production this
would be replaced with a model trained on labelled outcomes from the
triangulation pipeline.

The SHAP explainability layer converts feature importances into the
natural-language hint templates defined in PRD §5.4.
"""

from __future__ import annotations

import os
import pickle
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

# Graceful imports — libraries may not be present in lightweight test environments
try:
    from xgboost import XGBClassifier
    import shap
    _XGBOOST_AVAILABLE = True
except ImportError:
    _XGBOOST_AVAILABLE = False

MODEL_PATH = Path(__file__).parent / "coach_model.pkl"

# ---------------------------------------------------------------------------
# Feature vector construction
# ---------------------------------------------------------------------------

FEATURE_NAMES = [
    "ent_density",
    "hedge_ratio",
    "has_numeric",
    "numeric_density",
    "has_unresolved_citation",
]


def _build_feature_vector(features: Dict[str, Any]) -> np.ndarray:
    """Convert the _features dict from extractor to a numpy feature vector."""
    return np.array([
        float(features.get("ent_density", 0.0)),
        float(features.get("hedge_ratio", 0.0)),
        1.0 if features.get("has_numeric", False) else 0.0,
        float(features.get("numeric_density", 0.0)),
        1.0 if features.get("has_unresolved_citation", False) else 0.0,
    ], dtype=np.float32)


# ---------------------------------------------------------------------------
# Synthetic training data — representative of real AI hallucination patterns
# ---------------------------------------------------------------------------

# Each row: [ent_density, hedge_ratio, has_numeric, numeric_density, has_unresolved_citation]
# Label: 1 = claim is TRUE (supported), 0 = claim is FALSE (unsupported/hallucinated)
_TRAIN_X = np.array([
    # High entity density, no hedge, numeric — likely specific & checkable → often true
    [0.30, 0.00, 1.0, 0.10, 0.0],  # 1
    [0.25, 0.02, 1.0, 0.08, 0.0],  # 1
    [0.20, 0.01, 1.0, 0.05, 0.0],  # 1
    [0.35, 0.00, 0.0, 0.00, 0.0],  # 1
    [0.28, 0.03, 1.0, 0.12, 0.0],  # 1
    # High hedge, no numeric, no entities — vague claims → often false/unverifiable
    [0.05, 0.20, 0.0, 0.00, 0.0],  # 0
    [0.02, 0.30, 0.0, 0.00, 0.0],  # 0
    [0.10, 0.25, 0.0, 0.00, 0.1],  # 0
    [0.08, 0.18, 0.0, 0.00, 0.0],  # 0
    [0.04, 0.22, 0.0, 0.00, 0.0],  # 0
    # Unresolved citation — hallucinated source → often false
    [0.15, 0.05, 1.0, 0.06, 1.0],  # 0
    [0.20, 0.02, 1.0, 0.08, 1.0],  # 0
    [0.12, 0.04, 0.0, 0.00, 1.0],  # 0
    # Mixed signals
    [0.18, 0.08, 1.0, 0.04, 0.0],  # 1
    [0.22, 0.10, 0.0, 0.00, 0.0],  # 1
    [0.15, 0.12, 1.0, 0.05, 0.5],  # 0
    [0.10, 0.15, 1.0, 0.03, 0.0],  # 0
    [0.30, 0.05, 1.0, 0.10, 0.0],  # 1
    [0.25, 0.04, 1.0, 0.07, 0.0],  # 1
    [0.05, 0.25, 0.0, 0.00, 1.0],  # 0
], dtype=np.float32)

_TRAIN_Y = np.array([1,1,1,1,1, 0,0,0,0,0, 0,0,0, 1,1,0,0,1,1,0], dtype=np.int32)


# ---------------------------------------------------------------------------
# Model loading / training
# ---------------------------------------------------------------------------

def _train_and_save_model() -> "XGBClassifier":
    """Train the XGBoost model on synthetic data and persist to disk."""
    model = XGBClassifier(
        n_estimators=50,
        max_depth=3,
        learning_rate=0.2,
        use_label_encoder=False,
        eval_metric="logloss",
        random_state=42,
        verbosity=0,
    )
    model.fit(_TRAIN_X, _TRAIN_Y)
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f)
    return model


def _load_model() -> Optional["XGBClassifier"]:
    """Load trained model from disk, or train a fresh one."""
    if not _XGBOOST_AVAILABLE:
        return None
    if MODEL_PATH.exists():
        try:
            with open(MODEL_PATH, "rb") as f:
                return pickle.load(f)
        except Exception:
            pass
    return _train_and_save_model()


_model: Optional["XGBClassifier"] = None


def _get_model() -> Optional["XGBClassifier"]:
    global _model
    if _model is None:
        _model = _load_model()
    return _model


# ---------------------------------------------------------------------------
# SHAP → hint template mapping (PRD §5.4)
# ---------------------------------------------------------------------------

# Map feature name → (hint_level_1, hint_level_2, hint_level_3)
# Level 1: metacognitive awareness; Level 2: directional guidance;
# Level 3: specific investigative action
HINT_TEMPLATES = {
    "ent_density": (
        "This claim mentions specific named entities. Does your general knowledge support them?",
        "Consider looking up the named people or organisations mentioned — do they exist as described?",
        "Search Wikipedia for the primary named entity in this claim and verify the stated relationship.",
    ),
    "hedge_ratio": (
        "Notice the language in this claim. How certain does it sound?",
        "Hedging words like 'possibly' or 'some' often signal that a claim is less verifiable — is that the case here?",
        "Identify every hedging word in this claim. Does removing them change the meaning enough to fact-check?",
    ),
    "has_numeric": (
        "This claim contains a specific number. Numbers are easier to verify than vague statements.",
        "Does the percentage or figure in this claim seem plausible given what you know about the topic?",
        "Use the Google Fact Check Tools link above to search for this exact statistic and its original source.",
    ),
    "numeric_density": (
        "Multiple numbers appear in this claim. More numbers means more specific — and more ways to be wrong.",
        "Which of the numbers in this claim is the easiest to verify independently?",
        "Search for the most specific number in this claim on Wikipedia or a government dataset.",
    ),
    "has_unresolved_citation": (
        "This claim appears to reference a source. Can you identify what that source actually is?",
        "AI systems sometimes fabricate citations. Before trusting this, try to find the actual source it points to.",
        "Search directly for the cited work (author + year if given). Does it exist, and does it say what the claim claims?",
    ),
}

# Fallback hints when no dominant SHAP feature is identifiable
FALLBACK_HINTS = (
    "Before looking at evidence, what does your general knowledge tell you about this topic?",
    "Try a quick lateral search: open a new tab, search the key terms, and scan the first three results.",
    "Check the Wikipedia article on the main subject of this claim and compare what it says.",
)


def _get_shap_top_features(model, feature_vector: np.ndarray) -> List[str]:
    """
    Compute SHAP values and return feature names sorted by absolute importance.
    """
    try:
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(feature_vector.reshape(1, -1))
        # For binary classification, shap_values may be a list [neg, pos]
        if isinstance(shap_values, list):
            vals = shap_values[1][0]
        else:
            vals = shap_values[0]
        ranked = sorted(
            zip(FEATURE_NAMES, np.abs(vals)),
            key=lambda x: x[1],
            reverse=True,
        )
        return [name for name, _ in ranked if _ > 1e-6]
    except Exception:
        return []


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def score_claim(features: Dict[str, Any]) -> Tuple[float, List[str]]:
    """
    Score a claim and generate graduated hints.

    Returns:
        (ai_probability, [hint_level_1, hint_level_2, hint_level_3])
        ai_probability: float 0–1, the AI's own confidence the claim is TRUE.
    """
    fv = _build_feature_vector(features)
    model = _get_model()

    if model is not None:
        try:
            prob = float(model.predict_proba(fv.reshape(1, -1))[0][1])
            top_features = _get_shap_top_features(model, fv)
        except Exception:
            prob = _heuristic_probability(features)
            top_features = []
    else:
        prob = _heuristic_probability(features)
        top_features = []

    hints = _build_hints(features, top_features)
    return round(prob, 3), hints


def _heuristic_probability(features: Dict[str, Any]) -> float:
    """
    Simple heuristic probability when XGBoost is unavailable.
    Mirrors the feature intuitions in the training data.
    """
    score = 0.5
    score += features.get("ent_density", 0) * 0.4
    score -= features.get("hedge_ratio", 0) * 0.6
    score += 0.1 if features.get("has_numeric") else 0
    score -= 0.2 if features.get("has_unresolved_citation") else 0
    return float(np.clip(score, 0.05, 0.95))


def _build_hints(features: Dict[str, Any], top_features: List[str]) -> List[str]:
    """
    Build three graduated hints from top SHAP features.
    Falls back to generic hints if no dominant feature.
    """
    # Determine which features are most salient for this specific claim
    salient = top_features[:] if top_features else []

    # Add rule-based salient features for the fallback path
    if not salient:
        if features.get("has_unresolved_citation"):
            salient.append("has_unresolved_citation")
        if features.get("has_numeric"):
            salient.append("has_numeric")
        if features.get("ent_density", 0) > 0.15:
            salient.append("ent_density")
        if features.get("hedge_ratio", 0) > 0.10:
            salient.append("hedge_ratio")

    hints = []
    seen_features = set()
    for level in range(3):
        if salient and (level < len(salient)):
            feat = salient[level]
            if feat in HINT_TEMPLATES:
                hints.append(HINT_TEMPLATES[feat][level])
                seen_features.add(feat)
                continue
        # Fall back to generic hint for this level
        hints.append(FALLBACK_HINTS[level])

    return hints[:3]
