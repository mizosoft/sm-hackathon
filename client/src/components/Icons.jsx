// Minimal SVG icon set — no emojis

export function IconNarrator({ className = 'w-3 h-3' }) {
  return (
    <svg className={className} viewBox="0 0 12 12" fill="currentColor">
      <circle cx="6" cy="6" r="5" fillOpacity="0.4" />
      <circle cx="6" cy="6" r="2.5" />
    </svg>
  );
}

export function IconClue({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="6.5" cy="6.5" r="4" />
      <line x1="9.5" y1="9.5" x2="13.5" y2="13.5" />
    </svg>
  );
}

export function IconDead({ className = 'w-3 h-3' }) {
  return (
    <svg className={className} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="2" y1="2" x2="10" y2="10" />
      <line x1="10" y1="2" x2="2" y2="10" />
    </svg>
  );
}

export function IconAlert({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M8 2L14 13H2L8 2Z" />
      <line x1="8" y1="7" x2="8" y2="9.5" />
      <circle cx="8" cy="11.5" r="0.75" fill="currentColor" />
    </svg>
  );
}

export function IconLock({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5 7V5a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

export function IconSend({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="14" y1="2" x2="2" y2="8" />
      <line x1="14" y1="2" x2="9" y2="14" />
      <line x1="14" y1="2" x2="2" y2="8" />
      <polyline points="14,2 2,8 9,14 14,2" />
    </svg>
  );
}

export function IconRole({ role, className = 'w-3 h-3' }) {
  if (role === 'killer') {
    return (
      <svg className={className} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="6" y1="1" x2="6" y2="11" />
        <path d="M3 4l3-3 3 3" />
        <line x1="3" y1="8" x2="9" y2="8" />
      </svg>
    );
  }
  if (role === 'investigator') {
    return (
      <svg className={className} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="5" cy="5" r="3.5" />
        <line x1="7.5" y1="7.5" x2="11" y2="11" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="6" cy="4" r="2.5" />
      <path d="M1 11c0-2.76 2.24-5 5-5s5 2.24 5 5" />
    </svg>
  );
}
