import React from 'react';

const OUTCOME_CONFIG = {
  1.0: { label: 'Supported', color: 'var(--emerald)', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.3)' },
  0.0: { label: 'Contradicted', color: 'var(--rose)', bg: 'rgba(244,63,94,0.08)', border: 'rgba(244,63,94,0.3)' },
  0.5: { label: 'Contested', color: 'var(--amber)', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)' },
};

function ConfidenceBar({ label, probability, color }) {
  const pct = Math.round((probability || 0) * 100);
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 8, fontFamily: 'var(--font-display)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </p>
      <div style={{
        fontSize: '3.5rem',
        fontWeight: 900,
        fontFamily: 'var(--font-display)',
        color,
        lineHeight: 1,
        marginBottom: 12,
        textShadow: `0 0 30px ${color}44`,
      }}>
        {pct}%
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: 3,
          transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
    </div>
  );
}

function Stage3_Reveal({ revealData, userPrediction, onContinue }) {
  const outcome = revealData?.outcome;
  const cfg = OUTCOME_CONFIG[outcome] || OUTCOME_CONFIG[0.5];
  const sources = revealData?.sources || [];
  const aiProbability = revealData?.ai_prediction?.probability ?? 0.5;

  return (
    <div className="card card-body animate-fade-up" style={{ padding: 36 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div className="badge badge-indigo" style={{ marginBottom: 8 }}>Stage 3 — Reveal</div>
        <h2 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>The evidence is in</h2>
      </div>

      {/* Outcome banner */}
      <div style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 14,
        padding: '20px 24px',
        marginBottom: 28,
        textAlign: 'center',
      }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 6, fontFamily: 'var(--font-display)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Outcome
        </p>
        <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: cfg.color }}>
          {cfg.label}
        </div>
        {outcome === 0.5 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 8 }}>
            Evidence is mixed or inconclusive — a partial-credit outcome of 0.5 applies.
          </p>
        )}
      </div>

      {/* Side-by-side confidence comparison */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--color-border)',
        borderRadius: 14,
        padding: 24,
        marginBottom: 28,
      }}>
        <h3 style={{ fontFamily: 'var(--font-display)', textAlign: 'center', marginBottom: 20, fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Your Prediction vs AI's Prediction
        </h3>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <ConfidenceBar
            label="Your gut"
            probability={userPrediction?.probability}
            color="var(--teal)"
          />
          <div style={{ width: 1, background: 'var(--color-border)', alignSelf: 'stretch' }} />
          <ConfidenceBar
            label="AI's guess"
            probability={aiProbability}
            color="var(--indigo-light)"
          />
        </div>
      </div>

      {/* Evidence rationale */}
      <div style={{
        borderLeft: `3px solid ${cfg.color}`,
        paddingLeft: 18,
        marginBottom: 24,
        background: cfg.bg,
        borderRadius: '0 10px 10px 0',
        padding: '16px 18px 16px 20px',
      }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-display)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Evidence Rationale
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.7, margin: 0 }}>
          {revealData?.rationale_text || 'No rationale available.'}
        </p>
      </div>

      {/* Sources */}
      {sources.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', marginBottom: 12, color: 'var(--text-secondary)' }}>
            Independent Sources ({sources.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sources.map((src, i) => (
              <div key={i} className="source-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <span className="source-name">
                    {src.source_url ? (
                      <a href={src.source_url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                        {src.source_name} ↗
                      </a>
                    ) : src.source_name}
                  </span>
                  {src.verdict && (
                    <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>{src.verdict}</span>
                  )}
                </div>
                <p className="source-excerpt">{src.excerpt}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {sources.length === 0 && (
        <div style={{
          border: '1px solid var(--color-border)',
          borderRadius: 10,
          padding: '16px 20px',
          marginBottom: 24,
          background: 'rgba(255,255,255,0.02)',
        }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
            No independent sources could be retrieved for this claim. The outcome is marked as contested.
          </p>
        </div>
      )}

      {/* AI allowed to be wrong note */}
      <div style={{
        padding: '12px 16px',
        borderRadius: 8,
        border: '1px solid rgba(99,102,241,0.15)',
        background: 'rgba(99,102,241,0.04)',
        marginBottom: 24,
      }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic', margin: 0 }}>
          The AI is allowed to be wrong here. A tool that is always right teaches the same misplaced trust this product exists to cure.
        </p>
      </div>

      <button
        className="btn btn-primary btn-lg"
        onClick={onContinue}
        style={{ width: '100%' }}
      >
        See my calibration score
      </button>
    </div>
  );
}

export default Stage3_Reveal;
