import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const STATS = [
  { value: '800M', label: 'Weekly AI users globally', color: 'var(--indigo-light)', source: 'arXiv 2605.22785' },
  { value: '2 in 3', label: 'US teens use AI chatbots', color: 'var(--teal)', source: 'Pew Research 2025' },
  { value: '~50%', label: 'AI citations unverifiable', color: 'var(--amber)', source: 'McBain et al. 2026' },
  { value: '1 in 3', label: 'Find it hard to spot AI inaccuracies', color: 'var(--rose)', source: 'Pew Research 2025' },
];

const STAGES = [
  {
    n: '1',
    name: 'Predict',
    color: 'var(--indigo)',
    glow: 'rgba(99,102,241,0.25)',
    desc: 'Before any evidence — state your confidence and name your heuristic. Once locked, it is immutable.',
  },
  {
    n: '2',
    name: 'Investigate',
    color: 'var(--teal)',
    glow: 'rgba(20,241,217,0.2)',
    desc: 'A 90-second window. The AI acts as a coach, not an oracle. Lateral search links to primary sources.',
  },
  {
    n: '3',
    name: 'Reveal',
    color: 'var(--indigo-light)',
    glow: 'rgba(129,140,248,0.2)',
    desc: 'Evidence from named independent sources unlocks alongside the AI\'s own prediction — which may be wrong.',
  },
  {
    n: '4',
    name: 'Calibrate',
    color: 'var(--emerald)',
    glow: 'rgba(16,185,129,0.2)',
    desc: 'Your Brier score updates your personal reliability curve. Teach Forward names the bias you just met.',
  },
];

const MODES = [
  {
    title: 'Solo Session',
    desc: 'Paste any AI answer. Extract claims. Run the full PIRC loop at your own pace.',
    cta: 'Start a session',
    to: '/play',
    badge: 'badge-indigo',
    badgeText: 'Core Mode',
  },
  {
    title: 'Duel Mode',
    desc: 'Challenge a friend. Both predict independently. The more calibrated player wins.',
    cta: 'Challenge a friend',
    to: '/duel',
    badge: 'badge-amber',
    badgeText: 'Multiplayer',
  },
  {
    title: 'Classroom Mode',
    desc: 'Facilitator tool. Works with zero per-student devices and printable physical cards.',
    cta: 'Open classroom',
    to: '/classroom',
    badge: 'badge-teal',
    badgeText: 'Education',
  },
];

function StatCard({ value, label, color, source, delay }) {
  return (
    <div
      className="card card-body animate-fade-up"
      style={{ animationDelay: `${delay}ms`, textAlign: 'center', padding: '28px 20px' }}
    >
      <div style={{
        fontSize: '2.8rem',
        fontWeight: 900,
        fontFamily: 'var(--font-display)',
        color,
        lineHeight: 1,
        marginBottom: 8,
        textShadow: `0 0 30px ${color}44`,
      }}>
        {value}
      </div>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 6px', fontSize: '0.9rem' }}>{label}</p>
      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{source}</span>
    </div>
  );
}

