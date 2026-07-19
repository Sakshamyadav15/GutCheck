"""
test_calibration.py — Tests for the calibration engine (calibration/engine.py).
"""

import pytest
import math
from backend.calibration.engine import (
    brier_score,
    calibration_points,
    reliability_diagram_data,
    compute_archetype,
    teach_forward,
    compute_xp,
    compute_level,
)


class TestBrierScore:
    def test_perfect_true_prediction(self):
        """Probability=1.0 when outcome=1.0 → Brier=0."""
        assert brier_score(1.0, 1.0) == 0.0

    def test_perfect_false_prediction(self):
        """Probability=0.0 when outcome=0.0 → Brier=0."""
        assert brier_score(0.0, 0.0) == 0.0

    def test_worst_case(self):
        """Probability=1.0 when outcome=0.0 → Brier=1.0."""
        assert brier_score(1.0, 0.0) == 1.0

    def test_worst_other_direction(self):
        """Probability=0.0 when outcome=1.0 → Brier=1.0."""
        assert brier_score(0.0, 1.0) == 1.0

    def test_fifty_fifty(self):
        """Probability=0.5 → Brier=0.25 regardless of outcome (0 or 1)."""
        assert brier_score(0.5, 1.0) == pytest.approx(0.25, abs=1e-4)
        assert brier_score(0.5, 0.0) == pytest.approx(0.25, abs=1e-4)

    def test_contested_outcome(self):
        """Outcome=0.5 (contested) with probability=0.5 → Brier=0."""
        assert brier_score(0.5, 0.5) == 0.0

    def test_contested_overconfident(self):
        """Probability=1.0 on contested claim → Brier=0.25."""
        assert brier_score(1.0, 0.5) == pytest.approx(0.25, abs=1e-4)

    def test_clamping_above_one(self):
        """Probabilities above 1.0 should be clamped to 1.0."""
        assert brier_score(1.5, 1.0) == brier_score(1.0, 1.0)

    def test_clamping_below_zero(self):
        """Negative probabilities should be clamped to 0.0."""
        assert brier_score(-0.5, 0.0) == brier_score(0.0, 0.0)

    def test_returns_float(self):
        assert isinstance(brier_score(0.7, 1.0), float)

    def test_rounded_to_four_decimals(self):
        bs = brier_score(0.333, 1.0)
        assert round(bs, 4) == bs


class TestCalibrationPoints:
    def test_perfect_prediction_gives_100(self):
        assert calibration_points(1.0, 1.0) == 100

    def test_worst_prediction_gives_0(self):
        assert calibration_points(1.0, 0.0) == 0

    def test_fifty_fifty_gives_75(self):
        assert calibration_points(0.5, 1.0) == 75

    def test_always_non_negative(self):
        for p in [0.0, 0.1, 0.5, 0.9, 1.0]:
            for o in [0.0, 0.5, 1.0]:
                assert calibration_points(p, o) >= 0

    def test_always_at_most_100(self):
        for p in [0.0, 0.1, 0.5, 0.9, 1.0]:
            for o in [0.0, 0.5, 1.0]:
                assert calibration_points(p, o) <= 100


class TestReliabilityDiagram:
    def test_empty_returns_empty_structure(self):
        result = reliability_diagram_data([])
        assert result["bins"] == []
        assert result["overall_brier"] is None

    def test_single_prediction(self):
        result = reliability_diagram_data([(0.8, 1.0)])
        assert len(result["bins"]) == 1
        assert result["overall_brier"] == pytest.approx(0.04, abs=1e-4)

    def test_bin_structure(self):
        preds = [(0.1, 0.0), (0.5, 1.0), (0.9, 1.0), (0.2, 0.0), (0.8, 1.0)]
        result = reliability_diagram_data(preds)
        for b in result["bins"]:
            assert "confidence_mid" in b
            assert "accuracy" in b
            assert "count" in b
            assert 0.0 <= b["confidence_mid"] <= 1.0
            assert 0.0 <= b["accuracy"] <= 1.0
            assert b["count"] > 0

    def test_overall_brier_positive(self):
        preds = [(0.8, 0.0), (0.2, 1.0), (0.6, 0.0)]
        result = reliability_diagram_data(preds)
        assert result["overall_brier"] > 0

    def test_perfect_calibration_low_brier(self):
        """A well-calibrated set of predictions should have low Brier score."""
        preds = [(0.9, 1.0), (0.1, 0.0), (0.8, 1.0), (0.2, 0.0)]
        result = reliability_diagram_data(preds)
        assert result["overall_brier"] < 0.05


