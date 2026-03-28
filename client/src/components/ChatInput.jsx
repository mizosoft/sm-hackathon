import { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import Timer from './Timer';
import { IconLock, IconSend } from './Icons';

export default function ChatInput() {
  const { sendChatMessage, skipDiscussion, discussionActive, discussionEndsAt, skipVotes, players, playerId } = useGame();
  const [text, setText] = useState('');
  const [skipVoted, setSkipVoted] = useState(false);
  const inputRef = useRef(null);

  const me = players.find(p => p.id === playerId);
  const isDead = me?.status === 'dead';
  const locked = !discussionActive || isDead;

  function handleSkip() {
    if (skipVoted || isDead) return;
    setSkipVoted(true);
    skipDiscussion();
  }

  useEffect(() => {
    if (!locked) inputRef.current?.focus();
  }, [locked]);

  function send() {
    const trimmed = text.trim();
    if (!trimmed || locked) return;
    sendChatMessage(trimmed);
    setText('');
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex-shrink-0 border-t border-ink-600 bg-ink-900">
      {discussionActive && discussionEndsAt && !isDead && (
        <div className="px-4 pt-2.5 pb-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 text-xs text-slate-soft">
              <span>Discussion</span>
            </div>
            {skipVotes && (
              <button
                onClick={handleSkip}
                disabled={skipVoted}
                className={`text-xs px-2.5 py-1 rounded border transition-all
                  ${skipVoted
                    ? 'border-ink-500 text-slate-mid cursor-default'
                    : 'border-ink-500 text-slate-soft hover:border-slate-dim hover:text-slate-light'
                  }`}
              >
                {skipVoted
                  ? `Skip ${skipVotes.count}/${skipVotes.needed}`
                  : skipVotes.count > 0
                    ? `Skip (${skipVotes.count}/${skipVotes.needed})`
                    : 'Skip discussion'
                }
              </button>
            )}
          </div>
          <Timer endsAt={discussionEndsAt} />
        </div>
      )}

      <div className="flex items-center gap-2 px-3 py-3">
        <div className={`flex-1 flex items-center gap-2 rounded-lg border transition-all duration-200
          ${locked
            ? 'border-ink-600 bg-ink-800/50'
            : 'border-ink-500 bg-ink-800 focus-within:border-slate-dim'
          }`}
        >
          <div className="flex-1 flex items-center px-3 py-2 min-h-[38px]">
            {locked ? (
              <div className="flex items-center gap-2 text-slate-mid text-sm select-none">
                <IconLock className="w-3.5 h-3.5 flex-shrink-0" />
                <span>
                  {isDead ? 'Dead — spectating' : 'Waiting for a meeting...'}
                </span>
              </div>
            ) : (
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={onKey}
                placeholder="Say something..."
                maxLength={280}
                className="w-full bg-transparent text-slate-bright text-sm outline-none placeholder-slate-mid"
              />
            )}
          </div>

          {!locked && (
            <button
              onClick={send}
              disabled={!text.trim()}
              className="mr-2 p-1.5 rounded text-slate-soft hover:text-slate-light
                disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <IconSend className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