function StageStep({ n, name, color, glow, desc, delay, isLast }) {
  return (
    <div style={{ display: 'flex', gap: 20, animationDelay: `${delay}ms` }} className="animate-fade-up">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: `${glow}`,
          border: `2px solid ${color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
          fontWeight: 800,
          fontFamily: 'var(--font-display)',
          color,
          boxShadow: `0 0 20px ${glow}`,
          flexShrink: 0,
        }}>
          {n}
        </div>
        {!isLast && (
          <div style={{ width: 2, flex: 1, minHeight: 32, background: 'rgba(255,255,255,0.07)', margin: '8px 0' }} />
        )}
      </div>
      <div style={{ paddingTop: 10, paddingBottom: isLast ? 0 : 32 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', color, margin: '0 0 8px', fontSize: '1.1rem' }}>{name}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>{desc}</p>
      </div>
    </div>
  );
}

function Home() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>

      {/* ---- Hero ---- */}
      <div
        style={{ textAlign: 'center', padding: '80px 0 60px', opacity: mounted ? 1 : 0, transition: 'opacity 0.6s ease' }}
      >
        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="badge badge-teal">AI and Media Information Literacy</span>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          fontSize: 'clamp(2.4rem, 6vw, 4rem)',
          lineHeight: 1.1,
          marginBottom: 20,
          letterSpacing: '-0.03em',
        }}>
          Train the instinct.{' '}
          <span style={{
            background: 'linear-gradient(135deg, var(--indigo-light), var(--teal))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Don't outsource it.
          </span>
        </h1>

        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '1.15rem',
          maxWidth: 600,
          margin: '0 auto 36px',
          lineHeight: 1.7,
        }}>
          A 90-second calibration exercise that turns every AI-generated answer into a habit of evidence-based judgment.
          You predict before you see the evidence — that is the whole point.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/play')}>
            Start a session
          </button>
          <button className="btn btn-teal btn-lg" onClick={() => navigate('/duel')}>
            Challenge a friend
          </button>
          <button className="btn btn-ghost btn-lg" onClick={() => navigate('/classroom')}>
            Classroom mode
          </button>
        </div>

        <p style={{ marginTop: 24, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          No account required. No installation. Works on any device.
        </p>
      </div>

      {/* ---- Stats row ---- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 80 }}>
        {STATS.map((s, i) => (
          <StatCard key={s.value} {...s} delay={i * 80} />
        ))}
      </div>

      {/* ---- PIRC Loop ---- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 60, marginBottom: 80, alignItems: 'start' }}>
        <div>
          <div className="badge badge-teal" style={{ marginBottom: 16 }}>The Method</div>
          <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 12, letterSpacing: '-0.02em' }}>
            Predict, Investigate,<br />Reveal, Calibrate
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 32, lineHeight: 1.7 }}>
            The PIRC loop applies the same forecasting discipline used by intelligence analysts and superforecasters —
            adapted for 90 seconds and a single AI-generated claim.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/play')}>
            Try it now
          </button>
        </div>
        <div>
          {STAGES.map((s, i) => (
            <StageStep key={s.n} {...s} delay={i * 100} isLast={i === STAGES.length - 1} />
          ))}
        </div>
      </div>

      {/* ---- Modes ---- */}
      <div style={{ marginBottom: 80 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div className="badge badge-amber" style={{ marginBottom: 12 }}>Three Ways to Play</div>
          <h2 style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
            Solo, competitive, or in a classroom
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {MODES.map(({ title, desc, cta, to, badge, badgeText }, i) => (
            <div
              key={title}
              className="card card-body animate-fade-up"
              style={{ animationDelay: `${i * 100}ms`, padding: 28 }}
            >
              <span className={`badge ${badge}`} style={{ marginBottom: 16 }}>{badgeText}</span>
              <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 10 }}>{title}</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.9rem', lineHeight: 1.6 }}>{desc}</p>
              <Link to={to} className="btn btn-ghost" style={{ display: 'inline-flex', alignSelf: 'flex-start' }}>{cta} →</Link>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Why not just a detector ---- */}
      <div
        className="card card-body"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(20,241,217,0.05))',
          border: '1px solid rgba(99,102,241,0.25)',
          padding: 40,
          marginBottom: 80,
        }}
      >
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 16, letterSpacing: '-0.02em' }}>
            Why not just use an AI detector?
          </h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 0, fontSize: '1rem' }}>
            Detectors are an arms race the detector always loses. Each new model erodes detection accuracy.
            More importantly, a detector replaces one black box with another — it teaches outsourcing, not judgment.
            The highest-volume harm is not a synthetic deepfake. It is an ordinary,
            fluently written, partly-wrong paragraph answering a homework question.
            That is a judgment problem. The fix is training judgment.
          </p>
        </div>
      </div>

      {/* ---- Footer attribution ---- */}
      </div>
  );
}

export default Home;
