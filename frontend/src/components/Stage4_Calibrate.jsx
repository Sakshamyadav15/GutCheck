import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CalibrationCurve from './CalibrationCurve';
import { archetypeDescriptions, archetypeColors } from '../utils/scoring';

function AnimatedNumber({ target, duration = 1200, decimals = 4 }) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const steps = 60;
    const stepDuration = duration / steps;
    const increment = target / steps;
    let count = 0;
    const timer = setInterval(() => {
      count++;
      setCurrent(Math.min(count * increment, target));
      if (count >= steps) clearInterval(timer);
    }, stepDuration);
    return () => clearInterval(timer);
  }, [target, duration]);
  return <>{current.toFixed(decimals)}</>;
}

function CircleProgress({ value, max = 100, size = 120, strokeWidth = 10, color = 'var(--teal)' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / max) * circumference;
  const [animated, setAnimated] = useState(true);

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={animated ? offset : circumference}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontSize: '1.6rem', fontWeight: 900,
          fontFamily: 'var(--font-display)', color,
          lineHeight: 1,
        }}>
          {value}
        </span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>pts</span>
      </div>
    </div>
  );
}

function Stage4_Calibrate({ calibrateData, onNextClaim, onEndSession }) {
  const navigate = useNavigate();
  const bs = calibrateData?.brier_score ?? 0;
  const pts = calibrateData?.calibration_points ?? 0;
  const xp = calibrateData?.xp_breakdown ?? {};
  const teachForward = calibrateData?.teach_forward ?? '';
  const archetype = calibrateData?.archetype ?? 'Emerging';
  const diagram = calibrateData?.reliability_diagram ?? null;
  const outcome = calibrateData?.outcome ?? 0.5;
  const archetypeColor = archetypeColors[archetype] ? `var(--${archetypeColors[archetype]})` : 'var(--indigo-light)';

  const outcomeLabel = outcome === 1.0 ? 'Supported' : outcome === 0.0 ? 'Contradicted' : 'Contested';

  const handleEnd = () => {
    if (onEndSession) onEndSession();
    navigate('/passport');
  };

  return (
    <div className="card card-body animate-fade-up" style={{ padding: 36 }}>
      {/* Header */}
      <div style={{ marginBottom: 28, textAlign: 'center' }}>
        <div className="badge badge-emerald" style={{ marginBottom: 8 }}>Stage 4 — Calibrate</div>
        <h2 style={{ fontFamily: 'var(--font-display)' }}>Your calibration result</h2>
      </div>

      {/* Score cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        {/* Brier score */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--color-border)',
          borderRadius: 14,
          padding: 24,
          textAlign: 'center',
        }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-display)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Brier Score
          </p>
          <div style={{
            fontSize: '3rem', fontWeight: 900, fontFamily: 'var(--font-display)',
            color: bs < 0.1 ? 'var(--emerald)' : bs < 0.3 ? 'var(--teal)' : bs < 0.5 ? 'var(--amber)' : 'var(--rose)',
          }}>
            <AnimatedNumber target={bs} decimals={4} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 6 }}>
            {bs < 0.05 ? 'Perfect calibration' : bs < 0.15 ? 'Excellent' : bs < 0.30 ? 'Good' : bs < 0.50 ? 'Developing' : 'Needs work'} · 0 is perfect
          </p>
        </div>

        {/* Calibration points circle */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--color-border)',
          borderRadius: 14,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-display)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Calibration Points
          </p>
          <CircleProgress value={pts} color="var(--teal)" />
        </div>
      </div>

      {/* XP Breakdown */}
      {xp.total > 0 && (
        <div style={{
          background: 'rgba(99,102,241,0.06)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 24,
        }}>
          <p style={{ color: 'var(--indigo-light)', fontSize: '0.8rem', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 10 }}>
            XP Earned This Claim
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {xp.calibrate_xp > 0 && (
              <span className="badge badge-indigo">+{xp.calibrate_xp} Calibrate</span>
            )}
            {xp.perfect_bonus > 0 && (
              <span className="badge badge-teal">+{xp.perfect_bonus} Perfect</span>
            )}
            {xp.investigate_bonus > 0 && (
              <span className="badge badge-emerald">+{xp.investigate_bonus} Investigated</span>
            )}
            {xp.duel_bonus > 0 && (
              <span className="badge badge-amber">+{xp.duel_bonus} Duel</span>
            )}
            <span className="badge badge-indigo" style={{ fontWeight: 800 }}>= {xp.total} Total</span>
          </div>
        </div>
      )}

      {/* Teach Forward */}
      {teachForward && (
        <div style={{
          borderLeft: '3px solid var(--amber)',
          paddingLeft: 18,
          background: 'rgba(245,158,11,0.05)',
          borderRadius: '0 10px 10px 0',
          padding: '16px 18px 16px 20px',
          marginBottom: 24,
        }}>
          <p style={{ color: 'var(--amber)', fontSize: '0.75rem', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Teach Forward
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>
            {teachForward}
          </p>
        </div>
      )}

      {/* Archetype */}
      <div style={{
        background: `linear-gradient(135deg, rgba(99,102,241,0.12), rgba(20,241,217,0.06))`,
        border: '1px solid rgba(99,102,241,0.25)',
        borderRadius: 14,
        padding: '18px 22px',
        marginBottom: 28,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 16,
      }}>
        <div style={{
          width: 48, height: 48,
          borderRadius: '50%',
          background: `${archetypeColor}22`,
          border: `2px solid ${archetypeColor}44`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.4rem',
          flexShrink: 0,
        }}>
          {archetype === 'Well-Calibrated' ? '◎' : archetype === 'Confident Truster' ? '▲' : archetype === 'Cautious Skeptic' ? '▽' : '◈'}
        </div>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
            Confidence Archetype
          </p>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: archetypeColor, fontSize: '1rem', marginBottom: 4 }}>
            {archetype}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.5, margin: 0 }}>
            {archetypeDescriptions[archetype] || ''}
          </p>
        </div>
      </div>

      {/* Calibration Curve */}
      {diagram && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', marginBottom: 12, color: 'var(--text-secondary)' }}>
            Your Reliability Curve
          </h3>
          <CalibrationCurve diagramData={diagram} />
        </div>
      )}

      {/* Total stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
        <div style={{ flex: 1, textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--indigo-light)', fontFamily: 'var(--font-display)' }}>
            {calibrateData?.total_claims ?? 1}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Claims Checked</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--teal)', fontFamily: 'var(--font-display)' }}>
            {calibrateData?.total_xp ?? xp.total ?? 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total XP</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--amber)', fontFamily: 'var(--font-display)' }}>
            {calibrateData?.level ?? 1}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Level</div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn btn-primary btn-lg" onClick={onNextClaim} style={{ flex: 1 }}>
          Next Claim
        </button>
        <button className="btn btn-ghost btn-lg" onClick={handleEnd} style={{ flex: 1 }}>
          View Passport
        </button>
      </div>
    </div>
  );
}

export default Stage4_Calibrate;
