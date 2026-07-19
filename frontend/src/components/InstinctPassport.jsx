import React from 'react';

function InstinctPassport({ passportData }) {
  if (!passportData) return null;

  const xpProgress = (passportData.xp % 1000) / 10;

  return (
    <div className="card" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #060b18 100%)', border: '1px solid var(--indigo)' }}>
      <div className="card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ margin: 0, color: '#fff' }}>Level {passportData.level} Thinker</h2>
            <p style={{ color: 'var(--teal)', margin: 0 }}>{passportData.xp} Total XP</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="badge badge-indigo" style={{ fontSize: '1.2rem', padding: '0.5rem 1rem' }}>
              🔥 {passportData.streak} Day Streak
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', color: '#a1a1aa' }}>Progress to Level {passportData.level + 1}</span>
            <span style={{ fontSize: '0.9rem', color: '#a1a1aa' }}>{Math.floor(xpProgress)}%</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: '#3f3f46', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${xpProgress}%`, height: '100%', background: 'var(--teal)', transition: 'width 1s ease' }}></div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', textAlign: 'center' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '0.5rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--indigo)' }}>{passportData.totalClaims}</div>
            <div style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Claims Checked</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '0.5rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--amber)' }}>{passportData.brierScore}</div>
            <div style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Overall Brier</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '0.5rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--teal)' }}>↗️</div>
            <div style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Calibration Trend</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InstinctPassport;
