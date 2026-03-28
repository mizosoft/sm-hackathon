import { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import ChoiceButtons from './ChoiceButtons';
import VoteButtons from './VoteButtons';
import { IconNarrator, IconClue } from './Icons';

// ─── Typewriter hook ─────────────────────────────────────────────────────────

function useTypewriter(text, speed = 22, enabled = true) {
  const [displayed, setDisplayed] = useState(enabled ? '' : text);
  const [done, setDone] = useState(!enabled);

  useEffect(() => {
    if (!enabled) { setDisplayed(text); setDone(true); return; }
    setDisplayed('');
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { setDone(true); clearInterval(id); }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, enabled]);

  return { displayed, done };
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 h-5">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </div>
  );
}

// ─── Message components ───────────────────────────────────────────────────────

function NarratorMsg({ content, typewrite = true }) {
  const [showTyping, setShowTyping] = useState(typewrite);
  const [show, setShow] = useState(!typewrite);
  const { displayed, done } = useTypewriter(content, 22, show);

  useEffect(() => {
    if (!typewrite) return;
    const t = setTimeout(() => { setShowTyping(false); setShow(true); }, 700);
    return () => clearTimeout(t);
  }, [typewrite]);

  return (
    <div className="animate-fade-up flex gap-3">
      <div className="flex-shrink-0 mt-0.5 text-accent/40">
        <IconNarrator className="w-3 h-3" />
      </div>
      <div className="flex-1 min-w-0">
        {showTyping ? (
          <TypingIndicator />
        ) : (
          <p className="text-slate-light text-sm leading-relaxed">
            {displayed}
            {!done && (
              <span className="inline-block w-px h-3.5 bg-slate-soft ml-0.5 animate-cursor-blink" />
            )}
          </p>
        )}
      </div>
    </div>
  );
}

function ResultMsg({ content }) {
  return (
    <div className="animate-fade-up flex gap-3">
      <div className="flex-shrink-0 mt-0.5 text-slate-mid opacity-50">
        <IconNarrator className="w-3 h-3" />
      </div>
      <p className="text-slate-muted text-sm leading-relaxed italic">{content}</p>
    </div>
  );
}

function PlayerActionMsg({ content, sender, isMe }) {
  return (
    <div className={`animate-fade-up flex ${isMe ? 'justify-end' : 'justify-start gap-3'}`}>
      {!isMe && (
        <div className="flex-shrink-0 w-5 h-5 rounded-sm bg-ink-600 flex items-center justify-center
          text-slate-soft text-[10px] font-medium mt-0.5">
          {sender?.[0]?.toUpperCase()}
        </div>
      )}
      <div className={`max-w-[75%] ${isMe ? '' : ''}`}>
        {!isMe && (
          <p className="text-slate-mid text-xs mb-0.5">{sender}</p>
        )}
        <div className={`rounded-md px-3 py-2 text-sm
          ${isMe
            ? 'bg-ink-700 border border-ink-500 text-slate-light'
            : 'bg-ink-800 border border-ink-600 text-slate-muted'
          }`}
        >
          {content}
        </div>
      </div>
    </div>
  );
}

function PrivateInfoMsg({ content }) {
  const isClue = content.startsWith('[clue]') || content.startsWith('Clue:');
  return (
    <div className="animate-fade-up flex gap-3">
      <div className={`flex-shrink-0 mt-0.5 ${isClue ? 'text-warn' : 'text-accent/35'}`}>
        {isClue
          ? <IconClue className="w-3.5 h-3.5" />
          : <div className="w-px h-4 bg-accent/40 mt-0.5" />
        }
      </div>
      <p className={`text-sm italic leading-relaxed ${isClue ? 'text-warn/80' : 'text-slate-muted'}`}>
        {content}
      </p>
    </div>
  );
}

function DividerMsg({ label, color = 'border-ink-500' }) {
  return (
    <div className="animate-fade-up flex items-center gap-3 py-1">
      <div className={`flex-1 border-t ${color}`} />
      <span className="text-xs uppercase tracking-widest text-slate-mid px-1 flex-shrink-0">
        {label}
      </span>
      <div className={`flex-1 border-t ${color}`} />
    </div>
  );
}

function BodyDiscoveryMsg({ content }) {
  return (
    <div className="animate-fade-up">
      <div className="border-l-2 border-danger bg-danger/8 rounded-r-md px-4 py-3">
        <p className="text-red-300/90 text-sm font-medium tracking-wide">{content}</p>
      </div>
    </div>
  );
}

function MeetingBannerMsg({ content }) {
  return (
    <div className="animate-fade-up">
      <DividerMsg label="Emergency Meeting" color="border-warn/30" />
      <div className="border-l-2 border-warn/70 bg-warn/5 rounded-r-md px-4 py-2.5 mt-1">
        <p className="text-amber-300 text-sm font-medium">{content}</p>
      </div>
    </div>
  );
}

