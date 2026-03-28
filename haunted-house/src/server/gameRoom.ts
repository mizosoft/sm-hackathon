/** Multiplayer game room — scoped to a Socket.IO room namespace. */

import type { Server, Socket } from 'socket.io';
import type { GameState, Player } from '../core/types.js';
import type { GameContext } from '../core/gameContext.js';
import type { GameAction } from '../actions/actionTypes.js';
import type { EngineResult } from '../core/engine.js';
import { setupGame } from '../core/setupGame.js';
import { processRound, processMeeting, advanceRound } from '../core/engine.js';
import { buildActionMenu } from '../actions/buildActionMenu.js';
import { alivePlayers } from '../domain/player/playerSelectors.js';
import { escapeProgress, tasksInRoom } from '../domain/task/taskSelectors.js';
import { cluesForPlayer } from '../domain/clue/clueSelectors.js';
import { connectedRooms } from '../domain/room/roomSelectors.js';
import {
  moveAction, doTaskAction, followAction,
  emergencyMeetingAction, killAction, sabotageAction, pretendTaskAction,
} from '../actions/actionFactory.js';
import { MIN_PLAYERS, MAX_PLAYERS } from '../core/constants.js';

// ── Types ────────────────────────────────────────────────

interface ConnectedPlayer {
  socketId: string;
  name: string;
  playerId: string | null;
  isHost: boolean;
}

interface ChallengeState {
  taskId: string;
  attempts: number;
  hintsUsed: number;
}

type RoomPhase = 'lobby' | 'roles' | 'action' | 'results' | 'meeting' | 'voting' | 'vote-results' | 'ended';

export interface RoomInfo {
  code: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  phase: RoomPhase;
}

// ── GameRoom ─────────────────────────────────────────────

export class GameRoom {
  readonly code: string;
  private io: Server;
  private phase: RoomPhase = 'lobby';
  private players = new Map<string, ConnectedPlayer>();
  private state: GameState | null = null;
  private ctx: GameContext;
  private socketToPlayer = new Map<string, string>();
  private playerToSocket = new Map<string, string>();
  private pendingActions = new Map<string, GameAction>();
  private readySet = new Set<string>();
  private challenges = new Map<string, ChallengeState>();
  private pendingVotes = new Map<string, string | null>();
  private lastRoundResult: EngineResult | null = null;
  private onEmpty: () => void;

  constructor(io: Server, code: string, ctx: GameContext, onEmpty: () => void) {
    this.io = io;
    this.code = code;
    this.ctx = ctx;
    this.onEmpty = onEmpty;
  }

  get info(): RoomInfo {
    const host = [...this.players.values()].find(p => p.isHost);
    return {
      code: this.code,
      hostName: host?.name ?? '???',
      playerCount: this.players.size,
      maxPlayers: MAX_PLAYERS,
      phase: this.phase,
    };
  }

  get playerCount(): number { return this.players.size; }
  get isJoinable(): boolean { return this.phase === 'lobby' && this.players.size < MAX_PLAYERS; }

  // ── Socket wiring ──────────────────────────────────────

  addSocket(socket: Socket, name: string): void {
    if (this.phase !== 'lobby') {
      socket.emit('error-msg', 'Game already in progress.');
      return;
    }
    if (this.players.size >= MAX_PLAYERS) {
      socket.emit('error-msg', 'Room is full.');
      return;
    }
    const taken = [...this.players.values()].some(p => p.name.toLowerCase() === name.toLowerCase());
    if (taken) { socket.emit('error-msg', 'Name already taken in this room.'); return; }

    const isHost = this.players.size === 0;
    this.players.set(socket.id, { socketId: socket.id, name, playerId: null, isHost });
    socket.join(this.code);

    socket.on('start', () => this.onStart(socket));
    socket.on('ready', () => this.onReady(socket));
    socket.on('action', (data: { kind: string; targetId?: string }) => this.onAction(socket, data));
    socket.on('answer', (text: string) => this.onAnswer(socket, text));
    socket.on('vote', (targetId: string | null) => this.onVote(socket, targetId));
    socket.on('leave-room', () => this.removeSocket(socket));
    socket.on('disconnect', () => this.removeSocket(socket));
    socket.on('restart', () => this.resetToLobby());

    socket.emit('joined-room', { name, isHost, code: this.code });
    this.broadcastLobby();
  }

