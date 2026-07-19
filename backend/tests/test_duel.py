"""
test_duel.py — Tests for the Duel Orchestrator (duel/orchestrator.py).
"""

import pytest
from backend.duel.orchestrator import (
    create_duel_session,
    join_duel_session,
    lock_prediction,
    can_reveal,
    resolve_duel,
    compute_difficulty_index,
    _generate_invite_code,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

CLAIM_ID = "test-claim-001"
PLAYER_A = "player-a-uuid"
PLAYER_B = "player-b-uuid"


@pytest.fixture
def waiting_session():
    return create_duel_session(CLAIM_ID, PLAYER_A)


@pytest.fixture
def active_session(waiting_session):
    return join_duel_session(waiting_session, PLAYER_B)


@pytest.fixture
def both_locked_session(active_session):
    s = lock_prediction(active_session, PLAYER_A, 0.7)
    s = lock_prediction(s, PLAYER_B, 0.3)
    return s


# ---------------------------------------------------------------------------
# Invite code tests
# ---------------------------------------------------------------------------

class TestInviteCode:
    def test_length_six(self):
        code = _generate_invite_code()
        assert len(code) == 6

    def test_alphanumeric(self):
        code = _generate_invite_code()
        assert code.isalnum()

    def test_uppercase(self):
        code = _generate_invite_code()
        assert code == code.upper()

    def test_unique(self):
        codes = {_generate_invite_code() for _ in range(100)}
        # With 36^6 possibilities, collision in 100 draws is extremely unlikely
        assert len(codes) > 90


# ---------------------------------------------------------------------------
# Session creation tests
# ---------------------------------------------------------------------------

class TestCreateDuelSession:
    def test_returns_dict(self, waiting_session):
        assert isinstance(waiting_session, dict)

    def test_state_is_waiting(self, waiting_session):
        assert waiting_session["state"] == "waiting"

    def test_player_a_set(self, waiting_session):
        assert waiting_session["player_a_id"] == PLAYER_A

    def test_player_b_not_set(self, waiting_session):
        assert waiting_session["player_b_id"] is None

    def test_invite_code_present(self, waiting_session):
        assert len(waiting_session["invite_code"]) == 6

    def test_predictions_not_locked(self, waiting_session):
        assert waiting_session["player_a_locked"] is False
        assert waiting_session["player_b_locked"] is False


# ---------------------------------------------------------------------------
# Join session tests
# ---------------------------------------------------------------------------

class TestJoinDuelSession:
    def test_state_becomes_active(self, waiting_session):
        session = join_duel_session(waiting_session, PLAYER_B)
        assert session["state"] == "active"

    def test_player_b_attached(self, waiting_session):
        session = join_duel_session(waiting_session, PLAYER_B)
        assert session["player_b_id"] == PLAYER_B

    def test_cannot_join_active_session(self, active_session):
        with pytest.raises(ValueError, match="not in waiting state"):
            join_duel_session(active_session, "player-c")

    def test_cannot_join_twice(self, waiting_session):
        session = join_duel_session(waiting_session, PLAYER_B)
        with pytest.raises(ValueError):
            join_duel_session(session, "player-c")


# ---------------------------------------------------------------------------
# Prediction locking tests
# ---------------------------------------------------------------------------

class TestLockPrediction:
    def test_player_a_can_lock(self, active_session):
        session = lock_prediction(active_session, PLAYER_A, 0.7)
        assert session["player_a_locked"] is True
        assert session["player_a_prob"] == pytest.approx(0.7)

    def test_player_b_can_lock(self, active_session):
        session = lock_prediction(active_session, PLAYER_B, 0.3)
        assert session["player_b_locked"] is True
        assert session["player_b_prob"] == pytest.approx(0.3)

    def test_player_a_cannot_lock_twice(self, active_session):
        session = lock_prediction(active_session, PLAYER_A, 0.7)
        with pytest.raises(ValueError, match="already locked"):
            lock_prediction(session, PLAYER_A, 0.8)

    def test_unknown_player_raises(self, active_session):
        with pytest.raises(ValueError, match="not a participant"):
            lock_prediction(active_session, "stranger-uuid", 0.5)

    def test_probability_stored_as_float(self, active_session):
        session = lock_prediction(active_session, PLAYER_A, 0.65)
        assert isinstance(session["player_a_prob"], float)


# ---------------------------------------------------------------------------
# Can reveal tests
# ---------------------------------------------------------------------------

class TestCanReveal:
    def test_cannot_reveal_when_none_locked(self, active_session):
        assert can_reveal(active_session) is False

    def test_cannot_reveal_when_only_a_locked(self, active_session):
        session = lock_prediction(active_session, PLAYER_A, 0.7)
        assert can_reveal(session) is False

    def test_cannot_reveal_when_only_b_locked(self, active_session):
        session = lock_prediction(active_session, PLAYER_B, 0.3)
        assert can_reveal(session) is False

    def test_can_reveal_when_both_locked(self, both_locked_session):
        assert can_reveal(both_locked_session) is True


# ---------------------------------------------------------------------------
# Resolve duel tests
# ---------------------------------------------------------------------------

class TestResolveDuel:
    def test_winner_is_closer_player(self, both_locked_session):
        # Player A: 0.7, Player B: 0.3, outcome: 1.0
        # Brier A: (0.7-1.0)^2 = 0.09, Brier B: (0.3-1.0)^2 = 0.49 → A wins
        result = resolve_duel(both_locked_session, outcome=1.0)
        assert result["result"]["winner"] == "player_a"

    def test_tie_when_equally_distant(self, active_session):
        session = lock_prediction(active_session, PLAYER_A, 0.5)
        session = lock_prediction(session, PLAYER_B, 0.5)
        result = resolve_duel(session, outcome=1.0)
        assert result["result"]["winner"] == "tie"

    def test_brier_scores_present(self, both_locked_session):
        result = resolve_duel(both_locked_session, outcome=1.0)
        assert "player_a_brier" in result["result"]
        assert "player_b_brier" in result["result"]

    def test_points_present(self, both_locked_session):
        result = resolve_duel(both_locked_session, outcome=1.0)
        assert "player_a_points" in result["result"]
        assert "player_b_points" in result["result"]

    def test_disagreement_computed(self, both_locked_session):
        result = resolve_duel(both_locked_session, outcome=1.0)
        # |0.7 - 0.3| = 0.4
        assert result["result"]["disagreement"] == pytest.approx(0.4, abs=1e-3)

    def test_state_becomes_revealed(self, both_locked_session):
        result = resolve_duel(both_locked_session, outcome=1.0)
        assert result["state"] == "revealed"

    def test_resolved_at_set(self, both_locked_session):
        result = resolve_duel(both_locked_session, outcome=1.0)
        assert result["resolved_at"] is not None

    def test_player_b_wins_when_closer(self, active_session):
        session = lock_prediction(active_session, PLAYER_A, 0.1)
        session = lock_prediction(session, PLAYER_B, 0.8)
        result = resolve_duel(session, outcome=1.0)
        assert result["result"]["winner"] == "player_b"

    def test_contested_outcome(self, both_locked_session):
        # outcome=0.5 (contested)
        result = resolve_duel(both_locked_session, outcome=0.5)
        assert result["result"]["outcome"] == 0.5


# ---------------------------------------------------------------------------
# Difficulty index tests
# ---------------------------------------------------------------------------

class TestDifficultyIndex:
    def test_empty_list_returns_half(self):
        assert compute_difficulty_index([]) == 0.5

    def test_zero_disagreement(self):
        assert compute_difficulty_index([0.0, 0.0, 0.0]) == 0.0

    def test_full_disagreement(self):
        assert compute_difficulty_index([1.0, 1.0]) == 1.0

    def test_average_computed(self):
        result = compute_difficulty_index([0.2, 0.4, 0.6])
        assert result == pytest.approx(0.4, abs=1e-4)

    def test_single_element(self):
        assert compute_difficulty_index([0.75]) == pytest.approx(0.75)
