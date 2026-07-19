import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import GameLoop from './pages/GameLoop';
import DuelMode from './pages/DuelMode';
import DuelSession from './pages/DuelSession';
import Classroom from './pages/Classroom';
import Passport from './pages/Passport';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <nav className="navbar" style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '2rem' }}>
          <div className="navbar-brand" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--teal)' }}>DeetsCheck</div>
          <div className="navbar-links" style={{ display: 'flex', gap: '1rem' }}>
            <NavLink to="/" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>Home</NavLink>
            <NavLink to="/play" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>Play</NavLink>
            <NavLink to="/duel" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>Duel</NavLink>
            <NavLink to="/classroom" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>Classroom</NavLink>
            <NavLink to="/passport" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>Passport</NavLink>
          </div>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/play" element={<GameLoop />} />
            <Route path="/duel" element={<DuelMode />} />
            <Route path="/duel/:duelId" element={<DuelSession />} />
            <Route path="/classroom" element={<Classroom />} />
            <Route path="/passport" element={<Passport />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