  removeSocket(socket: Socket): void {
    const p = this.players.get(socket.id);
    if (!p) return;

    this.players.delete(socket.id);
    this.readySet.delete(socket.id);
    this.challenges.delete(socket.id);
    this.socketToPlayer.delete(socket.id);
    socket.leave(this.code);

    // Clean up room-specific listeners
    for (const evt of ['start', 'ready', 'action', 'answer', 'vote', 'leave-room', 'restart']) {
      socket.removeAllListeners(evt);
    }

    if (this.players.size === 0) {
      this.onEmpty();
      return;
    }

    if (this.phase === 'lobby') {
      if (p.isHost) {
        const first = this.players.values().next().value!;
        first.isHost = true;
      }
      this.broadcastLobby();
      return;
    }

    // Mid-game disconnect
    if (this.phase === 'action') this.checkAllActions();
    if (this.phase === 'voting') this.checkAllVotes();
    if (['roles', 'results', 'vote-results', 'meeting'].includes(this.phase)) {
      this.checkAllReady();
    }
  }

  // ── Emit helpers (scoped to this room) ─────────────────

  private emit(event: string, data?: unknown): void {
    this.io.to(this.code).emit(event, data);
  }

  private emitTo(socketId: string, event: string, data?: unknown): void {
    this.io.sockets.sockets.get(socketId)?.emit(event, data);
  }

  // ── Room Lobby ─────────────────────────────────────────

  private broadcastLobby(): void {
    const list = [...this.players.values()].map(p => ({ name: p.name, isHost: p.isHost }));
    const canStart = list.length >= MIN_PLAYERS;
    this.emit('lobby', { code: this.code, players: list, canStart, min: MIN_PLAYERS, max: MAX_PLAYERS });
  }

  // ── Game Start ─────────────────────────────────────────

  private async onStart(socket: Socket): Promise<void> {
    const p = this.players.get(socket.id);
    if (!p?.isHost) { socket.emit('error-msg', 'Only the host can start.'); return; }
    if (this.players.size < MIN_PLAYERS) { socket.emit('error-msg', `Need at least ${MIN_PLAYERS} players.`); return; }
    if (this.phase !== 'lobby') return;

    const entries = [...this.players.entries()];
    const names = entries.map(([, p]) => p.name);

    this.state = await setupGame(names, this.ctx);

    for (let i = 0; i < entries.length; i++) {
      const [sid] = entries[i]!;
      const player = this.state.players[i]!;
      this.socketToPlayer.set(sid, player.id);
      this.playerToSocket.set(player.id, sid);
      this.players.get(sid)!.playerId = player.id;
    }

    this.startRoleReveal();
  }

  // ── Role Reveal ────────────────────────────────────────

  private startRoleReveal(): void {
    this.phase = 'roles';
    this.readySet.clear();

    for (const [sid] of this.players) {
      const player = this.getPlayer(sid);
      if (!player) continue;
      this.emitTo(sid, 'role', {
        role: player.role,
        traits: player.traits,
        ghostName: this.state!.ghost.name,
        ghostMotive: this.state!.ghost.motive,
        ghostBackstory: this.state!.ghost.backstory,
      });
    }
  }

  // ── Ready-up ───────────────────────────────────────────

  private onReady(socket: Socket): void {
    this.readySet.add(socket.id);
    this.broadcastWaiting();
    this.checkAllReady();
  }

  private checkAllReady(): void {
    const aliveSockets = this.getAliveSockets();
    if (aliveSockets.length > 0 && aliveSockets.every(sid => this.readySet.has(sid))) {
      this.readySet.clear();
      this.advanceFromPhase();
    }
  }

