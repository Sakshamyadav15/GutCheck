import React, { useState, useEffect, useRef } from 'react';

const LATERAL_LINKS = (claimText, entities) => {
  const q = encodeURIComponent((entities && entities[0]) || claimText?.slice(0, 60) || '');
  const qFull = encodeURIComponent(claimText?.slice(0, 80) || '');
  return [
    {
      label: 'Wikipedia',
      url: `https://en.wikipedia.org/w/index.php?search=${q}`,
      color: 'var(--indigo-light)',
    },
    {
      label: 'Google Fact Check',
      url: `https://toolbox.google.com/factcheck/explorer/search/${qFull};hl=en`,
      color: 'var(--teal)',
    },
    {
      label: 'GDELT News',
      url: `https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=artlist&maxrecords=10&format=html`,
      color: 'var(--amber)',
    },
    {
      label: 'Web Search',
      url: `https://www.google.com/search?q=${qFull}`,
      color: 'var(--text-secondary)',
    },
  ];
};

function Stage2_Investigate({ claim, hintsData, hintsUsed, onGetHint, onSkipToReveal }) {
  const [timeLeft, setTimeLeft] = useState(90);
  const [loadingLevel, setLoadingLevel] = useState(null);
  const [loadingReveal, setLoadingReveal] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const handleHint = async (level) => {
    if (loadingLevel !== null) return;
    setLoadingLevel(level);
    try {
      await onGetHint(level);
    } finally {
      setLoadingLevel(null);
    }
  };

  const handleSkip = async () => {
    clearInterval(timerRef.current);
    setLoadingReveal(true);
    try {
      await onSkipToReveal();
    } finally {
      setLoadingReveal(false);
    }
  };

  const hintUsedAtLevel = (level) => hintsData && hintsData[level] !== undefined;
  const lateralLinks = LATERAL_LINKS(claim?.text, claim?.entities);

  const timerPercent = (timeLeft / 90) * 100;
  const timerUrgent = timeLeft <= 15;

  return (
    <div className="card card-body animate-fade-up" style={{ padding: 36 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div className="badge badge-teal" style={{ marginBottom: 8 }}>Stage 2 — Investigate</div>
          <h2 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>
            Investigate the claim
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4, marginBottom: 0 }}>
            Hints are questions, not answers. Use lateral search to read primary sources.
          </p>
        </div>

        {/* Timer */}
        <div className={`timer${timerUrgent ? ' urgent' : ''}`} style={{ flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar" style={{ marginBottom: 24 }}>
        <div
          className="progress-fill"
          style={{
            width: `${timerPercent}%`,
            background: timerUrgent
              ? 'linear-gradient(90deg, var(--rose), #fb923c)'
              : 'linear-gradient(90deg, var(--indigo), var(--teal-dim))',
            transition: 'width 1s linear',
          }}
        />
      </div>

      {/* Claim reminder */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--color-border)',
        borderRadius: 10,
        padding: '14px 18px',
        marginBottom: 24,
        fontSize: '0.9rem',
        color: 'var(--text-secondary)',
        fontStyle: 'italic',
      }}>
        "{claim?.text?.slice(0, 120)}{claim?.text?.length > 120 ? '...' : ''}"
      </div>

      {/* Lateral search links */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 12, fontSize: '1rem' }}>
          Lateral Search
        </h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {lateralLinks.map(({ label, url, color }) => (
            <a
              key={label}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              style={{ borderColor: color + '44', color }}
            >
              {label} ↗
            </a>
          ))}
        </div>
      </div>

      {/* Graduated hints */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: '1rem' }}>
            Coached Hints
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Each hint costs 3 calibration points max
          </span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 14 }}>
          The AI acts as a coach, not an oracle — it asks questions, never states conclusions.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1, 2].map((level) => {
            const label = ['Awareness', 'Direction', 'Specific Action'][level];
            const hint = hintsData?.[level];
            const isUsed = hintUsedAtLevel(level);
            const isLoading = loadingLevel === level;
            const prevNotUsed = level > 0 && !hintUsedAtLevel(level - 1);

            return (
              <div
                key={level}
                style={{
                  border: `1px solid ${isUsed ? 'rgba(99,102,241,0.3)' : 'var(--color-border)'}`,
                  borderRadius: 10,
                  overflow: 'hidden',
                }}
              >
                {isUsed ? (
                  <div style={{ padding: '14px 18px', background: 'rgba(99,102,241,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span className="badge badge-indigo">Level {level + 1} — {label}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>-3 pts</span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                      {hint?.hint || (typeof hint === 'string' ? hint : 'Hint loaded')}
                    </p>
                  </div>
                ) : (
                  <button
                    className="btn btn-ghost"
                    onClick={() => handleHint(level)}
                    disabled={isLoading || prevNotUsed || loadingReveal}
                    style={{
                      width: '100%',
                      borderRadius: 0,
                      textAlign: 'left',
                      padding: '14px 18px',
                      justifyContent: 'flex-start',
                      opacity: prevNotUsed ? 0.4 : 1,
                    }}
                  >
                    {isLoading ? (
                      <span style={{ color: 'var(--teal)' }}>Loading hint...</span>
                    ) : (
                      <>
                        <span style={{ color: 'var(--indigo-light)', marginRight: 8 }}>Level {level + 1}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{label} hint</span>
                        {prevNotUsed && (
                          <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Unlock Level {level} first
                          </span>
                        )}
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {hintsUsed > 0 && (
          <p style={{ marginTop: 10, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {hintsUsed} hint{hintsUsed > 1 ? 's' : ''} used — {hintsUsed * 3} points docked from maximum
          </p>
        )}
      </div>

      <div className="divider" />

      <button
        className="btn btn-primary btn-lg"
        onClick={handleSkip}
        disabled={loadingReveal}
        style={{ width: '100%' }}
      >
        {loadingReveal ? 'Loading evidence...' : 'I have investigated enough — Reveal'}
      </button>
    </div>
  );
}

export default Stage2_Investigate;
