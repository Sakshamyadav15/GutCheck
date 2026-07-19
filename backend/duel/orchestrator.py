"""
orchestrator.py — Duel session management (PRD §6 / §10.4).

Manages the full duel lifecycle:
  - Create: generates a unique invite code, stores session state.
  - Join: second player attaches to the session.
  - Predict: each player locks their probability (server-enforced, no hindsight).
  - Reveal trigger: once both players are locked, reveal is unlocked.
  - Aggregation: difficulty_index computed from pairwise disagreement across all duels.
"""

import random
import string
import uuid
from datetime import datetime
from typing import Any, Dict, Optional


def _generate_invite_code(length: int = 6) -> str:
    """Generate a short, human-typeable invite code."""
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


# ---------------------------------------------------------------------------
# Session state helpers (operates on DB model dicts for stateless API layer)
# ---------------------------------------------------------------------------

def create_duel_session(claim_id: str, player_a_id: str) -> Dict[str, Any]:
    """Initialise a new duel session payload."""
    return {
        "duel_id": str(uuid.uuid4()),
        "claim_id": claim_id,
        "player_a_id": player_a_id,
        "player_b_id": None,
        "player_a_prob": None,
        "player_b_prob": None,
        "player_a_locked": False,
        "player_b_locked": False,
        "state": "waiting",
        "invite_code": _generate_invite_code(),
        "created_at": datetime.utcnow().isoformat(),
        "resolved_at": None,
    }


def join_duel_session(session: Dict[str, Any], player_b_id: str) -> Dict[str, Any]:
    """Attach the second player to a waiting session."""
    if session["state"] != "waiting":
        raise ValueError("Duel is not in waiting state — cannot join.")
    if session["player_b_id"] is not None:
        raise ValueError("Duel already has two players.")
    session["player_b_id"] = player_b_id
    session["state"] = "active"
    return session


def lock_prediction(
    session: Dict[str, Any],
    player_id: str,
    probability: float,
) -> Dict[str, Any]:
    """
    Lock a player's prediction.
    Server-enforces immutability: once locked, cannot be changed (PRD §5.3).
    """
    if session["player_a_id"] == player_id:
        if session["player_a_locked"]:
            raise ValueError("Player A has already locked their prediction.")
        session["player_a_prob"] = float(probability)
        session["player_a_locked"] = True
    elif session["player_b_id"] == player_id:
        if session["player_b_locked"]:
            raise ValueError("Player B has already locked their prediction.")
        session["player_b_prob"] = float(probability)
        session["player_b_locked"] = True
    else:
        raise ValueError(f"Player {player_id} is not a participant in this duel.")
    return session


def can_reveal(session: Dict[str, Any]) -> bool:
    """Both players must have locked before reveal is permitted."""
    return session["player_a_locked"] and session["player_b_locked"]


def resolve_duel(
    session: Dict[str, Any],
    outcome: float,
) -> Dict[str, Any]:
    """
    Compute per-player Brier scores and the winner, mark session resolved.
    """
    from calibration.engine import brier_score, calibration_points

    p_a = session.get("player_a_prob", 0.5) or 0.5
    p_b = session.get("player_b_prob", 0.5) or 0.5

    bs_a = brier_score(p_a, outcome)
    bs_b = brier_score(p_b, outcome)

    pts_a = calibration_points(p_a, outcome)
    pts_b = calibration_points(p_b, outcome)

    if bs_a < bs_b:
        winner = "player_a"
    elif bs_b < bs_a:
        winner = "player_b"
    else:
        winner = "tie"

    session["state"] = "revealed"
    session["resolved_at"] = datetime.utcnow().isoformat()
    session["result"] = {
        "player_a_brier": bs_a,
        "player_b_brier": bs_b,
        "player_a_points": pts_a,
        "player_b_points": pts_b,
        "winner": winner,
        "disagreement": round(abs(p_a - p_b), 3),
        "outcome": outcome,
    }
    return session


def compute_difficulty_index(disagreements: list) -> float:
    """
    Compute the difficulty index for a claim from a list of pairwise
    absolute disagreements (|p_a - p_b| for each duel on that claim).
    PRD §10.4: mean pairwise disagreement → difficulty index.
    """
    if not disagreements:
        return 0.5
    return round(sum(disagreements) / len(disagreements), 4)
