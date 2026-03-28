import { useState, useEffect, useCallback } from 'react';
import { ROLE_INFO } from '../utils/constants';
import { IconRole } from './Icons';

const DURATION = 6000;

const ROLE_ACCENT = {
  killer:       'bg-danger',
  investigator: 'bg-blue-500/80',
  innocent:     'bg-slate-soft/60',
};

export default function RoleRevealPopup({ role, onDismiss }) {
  const [pct, setPct] = useState(100);

  const dismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 1 - elapsed / DURATION) * 100;
      setPct(remaining);
      if (remaining === 0) {
        clearInterval(id);
        dismiss();
      }
    }, 40);
    return () => clearInterval(id);
  }, [dismiss]);

  const info = ROLE_INFO[role];
  if (!info) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-5 bg-ink-950/88 backdrop-blur-sm animate-fade-in"
      onClick={dismiss}
    >
      <div
        className="w-full max-w-[300px] rounded-xl border border-ink-600 bg-ink-800 overflow-hidden shadow-2xl animate-fade-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Role-colour accent bar */}
        <div className={`h-[3px] w-full ${ROLE_ACCENT[role] || 'bg-slate-soft/40'}`} />

        <div className="px-7 pt-7 pb-4 text-center">
          <p className="text-slate-mid text-[10px] uppercase tracking-[0.18em] mb-5">
            Your role
          </p>

          <div className={`flex justify-center mb-4 ${info.color}`}>
            <IconRole role={role} className="w-9 h-9" />
          </div>

          <h2 className={`text-2xl font-semibold tracking-tight mb-2.5 ${info.color}`}>
            {info.label}
          </h2>

          <p className="text-slate-muted text-sm leading-relaxed">
            {info.description}
          </p>
        </div>

        <div className="px-7 pb-6">
          {/* Countdown bar */}
          <div className="h-px bg-ink-600 rounded-full overflow-hidden mb-4">
            <div
              className={`h-full rounded-full ${ROLE_ACCENT[role] || 'bg-slate-soft/40'}`}
              style={{ width: `${pct}%`, transition: 'width 40ms linear' }}
            />
          </div>

          <button
            onClick={dismiss}
            className="w-full py-2 rounded-md border border-ink-500 text-slate-mid text-xs
              hover:border-slate-dim hover:text-slate-soft transition-colors focus:outline-none"
          >
            Begin
          </button>
        </div>
      </div>
    </div>
  );
}
