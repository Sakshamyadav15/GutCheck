"""
models.py — SQLAlchemy ORM models matching the data schema from PRD §10.6.
Postgres-compatible column types used throughout; SQLite handles them gracefully.
"""

import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey, Integer, String, Text, JSON
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.utcnow()


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    channel_identity: Mapped[str] = mapped_column(String(256), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    predictions: Mapped[List["Prediction"]] = relationship(back_populates="user")
    passport: Mapped[Optional["Passport"]] = relationship(back_populates="user", uselist=False)
    calibration_history: Mapped[List["CalibrationHistory"]] = relationship(back_populates="user")


# ---------------------------------------------------------------------------
# Claims
# ---------------------------------------------------------------------------

class Claim(Base):
    __tablename__ = "claims"

    claim_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    claim_type: Mapped[str] = mapped_column(String(32), default="factual")
    entities: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    specificity_score: Mapped[float] = mapped_column(Float, default=0.5)
    source_answer_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    difficulty_index: Mapped[float] = mapped_column(Float, default=0.5)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    # For community bank
    opt_in: Mapped[bool] = mapped_column(Boolean, default=False)
    anonymized_source: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    predictions: Mapped[List["Prediction"]] = relationship(back_populates="claim")
    reveal: Mapped[Optional["Reveal"]] = relationship(back_populates="claim", uselist=False)
    duels: Mapped[List["Duel"]] = relationship(back_populates="claim")


# ---------------------------------------------------------------------------
# Predictions (human AND AI)
# ---------------------------------------------------------------------------

class Prediction(Base):
    __tablename__ = "predictions"

    prediction_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"), nullable=True)
    claim_id: Mapped[str] = mapped_column(ForeignKey("claims.claim_id"), nullable=False)
    probability: Mapped[float] = mapped_column(Float, nullable=False)
    reason_tag: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    locked_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    is_ai_prediction: Mapped[bool] = mapped_column(Boolean, default=False)
    hints_used: Mapped[int] = mapped_column(Integer, default=0)

    user: Mapped[Optional["User"]] = relationship(back_populates="predictions")
    claim: Mapped["Claim"] = relationship(back_populates="predictions")


# ---------------------------------------------------------------------------
# Reveals
# ---------------------------------------------------------------------------

class Reveal(Base):
    __tablename__ = "reveals"

    reveal_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    claim_id: Mapped[str] = mapped_column(ForeignKey("claims.claim_id"), unique=True, nullable=False)
    sources_json: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    outcome: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # 1, 0, or 0.5
    rationale_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    revealed_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    claim: Mapped["Claim"] = relationship(back_populates="reveal")


# ---------------------------------------------------------------------------
# Calibration History
# ---------------------------------------------------------------------------

class CalibrationHistory(Base):
    __tablename__ = "calibration_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    rolling_brier: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    archetype: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    streak: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    user: Mapped["User"] = relationship(back_populates="calibration_history")


# ---------------------------------------------------------------------------
# Duels
# ---------------------------------------------------------------------------

class Duel(Base):
    __tablename__ = "duels"

    duel_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    claim_id: Mapped[str] = mapped_column(ForeignKey("claims.claim_id"), nullable=False)
    player_a_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    player_b_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    player_a_prob: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    player_b_prob: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    player_a_locked: Mapped[bool] = mapped_column(Boolean, default=False)
    player_b_locked: Mapped[bool] = mapped_column(Boolean, default=False)
    state: Mapped[str] = mapped_column(String(32), default="waiting")  # waiting|active|revealed
    invite_code: Mapped[str] = mapped_column(String(16), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    claim: Mapped["Claim"] = relationship(back_populates="duels")


# ---------------------------------------------------------------------------
# Instinct Passport
# ---------------------------------------------------------------------------

class Passport(Base):
    __tablename__ = "passports"

    passport_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    xp: Mapped[int] = mapped_column(Integer, default=0)
    level: Mapped[int] = mapped_column(Integer, default=1)
    streak: Mapped[int] = mapped_column(Integer, default=0)
    total_claims: Mapped[int] = mapped_column(Integer, default=0)
    badges: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    archetype: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    calibration_trend: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    last_active: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    user: Mapped["User"] = relationship(back_populates="passport")
