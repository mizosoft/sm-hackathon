import { useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import ChatMessage from './ChatMessage';

export default function ChatFeed() {
  const { messages } = useGame();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 bg-ink-950">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center select-none">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-ink-600 mb-3">
            <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="1" />
            <circle cx="14" cy="14" r="7" stroke="currentColor" strokeWidth="0.75" />
            <circle cx="14" cy="14" r="2.5" stroke="currentColor" strokeWidth="0.75" />
            <circle cx="14" cy="14" r="1" fill="currentColor" />
          </svg>
          <p className="text-slate-mid/50 text-xs">The story has not started yet.</p>
        </div>
      )}

      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}

      <div ref={bottomRef} className="h-1" />
    </div>
  );
}
