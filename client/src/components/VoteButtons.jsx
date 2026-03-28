import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { CountdownBar } from './Timer';

const VOTE_TIMEOUT = 30000;

export default function VoteButtons({ candidates }) {
  const { submitVote, playerId, players } = useGame();
  const [voted, setVoted] = useState(null);

  function handleVote(targetId) {
    if (voted) return;
    setVoted(targetId);
    submitVote(targetId);
  }

  if (voted) {
    const name = voted === 'skip' ? 'skipped' : candidates.find(c => c.id === voted)?.name;
    return (
      <div className="mt-3 px-3 py-2.5 rounded-md border border-ink-500 bg-ink-800/60">
        <p className="text-slate-soft text-sm">
          Voted for <span className="text-slate-light font-medium">{name}</span>.
          <span className="text-slate-mid ml-1.5">Waiting for others...</span>
        </p>
      </div>
    );
  }

  const aliveCandidates = candidates.filter(c => {
    const p = players.find(pl => pl.id === c.id);
    return p?.status !== 'dead';
  });

  return (
    <div className="mt-3 space-y-1.5">
      <CountdownBar durationMs={VOTE_TIMEOUT} className="mb-3" />

      {aliveCandidates.map(c => {
        const isMe = c.id === playerId;
        return (
          <div
            key={c.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-ink-600 bg-ink-800"
          >
            <div className="w-7 h-7 rounded-sm border border-ink-500 bg-ink-700 flex items-center justify-center
              text-xs text-slate-soft font-medium flex-shrink-0">
              {c.name[0].toUpperCase()}
            </div>
            <span className="flex-1 text-slate-light text-sm">{c.name}</span>
            {isMe ? (
              <span className="text-slate-mid text-xs">you</span>
            ) : (
              <button
                onClick={() => handleVote(c.id)}
                className="text-xs px-3 py-1 rounded border border-accent/35 bg-accent/8 text-accent
                  hover:bg-accent/18 hover:border-accent/55 transition-all active:scale-95 focus:outline-none"
              >
                Vote
              </button>
            )}
          </div>
        );
      })}

      <button
        onClick={() => handleVote('skip')}
        className="w-full py-2 rounded-md border border-ink-500 text-slate-mid text-xs
          hover:border-slate-dim hover:text-slate-soft transition-all active:scale-[0.99] focus:outline-none"
      >
        Skip vote
      </button>
    </div>
  );
}