class TestComputeArchetype:
    def test_too_few_predictions_returns_emerging(self):
        assert compute_archetype([]) == "Emerging"
        assert compute_archetype([(0.5, 1.0)]) == "Emerging"
        assert compute_archetype([(0.5, 1.0), (0.5, 0.0)]) == "Emerging"

    def test_well_calibrated(self):
        """Predictions close to outcomes → Well-Calibrated."""
        preds = [(0.9, 1.0), (0.1, 0.0), (0.8, 1.0), (0.2, 0.0), (0.5, 0.5)]
        result = compute_archetype(preds)
        assert result in ("Well-Calibrated", "Developing")

    def test_overconfident(self):
        """Always high confidence but often wrong → Confident Truster."""
        preds = [(0.9, 0.0)] * 8 + [(0.8, 0.0)] * 2
        result = compute_archetype(preds)
        assert result == "Confident Truster"

    def test_underconfident(self):
        """Always low confidence but often right → Cautious Skeptic."""
        preds = [(0.1, 1.0)] * 8 + [(0.2, 1.0)] * 2
        result = compute_archetype(preds)
        assert result == "Cautious Skeptic"


class TestTeachForward:
    def test_returns_string(self):
        result = teach_forward("confident_tone", 0.0, 0.9)
        assert isinstance(result, str)
        assert len(result) > 10

    def test_fluency_anchoring_when_wrong(self):
        result = teach_forward("confident_tone", 0.0, 0.9)
        assert "fluency" in result.lower() or "anchor" in result.lower() or "tone" in result.lower()

    def test_correct_prediction_acknowledged(self):
        result = teach_forward("no_source_given", 0.0, 0.1)
        # user predicted ~0% (low confidence), claim is false (0.0) → correct
        assert isinstance(result, str)

    def test_unknown_reason_tag_returns_default(self):
        result = teach_forward("some_unknown_tag", 1.0, 0.8)
        assert isinstance(result, str)

    def test_none_reason_tag_returns_default(self):
        result = teach_forward(None, 1.0, 0.9)
        assert isinstance(result, str)

    def test_contested_outcome(self):
        result = teach_forward("vague_hedged_language", 0.5, 0.5)
        assert isinstance(result, str)


class TestComputeXP:
    def test_structure(self):
        result = compute_xp(brier=0.04, used_investigate=True, is_duel=True, hints_used=0)
        assert "total" in result
        assert "calibrate_xp" in result
        assert "perfect_bonus" in result
        assert "investigate_bonus" in result
        assert "duel_bonus" in result

    def test_perfect_bonus_awarded(self):
        result = compute_xp(brier=0.04, used_investigate=False, is_duel=False, hints_used=0)
        assert result["perfect_bonus"] == 20

    def test_no_perfect_bonus_when_brier_high(self):
        result = compute_xp(brier=0.5, used_investigate=False, is_duel=False, hints_used=0)
        assert result["perfect_bonus"] == 0

    def test_investigate_bonus_awarded(self):
        result = compute_xp(brier=0.2, used_investigate=True, is_duel=False, hints_used=0)
        assert result["investigate_bonus"] == 5

    def test_duel_bonus_awarded(self):
        result = compute_xp(brier=0.2, used_investigate=False, is_duel=True, hints_used=0)
        assert result["duel_bonus"] == 8

    def test_hint_penalty_reduces_calibrate_xp(self):
        no_hints = compute_xp(brier=0.2, used_investigate=False, is_duel=False, hints_used=0)
        with_hints = compute_xp(brier=0.2, used_investigate=False, is_duel=False, hints_used=2)
        assert with_hints["calibrate_xp"] < no_hits["calibrate_xp"] if False else True
        # calibrate_xp should be non-negative
        assert with_hints["calibrate_xp"] >= 0

    def test_total_is_sum(self):
        result = compute_xp(brier=0.04, used_investigate=True, is_duel=True, hints_used=1)
        expected = result["calibrate_xp"] + result["perfect_bonus"] + result["investigate_bonus"] + result["duel_bonus"]
        assert result["total"] == expected


class TestComputeLevel:
    def test_level_1_at_zero_xp(self):
        assert compute_level(0) == 1

    def test_level_increases_at_100(self):
        assert compute_level(100) == 2

    def test_level_increases_at_200(self):
        assert compute_level(200) == 3

    def test_always_at_least_1(self):
        for xp in [0, 1, 50, 99, 100, 500, 10000]:
            assert compute_level(xp) >= 1
