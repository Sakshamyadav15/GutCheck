import React, { useState } from 'react';

const REASON_TAGS = [
  { key: 'sounds_oddly_specific', label: 'Sounds oddly specific' },
  { key: 'no_source_given', label: 'No source given' },
  { key: 'matches_what_I_know', label: 'Matches what I know' },
  { key: 'confident_tone', label: 'Confident tone' },
  { key: 'just_trusting_the_AI', label: 'Just trusting the AI' },
  { key: 'vague_hedged_language', label: 'Vague / hedged language' },
  { key: 'recent_event_unsure', label: 'Recent event, unsure' },
  { key: 'contradicts_prior_knowledge', label: 'Contradicts what I know' },
  { key: 'too_precise_to_be_real', label: 'Too precise to be real' },
  { key: 'feels_plausible', label: 'Feels plausible' },
];

const CLAIM_TYPE_COLORS = {
  statistical: 'badge-amber',
  factual: 'badge-indigo',
  causal: 'badge-teal',
  quotation: 'badge-emerald',
  opinion_excluded: 'badge-rose',
};

function Stage1_Predict({ claim, onSubmit }) {
  const [confidence, setConfidence] = useState(50);
  const [selectedTag, setSelectedTag] = useState('');
  const [loading, setLoading] = useState(false);

  const specificity = claim?.specificity_score ? Math.round(claim.specificity_score * 100) : 50;

  const getConfidenceColor = () => {
    if (confidence < 25) return 'var(--rose)';
    if (confidence < 45) return 'var(--amber)';
    if (confidence < 65) return 'var(--text-secondary)';
    if (confidence < 85) return 'var(--indigo-light)';
    return 'var(--teal)';
  };

  const handleLockIn = async () => {
    if (!selectedTag || !onSubmit) return;
    setLoading(true);
    try {
      await onSubmit({ probability: confidence, reasonTag: selectedTag });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card card-body animate-fade-up" style={{ padding: 36 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div className="badge badge-indigo" style={{ marginBottom: 8 }}>Stage 1 — Predict</div>
          <h2 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>
            What is your gut call?
          </h2>
        </div>
        {claim?.claim_type && (
          <span className={`badge ${CLAIM_TYPE_COLORS[claim.claim_type] || 'badge-indigo'}`} style={{ whiteSpace: 'nowrap' }}>
            {claim.claim_type}
          </span>
        )}
      </div>

      {/* Claim text */}
      <div style={{
        background: 'rgba(99,102,241,0.06)',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 14,
        padding: '20px 24px',
        marginBottom: 28,
      }}>
        <p style={{
          fontSize: '1.1rem',
          lineHeight: 1.7,
          color: 'var(--text-primary)',
          fontStyle: 'italic',
          margin: 0,
        }}>
          "{claim?.text || 'Loading claim...'}"
        </p>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            Specificity
          </span>
          <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              width: `${specificity}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--indigo), var(--teal-dim))',
              transition: 'width 0.5s ease',
            }} />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            {specificity}%
          </span>
        </div>
      </div>

      {/* Confidence slider */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h3 style={{ marginBottom: 6, fontFamily: 'var(--font-display)' }}>
          How likely is this claim true?
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>
          Set your confidence before seeing any evidence
        </p>
        <div style={{
          fontSize: '5rem',
          fontWeight: 900,
          fontFamily: 'var(--font-display)',
          lineHeight: 1,
          marginBottom: 16,
          color: getConfidenceColor(),
          textShadow: `0 0 40px ${getConfidenceColor()}44`,
          transition: 'color 0.2s, text-shadow 0.2s',
        }}>
          {confidence}%
        </div>
        <div className="slider-container">
          <input
            type="range"
            min="0"
            max="100"
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
            style={{
              width: '100%',
              background: `linear-gradient(90deg, var(--indigo) ${confidence}%, rgba(255,255,255,0.1) ${confidence}%)`,
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Definitely False</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Definitely True</span>
        </div>
      </div>

      {/* Reason tags */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ marginBottom: 6, fontFamily: 'var(--font-display)' }}>
          Why do you think that?
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 14 }}>
          Choose the heuristic that most influenced your prediction
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {REASON_TAGS.map(({ key, label }) => (
            <button
              key={key}
              className={`tag ${selectedTag === key ? 'tag-selected' : 'tag-default'}`}
              onClick={() => setSelectedTag(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="divider" />

      {/* Lock-in */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
        <button
          className="btn btn-primary btn-lg"
          onClick={handleLockIn}
          disabled={!selectedTag || loading}
        >
          {loading ? 'Locking in...' : 'Lock in my DeetsCheck'}
        </button>
        <p style={{ fontSize: '0.8rem', color: 'var(--amber)', textAlign: 'center', margin: 0 }}>
          You cannot edit this after seeing the evidence — that is the whole point.
        </p>
      </div>
    </div>
  );
}

export default Stage1_Predict;
