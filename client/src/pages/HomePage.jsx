import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';

function TargetMark({ className = '' }) {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="0.75" />
      <circle cx="24" cy="24" r="13" stroke="currentColor" strokeWidth="0.75" />
      <circle cx="24" cy="24" r="5.5" stroke="currentColor" strokeWidth="1" />
      <circle cx="24" cy="24" r="1.75" fill="currentColor" />
      <line x1="24" y1="0" x2="24" y2="8.5" stroke="currentColor" strokeWidth="0.75" />
      <line x1="24" y1="39.5" x2="24" y2="48" stroke="currentColor" strokeWidth="0.75" />
      <line x1="0" y1="24" x2="8.5" y2="24" stroke="currentColor" strokeWidth="0.75" />
      <line x1="39.5" y1="24" x2="48" y2="24" stroke="currentColor" strokeWidth="0.75" />
    </svg>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { createRoom, joinRoom, roomCode, phase, connected, messages } = useGame();

  const [mode, setMode] = useState(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (roomCode && (phase === 'lobby' || phase === 'starting' || phase === 'playing')) {
      navigate(`/lobby/${roomCode}`);
    }
  }, [roomCode, phase, navigate]);

  useEffect(() => {
    const errMsg = messages.findLast?.(m => m.type === 'private_info' && m.content.startsWith('Error:'))
      || messages.slice().reverse().find(m => m.type === 'private_info' && m.content.includes('Error:'));
    if (errMsg) {
      setError(errMsg.content.replace(/^(Error:\s?)/, ''));
      setLoading(false);
    }
  }, [messages]);

  function create(e) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return setError('Enter a name.');
    if (n.length > 20) return setError('Name too long.');
    setError('');
    setLoading(true);
    createRoom(n);
  }

  function join(e) {
    e.preventDefault();
    const n = name.trim();
    const c = code.trim().toUpperCase();
    if (!n) return setError('Enter a name.');
    if (!c || c.length !== 6) return setError('Enter a 6-character room code.');
    setError('');
    setLoading(true);
    joinRoom(c, n);
  }

  function back() {
    setMode(null);
    setError('');
    setLoading(false);
  }

  const inputCls = `w-full bg-ink-800 border border-ink-500 rounded-md px-3.5 py-2.5
    text-slate-bright text-sm placeholder-slate-mid/50 outline-none
    focus:border-accent/60 transition-colors`;

  return (
    <div className="min-h-screen bg-ink-950 flex flex-col items-center justify-center px-4 py-16">

      {/* Brand */}
      <div className="flex flex-col items-center gap-5 mb-10">
        <TargetMark className="text-accent/45" />
        <div className="text-center">
          <h1 className="text-[1.75rem] font-semibold text-slate-bright tracking-tight leading-tight mb-1.5">
            impost.io
          </h1>
          <p className="text-slate-mid text-sm italic">
            Someone here is lying.
          </p>
        </div>
      </div>

      {/* Connection warning */}
      {!connected && (
        <div className="mb-5 flex items-center gap-2 text-slate-soft text-xs">
          <div className="w-1.5 h-1.5 rounded-full bg-warn animate-pulse" />
          Connecting...
        </div>
      )}

      {/* Mode picker */}
      {!mode && (
        <div className="w-full max-w-[272px] space-y-2.5">
          <button
            onClick={() => setMode('create')}
            className="w-full py-3 rounded-md border border-accent/40 bg-accent/10
              text-accent text-sm font-medium hover:bg-accent/20 hover:border-accent/60
              transition-all active:scale-[0.99] focus:outline-none"
          >
            New game
          </button>

          <div className="flex items-center gap-3 py-0.5">
            <div className="flex-1 h-px bg-ink-600" />
            <span className="text-slate-mid/60 text-xs">or</span>
            <div className="flex-1 h-px bg-ink-600" />
          </div>

          <button
            onClick={() => setMode('join')}
            className="w-full py-3 rounded-md border border-ink-500 bg-ink-800
              text-slate-light text-sm font-medium hover:border-slate-dim hover:bg-ink-700
              transition-all active:scale-[0.99] focus:outline-none"
          >
            Join game
          </button>
        </div>
      )}

      {/* Create form */}
      {mode === 'create' && (
        <form onSubmit={create} className="w-full max-w-[272px] space-y-3">
          <div>
            <label className="block text-slate-mid text-xs mb-1.5 tracking-wide uppercase">Name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              maxLength={20}
              className={inputCls}
            />
          </div>

          {error && <p className="text-red-400/80 text-xs leading-relaxed">{error}</p>}

          <button
            type="submit"
            disabled={!connected || loading}
            className="w-full py-2.5 rounded-md bg-accent/15 border border-accent/40
              text-accent text-sm font-medium hover:bg-accent/25 hover:border-accent/60
              transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed
              focus:outline-none"
          >
            {loading ? 'Creating...' : 'Create game'}
          </button>

          <button type="button" onClick={back}
            className="w-full py-1.5 text-slate-mid text-xs hover:text-slate-soft transition-colors">
            ← Back
          </button>
        </form>
      )}

      {/* Join form */}
      {mode === 'join' && (
        <form onSubmit={join} className="w-full max-w-[272px] space-y-3">
          <div>
            <label className="block text-slate-mid text-xs mb-1.5 tracking-wide uppercase">Name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              maxLength={20}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-slate-mid text-xs mb-1.5 tracking-wide uppercase">Room code</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="XXXXXX"
              maxLength={6}
              className={`${inputCls} tracking-[0.25em] font-mono`}
            />
          </div>

          {error && <p className="text-red-400/80 text-xs leading-relaxed">{error}</p>}

          <button
            type="submit"
            disabled={!connected || loading}
            className="w-full py-2.5 rounded-md bg-accent/15 border border-accent/40
              text-accent text-sm font-medium hover:bg-accent/25 hover:border-accent/60
              transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed
              focus:outline-none"
          >
            {loading ? 'Joining...' : 'Join game'}
          </button>

          <button type="button" onClick={back}
            className="w-full py-1.5 text-slate-mid text-xs hover:text-slate-soft transition-colors">
            ← Back
          </button>
        </form>
      )}

      <p className="mt-14 text-slate-mid/50 text-xs tracking-wide">
        Powered by Gemini
      </p>
    </div>
  );
}