function DiscussionMsg({ content, sender, senderId }) {
  const { playerId, playerColors } = useGame();
  const isMe = senderId === playerId;
  const color = playerColors[senderId];

  if (isMe) {
    return (
      <div className="animate-fade-up flex justify-end">
        <div className="max-w-[72%] bg-ink-700 border border-accent/20 rounded-md px-3 py-2">
          <p className="text-slate-light text-sm">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up flex gap-2.5">
      <div className={`flex-shrink-0 w-5 h-5 rounded-sm flex items-center justify-center
        text-[10px] font-medium text-white mt-0.5 ${color?.bg || 'bg-ink-600'}`}>
        {sender?.[0]?.toUpperCase()}
      </div>
      <div className="max-w-[72%]">
        <p className={`text-xs mb-1 ${color?.text || 'text-slate-soft'}`}>{sender}</p>
        <div className="bg-ink-800 border border-ink-600 rounded-md px-3 py-2">
          <p className="text-slate-light text-sm">{content}</p>
        </div>
      </div>
    </div>
  );
}

function VoteResultMsg({ content, data }) {
  const wasKiller = data?.wasKiller;
  const noElim = !data?.eliminated;

  return (
    <div className="animate-fade-up">
      <div className={`border-l-2 rounded-r-md px-4 py-2.5
        ${wasKiller
          ? 'border-good bg-good/5'
          : noElim
            ? 'border-ink-500 bg-ink-800/40'
            : 'border-danger/50 bg-danger/5'
        }`}
      >
        <p className={`text-sm font-medium
          ${wasKiller ? 'text-green-300' : noElim ? 'text-slate-muted' : 'text-red-300'}`}
        >
          {content}
        </p>
      </div>
      {data?.votes && <DividerMsg label="Meeting ended" color="border-ink-500/50" />}
    </div>
  );
}

function GameOverMsg({ content, data }) {
  const isWin = data?.winner === 'innocents';

  return (
    <div className="animate-fade-up">
      <DividerMsg
        label="Game Over"
        color={isWin ? 'border-good/40' : 'border-danger/40'}
      />
      <div className={`border-l-2 rounded-r-md px-5 py-4 mt-1
        ${isWin ? 'border-good/70 bg-good/5' : 'border-danger/70 bg-danger/5'}`}
      >
        <p className={`font-semibold text-sm mb-3 ${isWin ? 'text-green-300' : 'text-red-300'}`}>
          {content}
        </p>
        {data?.roles && (
          <div className="space-y-1.5 mt-3 pt-3 border-t border-ink-500/50">
            <p className="text-slate-mid text-xs uppercase tracking-wider mb-2">Role Reveal</p>
            {data.roles.map(r => (
              <div key={r.id} className="flex items-center gap-2 text-sm">
                <span className={r.status === 'dead' ? 'text-slate-mid line-through' : 'text-slate-light'}>
                  {r.name}
                </span>
                <span className="text-slate-mid text-xs">—</span>
                <span className={
                  r.role === 'killer' ? 'text-red-400' :
                  r.role === 'investigator' ? 'text-blue-400' : 'text-slate-muted'
                }>
                  {r.role}
                </span>
                {r.isAI && <span className="text-slate-mid text-xs">(ai)</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function ChatMessage({ message }) {
  const { playerId } = useGame();

  switch (message.type) {
    case 'typing_indicator':
      return (
        <div className="flex gap-3 animate-fade-in">
          <div className="flex-shrink-0 mt-1 text-accent/40">
            <IconNarrator className="w-3 h-3" />
          </div>
          <div className="flex items-center gap-1 h-5">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        </div>
      );

    case 'narrator':
      return <NarratorMsg content={message.content} typewrite={true} />;

    case 'result':
      return <ResultMsg content={message.content} />;

    case 'choice':
      if (message._resolved) return null;
      return (
        <div className="animate-fade-up">
          <NarratorMsg content={message.content} typewrite={false} />
          <div className="ml-6">
            <ChoiceButtons choices={message.choices} roundId={message.roundId} />
          </div>
        </div>
      );

    case 'player_action':
      return <PlayerActionMsg content={message.content} sender={message.sender} isMe={true} />;

    case 'private_info':
      return <PrivateInfoMsg content={message.content} />;

    case 'body_discovery':
      return <BodyDiscoveryMsg content={message.content} />;

    case 'meeting_banner':
      return <MeetingBannerMsg content={message.content} />;

    case 'discussion':
      return (
        <DiscussionMsg
          content={message.content}
          sender={message.sender}
          senderId={message.senderId}
        />
      );

    case 'vote_prompt':
      return (
        <div className="animate-fade-up">
          <DividerMsg label="Vote" color="border-ink-500/60" />
          <div className="flex gap-3 mt-2">
            <div className="flex-shrink-0 mt-0.5 text-slate-mid">
              <IconNarrator className="w-3 h-3" />
            </div>
            <div className="flex-1">
              <p className="text-slate-light text-sm mb-0.5">{message.content}</p>
              <VoteButtons candidates={message.candidates} />
            </div>
          </div>
        </div>
      );

    case 'vote_result':
      return <VoteResultMsg content={message.content} data={message.data} />;

    case 'game_over':
      return <GameOverMsg content={message.content} data={message.data} />;

    default:
      return (
        <p className="text-slate-mid text-xs italic animate-fade-in">{message.content}</p>
      );
  }
}
