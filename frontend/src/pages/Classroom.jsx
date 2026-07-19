import React, { useState } from 'react';

function Classroom() {
  const [difficulty, setDifficulty] = useState('all');
  const [sessionActive, setSessionActive] = useState(false);

  const handleCreate = () => {
    setSessionActive(true);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ color: 'var(--teal)', marginBottom: '2rem' }}>Classroom Facilitator Mode</h1>

      {!sessionActive ? (
        <div className="card card-body" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '1rem' }}>Create a Session</h2>
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a1a1aa' }}>Select Difficulty Filter</label>
            <select 
              value={difficulty} 
              onChange={(e) => setDifficulty(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', background: '#0a0f1d', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem' }}
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy (Obvious Fakes)</option>
              <option value="hard">Hard (Subtle Hallucinations)</option>
            </select>
          </div>
          <button className="btn btn-primary btn-lg" onClick={handleCreate} style={{ width: '100%' }}>Start Live Session</button>
        </div>
      ) : (
        <div className="animate-fade-up">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', padding: '1rem', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid var(--indigo)', borderRadius: '0.5rem' }}>
            <h2 style={{ margin: 0 }}>Session Active (Join Code: X7B9M)</h2>
            <button className="btn btn-ghost" onClick={() => setSessionActive(false)}>End Session</button>
          </div>

          <div className="card card-body" style={{ marginBottom: '2rem' }}>
            <h3 style={{ color: 'var(--teal)', marginBottom: '1rem' }}>Current Claim</h3>
            <p style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>"Water freezes faster when it is initially hot compared to when it is cold." (Mpemba effect)</p>
            
            <h4 style={{ marginBottom: '1rem', color: '#a1a1aa' }}>Class Confidence Aggregate (Show of Hands)</h4>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: '1rem', textAlign: 'center', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>0%</div>
                <div style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Definitely False</div>
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: '1rem', textAlign: 'center', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>25%</div>
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: '1rem', textAlign: 'center', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>50%</div>
                <div style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Unsure</div>
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: '1rem', textAlign: 'center', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>75%</div>
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: '1rem', textAlign: 'center', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>100%</div>
                <div style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Definitely True</div>
              </div>
            </div>

            <h4 style={{ marginBottom: '1rem', color: '#a1a1aa' }}>Discussion Prompts</h4>
            <ul style={{ paddingLeft: '1.5rem', color: '#fff', marginBottom: '2rem' }}>
              <li style={{ marginBottom: '0.5rem' }}>Why did you feel so confident this was false?</li>
              <li style={{ marginBottom: '0.5rem' }}>What evidence would you need to see to change your mind?</li>
            </ul>

            <h4 style={{ marginBottom: '1rem', color: '#a1a1aa' }}>Hint Ladder</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '0.25rem' }}>Level 1: Consider physical phenomena that defy common sense.</div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '0.25rem' }}>Level 2: Search for 'Mpemba effect'.</div>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <h3 style={{ marginBottom: '1rem' }}>Offline Use</h3>
            <p style={{ color: '#a1a1aa', marginBottom: '1rem' }}>Instruct students to use physical confidence cards if devices are not available.</p>
            <a href="#" className="btn btn-ghost" style={{ textDecoration: 'none' }}>Download Printable Cards PDF</a>
          </div>
        </div>
      )}
    </div>
  );
}

export default Classroom;