  private advanceFromPhase(): void {
    if (this.phase === 'roles') {
      this.startActionPhase();
    } else if (this.phase === 'results') {
      if (this.lastRoundResult?.meetingTriggered) {
        this.startMeeting();
      } else {
        advanceRound(this.state!);
        this.startActionPhase();
      }
    } else if (this.phase === 'meeting') {
      this.startVoting();
    } else if (this.phase === 'vote-results') {
      if (this.state!.phase === 'ended') {
        this.endGame();
      } else {
        advanceRound(this.state!);
        this.startActionPhase();
      }
    }
  }

  // ── Action Phase ───────────────────────────────────────

  private startActionPhase(): void {
    if (this.state!.phase === 'ended') { this.endGame(); return; }
    this.phase = 'action';
    this.pendingActions.clear();
    this.challenges.clear();

    for (const sid of this.getAliveSockets()) {
      this.sendRoundData(sid);
    }
  }

  private sendRoundData(sid: string): void {
    const playerId = this.socketToPlayer.get(sid);
    if (!playerId) return;
    const s = this.state!;
    const player = s.players.find(p => p.id === playerId)!;
    const room = s.rooms.find(r => r.id === player.roomId)!;
    const progress = escapeProgress(s);
    const here = alivePlayers(s).filter(p => p.roomId === player.roomId && p.id !== player.id);
    const exits = connectedRooms(s, player.roomId);
    const tasks = tasksInRoom(s, player.roomId);
    const clues = cluesForPlayer(s, player.id);
    const actions = buildActionMenu(s, player);
    const lastSummary = s.roundSummaries[s.roundSummaries.length - 1];
    const priv = lastSummary?.privateMessages[playerId] ?? [];

    const recap = lastSummary && lastSummary.round >= 1
      ? { round: lastSummary.round, events: lastSummary.publicEvents }
      : null;

    this.emitTo(sid, 'round', {
      round: s.round,
      maxRounds: s.maxRounds,
      isFirstRound: s.round === 0,
      you: { name: player.name, role: player.role, traits: player.traits, alive: player.alive },
      room: {
        name: room.name,
        description: room.description,
        playersHere: here.map(p => p.name),
        exits: exits.map(r => ({
          name: r.name,
          playerCount: alivePlayers(s).filter(p => p.roomId === r.id).length,
        })),
        tasks: tasks.map(t => ({ id: t.id, name: t.name })),
      },
      progress: {
        completed: progress.completed,
        required: progress.required,
        alive: alivePlayers(s).length,
        total: s.players.length,
        dead: s.players.filter(p => !p.alive).map(p => p.name),
      },
      actions: actions.map(a => ({ kind: a.kind, label: a.label, targetId: a.targetId })),
      clues: clues.map(c => ({ text: c.text, type: c.type })),
      privateMessages: priv,
      recap,
      ghost: { name: s.ghost.name, backstory: s.ghost.backstory },
    });
  }

  // ── Action Submission ──────────────────────────────────

  private onAction(socket: Socket, data: { kind: string; targetId?: string }): void {
    if (this.phase !== 'action') return;
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId || this.pendingActions.has(playerId)) return;

    if (data.kind === 'DO_TASK' && data.targetId) {
      const task = this.state!.tasks.find(t => t.id === data.targetId);
      if (!task) return;
      this.challenges.set(socket.id, { taskId: task.id, attempts: 0, hintsUsed: 0 });
      socket.emit('challenge', {
        taskName: task.name,
        description: task.description,
        flavorText: task.challenge.flavorText,
        prompt: task.challenge.prompt,
        type: task.challenge.type,
        attempt: 1,
        maxAttempts: 3,
      });
      return;
    }

