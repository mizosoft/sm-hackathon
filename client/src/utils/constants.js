// Muted, desaturated player colors
export const PLAYER_COLORS = [
  { bg: 'bg-blue-900/60', text: 'text-blue-300', border: 'border-blue-700/50', dot: '#4466bb', label: 'blue' },
  { bg: 'bg-teal-900/60', text: 'text-teal-300', border: 'border-teal-700/50', dot: '#337777', label: 'teal' },
  { bg: 'bg-violet-900/60', text: 'text-violet-300', border: 'border-violet-700/50', dot: '#665599', label: 'violet' },
  { bg: 'bg-amber-900/60', text: 'text-amber-300', border: 'border-amber-700/50', dot: '#886633', label: 'amber' },
  { bg: 'bg-rose-900/60', text: 'text-rose-300', border: 'border-rose-700/50', dot: '#883344', label: 'rose' },
  { bg: 'bg-cyan-900/60', text: 'text-cyan-300', border: 'border-cyan-700/50', dot: '#336688', label: 'cyan' },
  { bg: 'bg-emerald-900/60', text: 'text-emerald-300', border: 'border-emerald-700/50', dot: '#336644', label: 'emerald' },
  { bg: 'bg-orange-900/60', text: 'text-orange-300', border: 'border-orange-700/50', dot: '#884422', label: 'orange' },
];

export const ROLE_INFO = {
  killer: {
    label: 'Killer',
    color: 'text-red-400',
    description: 'Get alone with one player to eliminate them. Stay out of the vote to win.',
  },
  investigator: {
    label: 'Investigator',
    color: 'text-blue-400',
    description: 'You have 3 emergency meetings. Use them to call a vote at any time.',
  },
  innocent: {
    label: 'Innocent',
    color: 'text-slate-light',
    description: 'Gather clues, stay alive, and vote out the killer.',
  },
};

export const GAME_PHASES = {
  HOME: 'home',
  LOBBY: 'lobby',
  STARTING: 'starting',
  PLAYING: 'playing',
  MEETING: 'meeting',
  ENDED: 'ended',
};
