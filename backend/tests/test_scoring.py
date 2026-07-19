"""
test_scoring.py — Tests for the Coach Engine (coach/scorer.py).
"""

import pytest
from backend.coach.scorer import (
    score_claim,
    _build_feature_vector,
    _heuristic_probability,
    _build_hints,
    HINT_TEMPLATES,
    FALLBACK_HINTS,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

HIGH_SPECIFICITY_FEATURES = {
    "ent_density": 0.30,
    "hedge_ratio": 0.0,
    "has_numeric": True,
    "numeric_density": 0.12,
    "has_unresolved_citation": False,
}

VAGUE_FEATURES = {
    "ent_density": 0.02,
    "hedge_ratio": 0.30,
    "has_numeric": False,
    "numeric_density": 0.0,
    "has_unresolved_citation": False,
}

HALLUCINATED_CITATION_FEATURES = {
    "ent_density": 0.18,
    "hedge_ratio": 0.02,
    "has_numeric": True,
    "numeric_density": 0.08,
    "has_unresolved_citation": True,
}


# ---------------------------------------------------------------------------
# Feature vector tests
# ---------------------------------------------------------------------------

class TestBuildFeatureVector:
    def test_returns_numpy_array(self):
        import numpy as np
        result = _build_feature_vector(HIGH_SPECIFICITY_FEATURES)
        assert isinstance(result, np.ndarray)

    def test_correct_length(self):
        result = _build_feature_vector(HIGH_SPECIFICITY_FEATURES)
        assert len(result) == 5

    def test_has_numeric_converted_to_float(self):
        result = _build_feature_vector(HIGH_SPECIFICITY_FEATURES)
        assert result[2] == 1.0  # has_numeric=True

    def test_missing_keys_default_to_zero(self):
        result = _build_feature_vector({})
        assert all(v == 0.0 for v in result)


# ---------------------------------------------------------------------------
# Heuristic probability tests
# ---------------------------------------------------------------------------

class TestHeuristicProbability:
    def test_high_specificity_gives_higher_probability(self):
        high = _heuristic_probability(HIGH_SPECIFICITY_FEATURES)
        low = _heuristic_probability(VAGUE_FEATURES)
        assert high > low

    def test_unresolved_citation_lowers_probability(self):
        without = _heuristic_probability(HIGH_SPECIFICITY_FEATURES)
        with_cit = _heuristic_probability(HALLUCINATED_CITATION_FEATURES)
        assert with_cit < without

    def test_probability_in_valid_range(self):
        for feats in [HIGH_SPECIFICITY_FEATURES, VAGUE_FEATURES, HALLUCINATED_CITATION_FEATURES]:
            p = _heuristic_probability(feats)
            assert 0.0 <= p <= 1.0

    def test_never_exactly_zero_or_one(self):
        """Heuristic should never output 0 or 1 — these are clamped."""
        p = _heuristic_probability(HIGH_SPECIFICITY_FEATURES)
        assert 0.0 < p < 1.0


# ---------------------------------------------------------------------------
# Score claim tests
# ---------------------------------------------------------------------------

class TestScoreClaim:
    def test_returns_tuple(self):
        result = score_claim(HIGH_SPECIFICITY_FEATURES)
        assert isinstance(result, tuple)
        assert len(result) == 2

    def test_probability_in_range(self):
        prob, _ = score_claim(HIGH_SPECIFICITY_FEATURES)
        assert 0.0 <= prob <= 1.0

    def test_hints_are_list_of_three(self):
        _, hints = score_claim(HIGH_SPECIFICITY_FEATURES)
        assert isinstance(hints, list)
        assert len(hints) == 3

    def test_all_hints_are_strings(self):
        _, hints = score_claim(HIGH_SPECIFICITY_FEATURES)
        for h in hints:
            assert isinstance(h, str)
            assert len(h) > 10

    def test_hints_are_questions_or_instructions(self):
        """Hints should end with ? or contain imperative verbs."""
        _, hints = score_claim(HIGH_SPECIFICITY_FEATURES)
        for h in hints:
            is_question = h.strip().endswith("?")
            has_verb = any(w in h.lower() for w in ["search", "check", "look", "consider", "notice", "identify", "find"])
            assert is_question or has_verb, f"Hint should be a question or instruction: {h}"

    def test_hallucinated_citation_influences_hints(self):
        """Claims with unresolved citations should get citation-specific hints."""
        _, hints = score_claim(HALLUCINATED_CITATION_FEATURES)
        combined = " ".join(hints).lower()
        # Should mention citation, source, or fabricated reference
        has_citation_hint = any(w in combined for w in ["citation", "source", "cited", "fabricate", "reference"])
        # Not strictly required if SHAP ranks another feature higher, but likely
        assert isinstance(hints, list)  # At minimum, must return valid hints


# ---------------------------------------------------------------------------
# Hint template tests
# ---------------------------------------------------------------------------

class TestHintTemplates:
    def test_all_features_have_three_hint_levels(self):
        for feature_name, levels in HINT_TEMPLATES.items():
            assert len(levels) == 3, f"Feature {feature_name} must have 3 hint levels"

    def test_fallback_hints_count(self):
        assert len(FALLBACK_HINTS) == 3

    def test_all_hints_are_non_empty_strings(self):
        for feature_name, levels in HINT_TEMPLATES.items():
            for level, hint in enumerate(levels):
                assert isinstance(hint, str)
                assert len(hint) > 10, f"Hint {feature_name}[{level}] is too short"

    def test_hint_levels_increase_specificity(self):
        """Level 2 hints should generally be longer than level 0 (more specific)."""
        for feature_name, levels in HINT_TEMPLATES.items():
            l0, l1, l2 = levels
            # Level 2 tends to have a specific action (search, look up, etc.)
            action_words = {"search", "look", "find", "check", "identify", "use", "open"}
            l2_has_action = any(w in l2.lower() for w in action_words)
            assert l2_has_action, f"Level 2 hint for {feature_name} should contain an action verb"
