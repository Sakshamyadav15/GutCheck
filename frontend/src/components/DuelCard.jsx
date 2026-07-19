import React, { useState } from 'react';

function DuelCard({ duelResult }) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(duelResult.share_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card" style={{ border: '2px solid var(--teal)', overflow: 'hidden' }}>
      <div style={{ background: 'var(--teal)', color: '#000', padding: '1rem', textAlign: 'center', fontWeight: 'bold', fontSize: '1.5rem' }}>
        Winner: {duelResult.winner} 🏆
      </div>
      
      <div className="card-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '2rem', alignItems: 'center', margin: '2rem 0' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', color: '#a1a1aa', marginBottom: '0.5rem' }}>You</div>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--indigo)' }}>{duelResult.player_a}</div>
            <div style={{ fontSize: '0.8rem' }}>points</div>
          </div>
          
          <div style={{ fontSize: '2rem', color: 'var(--amber)', fontWeight: 'bold' }}>VS</div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', color: '#a1a1aa', marginBottom: '0.5rem' }}>Opponent</div>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#f43f5e' }}>{duelResult.player_b}</div>
            <div style={{ fontSize: '0.8rem' }}>points</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', marginBottom: '2rem' }}>
          <strong style={{ color: 'var(--amber)' }}>Disagreement Index: {duelResult.disagreement}</strong>
          <p style={{ fontSize: '0.9rem', color: '#a1a1aa', marginTop: '0.5rem' }}>You two had very different instincts on this one.</p>
        </div>

        <button className="btn btn-primary btn-lg" onClick={handleShare} style={{ width: '100%' }}>
          {copied ? 'Copied to Clipboard!' : 'Share Result'}
        </button>
      </div>
    </div>
  );
}

export default DuelCard;
