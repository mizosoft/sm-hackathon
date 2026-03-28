import { useEffect, useState } from 'react';

export default function Timer({ endsAt, onExpire, className = '' }) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [pct, setPct] = useState(100);

  useEffect(() => {
    if (!endsAt) return;
    const total = endsAt - Date.now();
    if (total <= 0) { onExpire?.(); return; }

    const tick = () => {
      const remaining = endsAt - Date.now();
      if (remaining <= 0) {
        setSecondsLeft(0);
        setPct(0);
        onExpire?.();
        return;
      }
      setSecondsLeft(Math.ceil(remaining / 1000));
      setPct((remaining / total) * 100);
    };

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt, onExpire]);

  const barColor = pct > 50 ? 'bg-accent' : pct > 25 ? 'bg-warn' : 'bg-danger';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="flex-1 h-px bg-ink-600 overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs tabular-nums font-mono ${pct < 25 ? 'text-danger' : 'text-slate-soft'}`}>
        {secondsLeft}s
      </span>
    </div>
  );
}

export function CountdownBar({ durationMs, className = '' }) {
  const [endsAt] = useState(() => Date.now() + durationMs);
  return <Timer endsAt={endsAt} className={className} />;
}
