import { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { CountdownBar } from './Timer';

const CHOICE_TIMEOUT = 20000;

const TYPE_ACCENT = {
  move:     'hover:border-accent/45 hover:bg-accent/8',
  interact: 'hover:border-slate-dim/60 hover:bg-ink-700',
  hide:     'hover:border-slate-dim/60 hover:bg-ink-700',
  attack:   'hover:border-danger/60 hover:bg-danger/10 hover:text-red-300',
};

export default function ChoiceButtons({ choices, roundId }) {
  const { submitChoice, phase } = useGame();
  const [chosen, setChosen] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    // Auto-select "hide" choice on timeout, fall back to last choice
    timerRef.current = setTimeout(() => {
      if (!chosen && choices?.length > 0) {
        const hideChoice = choices.find(c => c.type === 'hide') || choices[choices.length - 1];
        pick(hideChoice, true);
      }
    }, CHOICE_TIMEOUT);

    return () => clearTimeout(timerRef.current);
  }, []);

  // If meeting started, silently discard without auto-selecting
  useEffect(() => {
    if (phase === 'meeting') {
      clearTimeout(timerRef.current);
    }
  }, [phase]);

  function pick(choice, isAuto = false) {
    if (chosen) return;
    clearTimeout(timerRef.current);
    setChosen({ ...choice, isAuto });
    submitChoice(choice.id);
  }

  if (chosen) {
    return (
      <div className="mt-2 text-sm text-slate-soft">
        {chosen.isAuto
          ? <span className="text-slate-mid">You didn't do anything.</span>
          : chosen.text
        }
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-1.5">
      <CountdownBar durationMs={CHOICE_TIMEOUT} className="mb-2.5" />
      {(choices || []).map((choice, i) => (
        <button
          key={choice.id}
          onClick={() => pick(choice)}
          className={`w-full text-left px-3.5 py-2.5 rounded-md border border-ink-500
            bg-ink-800 text-slate-light text-sm transition-all duration-150
            ${TYPE_ACCENT[choice.type] || TYPE_ACCENT.interact}
            active:scale-[0.99] focus:outline-none focus:border-slate-dim`}
        >
          <span className="text-slate-mid text-xs mr-2.5 font-mono">{i + 1}</span>
          {choice.text}
        </button>
      ))}
    </div>
  );
}
