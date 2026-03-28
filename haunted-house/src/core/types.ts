/**
 * Core game types.
 * Defines GameState, Player, Room, GhostProfile, Task, Clue, Role, and related enums/unions.
 */

// ── Enums / Literal Unions ──────────────────────────────

export type Role = 'innocent' | 'possessed';
export type Phase = 'setup' | 'action' | 'resolution' | 'meeting' | 'ended';
export type TaskStatus = 'available' | 'in-progress' | 'completed' | 'sabotaged';
export type ClueType = 'behavioral' | 'environmental' | 'ghostly' | 'task-reward';
export type MeetingTrigger = 'emergency' | 'body-discovery';
export type WinCondition = 'innocents-escape' | 'possessed-eliminated' | 'timer-expired' | 'survivors-insufficient';

// ── Domain Objects ──────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  role: Role;
  alive: boolean;
  roomId: string;
  traits: string[];
  completedTasks: string[];
  knownClues: string[];
  lastEmergencyMeetingRound: number;
  pendingMove?: string;
  followingPlayerId?: string;
  eliminatedByVote: boolean;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  connectedRoomIds: string[];
  taskIds: string[];
  bodyIds: string[];
  sabotaged: boolean;
}

export interface TaskChallenge {
  type: 'riddle' | 'word-puzzle' | 'sequence' | 'choice' | 'unscramble';
  prompt: string;
  answer: string;
  hints: string[];
  flavorText: string;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  roomId: string;
  status: TaskStatus;
  assignedPlayerId?: string;
  clueRewardId?: string;
  category: string;
  challenge: TaskChallenge;
}

export interface Clue {
  id: string;
  type: ClueType;
  text: string;
  roomId?: string;
  round: number;
  pointsToPossessed: boolean;
}

export interface GhostProfile {
  archetypeId: string;
  name: string;
  motive: string;
  traits: string[];
  clueStyle: string;
  backstory: string;
}

export interface MeetingRecord {
  round: number;
  trigger: MeetingTrigger;
  calledBy: string;
  votes: Record<string, string | null>;
  eliminatedPlayerId: string | null;
  tied: boolean;
}

export interface RoundSummary {
  round: number;
  publicEvents: string[];
  privateMessages: Record<string, string[]>;
}

export interface PendingClue {
  playerId: string;
  deliverOnRound: number;
  clueText: string;
  clueType: ClueType;
  pointsToPossessed: boolean;
  roomId?: string;
}

export interface GameState {
  phase: Phase;
  round: number;
  players: Player[];
  rooms: Room[];
  tasks: Task[];
  clues: Clue[];
  ghost: GhostProfile;
  possessedPlayerId: string;
  meetingHistory: MeetingRecord[];
  roundSummaries: RoundSummary[];
  meetingCooldownUntilRound: number;
  escapeTasksRequired: number;
  escapeTasksCompleted: number;
  maxRounds: number;
  winner: WinCondition | null;
  pendingClues: PendingClue[];
  lastKillRound: number;
}
