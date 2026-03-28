import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGame } from '../context/GameContext';

export default function LobbyPage() {
  const { roomCode: paramCode } = useParams();
  const navigate = useNavigate();
  const {
    roomCode, playerId, isHost, phase, players,
    world, addAIPlayer, removeAIPlayer, startGame,
  } = useGame();

  const [copied, setCopied] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    if (phase === 'playing') {
      navigate(`/game/${roomCode || paramCode}`);
    }
  }, [phase, roomCode, paramCode, navigate]);

  useEffect(() => {
    if (!roomCode && phase === 'home') navigate('/');
  }, [roomCode, phase, navigate]);

  function copyCode() {
    navigator.clipboard.writeText(roomCode || paramCode || '').catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const code = roomCode || paramCode;
  const aiPlayers = players.filter(p => p.isAI);
  const canStart = isHost && players.length >= 4;

  return (
    <div className="min-h-screen bg-ink-950 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-bright">Lobby</h2>
          <p className="text-slate-mid text-sm mt-0.5">Share the code with friends</p>
        </div>

        {/* Room code */}
        <div className="border border-ink-500 rounded-md px-4 py-3 mb-5 flex items-center justify-between">
          <div>
            <p className="text-slate-mid text-xs mb-1">Room code</p>
            <span className="text-xl font-mono font-semibold text-slate-bright tracking-widest">
              {code}
            </span>
          </div>
          <button
            onClick={copyCode}
            className="text-xs border border-ink-500 rounded px-2.5 py-1
              text-slate-soft hover:border-slate-dim hover:text-slate-light transition-all"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* Players */}
        <div className="border border-ink-500 rounded-md mb-4 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-ink-500">
            <span className="text-slate-soft text-xs">
              Players ({players.length}/6)
            </span>
            {isHost && players.length < 6 && aiPlayers.length < 3 && (
              <button
                onClick={addAIPlayer}
                className="text-xs text-accent/80 hover:text-accent transition-colors"
              >
                + Add AI agent
              </button>
            )}
          </div>

          <div className="divide-y divide-ink-600">
            {players.map(p => (
              <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className={`w-6 h-6 rounded-sm flex items-center justify-center text-xs font-medium
                    ${p.isAI
                      ? 'border border-ink-500 text-slate-mid bg-ink-700'
                      : 'border border-ink-500 text-slate-soft bg-ink-800'
                    }`}
                  >
                    {p.isAI ? 'AI' : p.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <span className="text-slate-light text-sm">{p.name}</span>
                    {p.id === playerId && (
                      <span className="text-slate-mid text-xs ml-1.5">you</span>
                    )}
                    {isHost && p.id === playerId && (
                      <span className="text-accent/60 text-xs ml-1.5">host</span>
                    )}
                  </div>
                  {p.isAI && (
                    <span className="text-slate-mid text-xs border border-ink-500 rounded px-1.5 py-0.5">
                      agent
                    </span>
                  )}
                </div>

                {isHost && p.isAI && (
                  <button
                    onClick={() => removeAIPlayer(p.id)}
                    className="text-slate-mid text-xs hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          {players.length < 4 && (
            <div className="px-4 py-3 border-t border-ink-600">
              <p className="text-slate-mid text-xs">
                {isHost
                  ? `Need ${4 - players.length} more player(s). Add AI agents to fill spots.`
                  : 'Waiting for more players...'}
              </p>
            </div>
          )}
        </div>

        {/* World preview */}
        <div className="border border-ink-500 rounded-md px-4 py-3 mb-5">
          <p className="text-slate-mid text-xs mb-1">Setting</p>
          {world?.setting_name ? (
            <>
              <p className="text-slate-light text-sm font-medium">{world.setting_name}</p>
              {world.setting_description && (
                <p className="text-slate-mid text-xs mt-1 leading-relaxed">{world.setting_description}</p>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-slate-mid text-xs py-0.5">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="ml-1">Generating setting...</span>
            </div>
          )}
        </div>

        {/* How to play */}
        <div className="border border-ink-500 rounded-md mb-5 overflow-hidden">
          <button
            onClick={() => setGuideOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-2.5
              text-slate-soft text-xs hover:text-slate-light transition-colors focus:outline-none"
          >
            <span>How to play</span>
            <span className="text-slate-mid">{guideOpen ? '▲' : '▼'}</span>
          </button>

          {guideOpen && (
            <div className="px-4 pb-4 border-t border-ink-600 space-y-3 pt-3">
              {/* Roles */}
              <div className="space-y-1.5">
                <p className="text-slate-mid text-[10px] uppercase tracking-[0.15em]">Roles</p>
                <div className="space-y-1">
                  <p className="text-xs text-slate-light"><span className="text-danger/80">Killer</span> — eliminate players without being caught. Blend in.</p>
                  <p className="text-xs text-slate-light"><span className="text-blue-400/80">Investigator</span> — find clues, call meetings, expose the killer.</p>
                  <p className="text-xs text-slate-light"><span className="text-slate-soft">Innocent</span> — survive and vote out the killer.</p>
                </div>
              </div>

              {/* Rounds */}
              <div className="space-y-1.5">
                <p className="text-slate-mid text-[10px] uppercase tracking-[0.15em]">Each round</p>
                <p className="text-xs text-slate-muted leading-relaxed">
                  Pick one of three actions — move to another area, interact with your surroundings, or stay hidden. The killer can attack if they're alone with someone. You won't see what others chose.
                </p>
              </div>

              {/* Meetings */}
              <div className="space-y-1.5">
                <p className="text-slate-mid text-[10px] uppercase tracking-[0.15em]">Emergency meetings</p>
                <p className="text-xs text-slate-muted leading-relaxed">
                  Call a meeting to discuss and vote someone out. A majority vote eliminates them. Everyone can vote to skip discussion early.
                </p>
              </div>

              {/* Win */}
              <div className="space-y-1.5">
                <p className="text-slate-mid text-[10px] uppercase tracking-[0.15em]">Winning</p>
                <p className="text-xs text-slate-muted leading-relaxed">
                  Innocents win if the killer is voted out. The killer wins if only 2 players remain alive.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Start / wait */}
        {isHost ? (
          <button
            onClick={startGame}
            disabled={!canStart || phase === 'starting'}
            className={`w-full py-3 rounded-md text-sm font-medium transition-all
              ${canStart && phase !== 'starting'
                ? 'bg-accent/20 border border-accent/40 text-accent hover:bg-accent/30 active:scale-[0.99]'
                : 'border border-ink-500 bg-ink-800 text-slate-mid cursor-not-allowed'
              } focus:outline-none`}
          >
            {phase === 'starting' ? 'Starting...' : 'Start game'}
          </button>
        ) : (
          <div className="flex items-center gap-2 text-slate-mid text-sm py-2">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="ml-1">Waiting for host...</span>
          </div>
        )}

      </div>
    </div>
  );
}