    const action = this.buildAction(playerId, data.kind, data.targetId);
    if (action) {
      this.pendingActions.set(playerId, action);
      socket.emit('action-ack', { waiting: true });
      this.broadcastActionStatus();
      this.checkAllActions();
    }
  }

  private onAnswer(socket: Socket, rawAnswer: string): void {
    const ch = this.challenges.get(socket.id);
    if (!ch) return;
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;
    const task = this.state!.tasks.find(t => t.id === ch.taskId);
    if (!task) return;

    ch.attempts++;
    const correct = normalize(rawAnswer) === normalize(task.challenge.answer);

    if (correct) {
      this.challenges.delete(socket.id);
      const action = doTaskAction(playerId, task.id);
      this.pendingActions.set(playerId, action);
      socket.emit('challenge-result', { success: true, message: 'Correct! Task completed. A clue will be revealed next round.' });
      this.broadcastActionStatus();
      this.checkAllActions();
      return;
    }

    if (ch.attempts >= 3) {
      this.challenges.delete(socket.id);
      socket.emit('challenge-result', { success: false, failed: true, message: 'Task failed. Choose another action.' });
      this.sendRoundData(socket.id);
      return;
    }

    const hint = ch.hintsUsed < task.challenge.hints.length ? task.challenge.hints[ch.hintsUsed] : undefined;
    if (hint !== undefined) ch.hintsUsed++;
    socket.emit('challenge-result', {
      success: false,
      failed: false,
      message: 'Wrong answer.',
      hint,
      attemptsLeft: 3 - ch.attempts,
    });
  }

  private checkAllActions(): void {
    const alive = alivePlayers(this.state!);
    const allSubmitted = alive.every(p => {
      const sid = this.playerToSocket.get(p.id);
      return this.pendingActions.has(p.id) || !sid || !this.io.sockets.sockets.has(sid);
    });
    if (allSubmitted) this.processRoundActions();
  }

  private broadcastActionStatus(): void {
    const alive = alivePlayers(this.state!);
    const submitted: string[] = [];
    const pending: string[] = [];
    for (const p of alive) {
      if (this.pendingActions.has(p.id)) submitted.push(p.name);
      else pending.push(p.name);
    }
    this.emit('action-status', { submitted, pending });
  }

  // ── Process Round ──────────────────────────────────────

  private async processRoundActions(): Promise<void> {
    const actions = [...this.pendingActions.values()];
    this.lastRoundResult = await processRound(this.state!, actions, this.ctx);

    if (this.state!.phase === 'ended') {
      this.endGame();
      return;
    }

    this.showResults();
  }

  private showResults(): void {
    this.phase = 'results';
    this.readySet.clear();
    const s = this.state!;
    const summary = s.roundSummaries[s.roundSummaries.length - 1];
    if (!summary) return;

    for (const [sid] of this.players) {
      const playerId = this.socketToPlayer.get(sid);
      const priv = playerId ? (summary.privateMessages[playerId] ?? []) : [];
      this.emitTo(sid, 'results', {
        round: summary.round,
        publicEvents: summary.publicEvents,
        privateMessages: priv,
        progress: { completed: s.escapeTasksCompleted, required: s.escapeTasksRequired },
      });
    }
  }

  // ── Meeting ────────────────────────────────────────────

  private startMeeting(): void {
    this.phase = 'meeting';
    this.readySet.clear();
    const s = this.state!;
    const result = this.lastRoundResult!;
    const callerName = s.players.find(p => p.id === result.meetingCalledBy)?.name ?? 'unknown';

    const locations = alivePlayers(s).map(p => ({
      name: p.name,
      room: s.rooms.find(r => r.id === p.roomId)?.name ?? '???',
    }));

    this.emit('meeting', { trigger: result.meetingTrigger, callerName, locations });
  }

  // ── Voting ─────────────────────────────────────────────

  private startVoting(): void {
    this.phase = 'voting';
    this.pendingVotes.clear();
    const alive = alivePlayers(this.state!);

    for (const [sid] of this.players) {
      const playerId = this.socketToPlayer.get(sid);
      if (!playerId) continue;
      const player = this.state!.players.find(p => p.id === playerId);
      if (!player?.alive) continue;

      const candidates = alive.filter(p => p.id !== playerId).map(p => ({ name: p.name, id: p.id }));
      this.emitTo(sid, 'vote-request', { candidates });
    }
  }

  private onVote(socket: Socket, targetId: string | null): void {
    if (this.phase !== 'voting') return;
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId || this.pendingVotes.has(playerId)) return;

    this.pendingVotes.set(playerId, targetId);
    this.checkAllVotes();
  }

  private checkAllVotes(): void {
    const alive = alivePlayers(this.state!);
    const allVoted = alive.every(p => {
      const sid = this.playerToSocket.get(p.id);
      return this.pendingVotes.has(p.id) || !sid || !this.io.sockets.sockets.has(sid);
    });
    if (allVoted) this.processVotes();
  }

  private processVotes(): void {
    const result = this.lastRoundResult!;
    const votes: Record<string, string | null> = {};
    for (const [pid, target] of this.pendingVotes) votes[pid] = target;

    const meetingResult = processMeeting(this.state!, result.meetingTrigger!, result.meetingCalledBy!, votes);

    this.phase = 'vote-results';
    this.readySet.clear();
    this.emit('vote-results', {
      events: meetingResult.events,
      gameEnded: this.state!.phase === 'ended',
      winner: this.state!.winner,
    });
  }

  // ── End Game ───────────────────────────────────────────

  private endGame(): void {
    this.phase = 'ended';
    const s = this.state!;
    const possessed = s.players.find(p => p.id === s.possessedPlayerId);

    this.emit('game-over', {
      winner: s.winner,
      possessedName: possessed?.name ?? 'unknown',
      possessedTraits: possessed?.traits ?? [],
      ghostName: s.ghost.name,
      ghostMotive: s.ghost.motive,
      ghostTraits: s.ghost.traits,
      stats: {
        rounds: s.round,
        escapeCompleted: s.escapeTasksCompleted,
        escapeRequired: s.escapeTasksRequired,
        survivors: s.players.filter(p => p.alive).map(p => p.name),
        eliminated: s.players.filter(p => !p.alive).map(p => p.name),
        cluesFound: s.clues.length,
      },
    });
  }

  // ── Reset ──────────────────────────────────────────────

  resetToLobby(): void {
    this.phase = 'lobby';
    this.state = null;
    this.socketToPlayer.clear();
    this.playerToSocket.clear();
    this.pendingActions.clear();
    this.readySet.clear();
    this.challenges.clear();
    this.pendingVotes.clear();
    this.lastRoundResult = null;
    for (const [, cp] of this.players) cp.playerId = null;
    this.broadcastLobby();
  }

  // ── Helpers ────────────────────────────────────────────

  private getPlayer(socketId: string): Player | undefined {
    const pid = this.socketToPlayer.get(socketId);
    return pid ? this.state?.players.find(p => p.id === pid) : undefined;
  }

  private getAliveSockets(): string[] {
    if (!this.state) return [...this.players.keys()];
    return alivePlayers(this.state)
      .map(p => this.playerToSocket.get(p.id))
      .filter((sid): sid is string => !!sid && this.io.sockets.sockets.has(sid));
  }

  private buildAction(playerId: string, kind: string, targetId?: string): GameAction | null {
    switch (kind) {
      case 'MOVE': return targetId ? moveAction(playerId, targetId) : null;
      case 'DO_TASK': return targetId ? doTaskAction(playerId, targetId) : null;
      case 'FOLLOW': return targetId ? followAction(playerId, targetId) : null;
      case 'EMERGENCY_MEETING': return emergencyMeetingAction(playerId);
      case 'KILL': return targetId ? killAction(playerId, targetId) : null;
      case 'SABOTAGE': return targetId ? sabotageAction(playerId, targetId) : null;
      case 'PRETEND_TASK': return pretendTaskAction(playerId);
      default: return null;
    }
  }

  private broadcastWaiting(): void {
    const aliveSockets = this.getAliveSockets();
    this.emit('waiting', { ready: this.readySet.size, total: aliveSockets.length });
  }
}

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}
