import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { ROLE_INFO } from '../utils/constants';
import { IconRole, IconDead, IconLock } from './Icons';

export default function PlayerHeader() {
  const { players, playerColors, playerId, myRole, revealedRoles, world, phase } = useGame();
  const [roleShown, setRoleShown] = useState(false);

  const roleInfo = myRole ? ROLE_INFO[myRole] : null;
  const settingLabel = world?.setting_name || '';

  const phaseBadge = phase === 'meeting'
    ? { label: 'Meeting', cls: 'border-warn/40 text-warn/80 bg-warn/5' }
    : phase === 'ended'
    ? { label: 'Ended', cls: 'border-ink-500 text-slate-mid bg-ink-800/40' }
    : null;

  return (
    <div className="flex-shrink-0 border-b border-ink-600 bg-ink-900/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-2 gap-3">
        <span className="text-slate-mid text-xs truncate">{settingLabel}</span>

        <div className="flex items-center gap-2 flex-shrink-0">
          {phaseBadge && (
            <span className={`text-xs border rounded px-1.5 py-0.5 ${phaseBadge.cls}`}>
              {phaseBadge.label}
            </span>
          )}

          {/* Role — hidden by default, hold to reveal */}
          {myRole && (
            <button
              onPointerDown={() => setRoleShown(true)}
              onPointerUp={() => setRoleShown(false)}
              onPointerLeave={() => setRoleShown(false)}
              onContextMenu={e => e.preventDefault()}
              className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded border
                select-none touch-none transition-colors focus:outline-none
                ${roleShown && roleInfo
                  ? `border-ink-500 ${roleInfo.color}`
                  : 'border-ink-600 text-slate-mid hover:border-ink-500 hover:text-slate-soft'
                }`}
              title="Hold to reveal your role"
            >
              {roleShown && roleInfo
                ? <><IconRole role={myRole} /><span>{roleInfo.label}</span></>
                : <><IconLock className="w-2.5 h-2.5" /><span>Role</span></>
              }
            </button>
          )}
        </div>
      </div>

      {/* Players strip */}
      <div className="flex items-center gap-1.5 px-4 pb-2.5 overflow-x-auto">
        {players.map(p => {
          const color = playerColors[p.id];
          const isMe = p.id === playerId;
          const isDead = p.status === 'dead';
          // Only show roles the server has explicitly revealed — never expose myRole in the strip
          const revealedRole = revealedRoles[p.id];

          return (
            <div
              key={p.id}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs
                whitespace-nowrap flex-shrink-0 transition-all
                ${isDead
                  ? 'border-ink-600/60 text-slate-mid/60 bg-ink-800/30'
                  : isMe
                    ? `${color?.border || 'border-slate-dim/50'} text-slate-light bg-ink-800`
                    : 'border-ink-500/70 text-slate-muted bg-ink-800/60'
                }`}
            >
              {isDead ? (
                <span className="text-slate-mid/60">
                  <IconDead className="w-2.5 h-2.5" />
                </span>
              ) : (
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color?.dot || (isMe ? '#a07c58' : '#3e2d1e') }}
                />
              )}

              <span className={isDead ? 'line-through opacity-50' : ''}>
                {p.name}
              </span>

              {isMe && <span className="text-slate-mid/70 text-[10px]">you</span>}

              {revealedRole && (
                <span className={ROLE_INFO[revealedRole]?.color || 'text-slate-mid'}>
                  <IconRole role={revealedRole} />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
