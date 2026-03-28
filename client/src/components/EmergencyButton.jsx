import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { IconAlert } from './Icons';

export default function EmergencyButton() {
  const { myRole, emergencyMeetingsLeft, callEmergencyMeeting, phase, playerId, players, messages } = useGame();
  const [activating, setActivating] = useState(false);

  const me = players.find(p => p.id === playerId);
  const isDead = me?.status === 'dead';

  // Hide until role is assigned or if dead
  if (!myRole || isDead) return null;

  const hasActiveChoice = messages.some(m => m.type === 'choice' && !m._resolved);
  // -1 = unlimited (investigator); 0 = used up; >0 = remaining
  const canCall = emergencyMeetingsLeft !== 0 && phase === 'playing' && hasActiveChoice && !activating;
  const isUnlimited = emergencyMeetingsLeft === -1;

  function handleClick() {
    if (!canCall) return;
    setActivating(true);
    callEmergencyMeeting();
    setTimeout(() => setActivating(false), 5000);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {/* Remaining indicator */}
      <div className="flex gap-1.5 justify-end items-center h-2">
        {isUnlimited ? (
          <span className="text-accent/60 text-[10px] font-mono leading-none">∞</span>
        ) : (
          <div className={`w-1.5 h-1.5 rounded-full transition-all ${
            emergencyMeetingsLeft > 0 ? 'bg-accent' : 'bg-ink-500'
          }`} />
        )}
      </div>

      <button
        onClick={handleClick}
        disabled={!canCall}
        className={`flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium
          transition-all duration-200 focus:outline-none
          ${canCall
            ? 'border-accent/50 bg-accent/10 text-accent hover:bg-accent/20 active:scale-95'
            : 'border-ink-500 bg-ink-800 text-slate-mid cursor-not-allowed opacity-60'
          }`}
        title={emergencyMeetingsLeft === 0 ? 'No meetings left' : 'Call emergency meeting'}
      >
        <IconAlert className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="hidden sm:inline">
          {activating ? 'Calling...' : 'Emergency'}
        </span>
        {!isUnlimited && emergencyMeetingsLeft > 0 && (
          <span className={`text-xs font-mono ${canCall ? 'text-accent/70' : 'text-slate-mid'}`}>
            {emergencyMeetingsLeft}
          </span>
        )}
      </button>
    </div>
  );
}
