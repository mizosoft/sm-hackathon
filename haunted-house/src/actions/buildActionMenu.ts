/** Build the legal action menu for a player. */

import type { GameState, Player } from '../core/types.js';
import type { ActionKind } from './actionTypes.js';
import { MEETING_COOLDOWN_ROUNDS, KILL_COOLDOWN_ROUNDS } from '../core/constants.js';
import { connectedRooms } from '../domain/room/roomSelectors.js';
import { tasksInRoom } from '../domain/task/taskSelectors.js';
import { alivePlayers, playersInRoom } from '../domain/player/playerSelectors.js';

export interface MenuItem {
  kind: ActionKind;
  label: string;
  targetId?: string;
}

export function buildActionMenu(state: GameState, player: Player): MenuItem[] {
  const items: MenuItem[] = [];

  // Round 0: only MOVE
  if (state.round === 0) {
    for (const room of connectedRooms(state, player.roomId)) {
      items.push({ kind: 'MOVE', label: `🚶 Move to ${room.name}`, targetId: room.id });
    }
    return items;
  }

  // MOVE is always available
  for (const room of connectedRooms(state, player.roomId)) {
    const roomPeople = playersInRoom(state, room.id).length;
    const suffix = roomPeople > 0 ? ` (${roomPeople} player${roomPeople > 1 ? 's' : ''} there)` : ' (empty)';
    items.push({ kind: 'MOVE', label: `🚶 Move to ${room.name}${suffix}`, targetId: room.id });
  }

  if (player.role === 'innocent') {
    // DO_TASK
    for (const task of tasksInRoom(state, player.roomId)) {
      items.push({ kind: 'DO_TASK', label: `🔧 Do task: ${task.name}`, targetId: task.id });
    }

    // FOLLOW
    const roommates = playersInRoom(state, player.roomId).filter(p => p.id !== player.id);
    for (const p of roommates) {
      items.push({ kind: 'FOLLOW', label: `👣 Follow ${p.name} (go where they go)`, targetId: p.id });
    }

    // EMERGENCY_MEETING
    if (canCallMeeting(state, player)) {
      items.push({ kind: 'EMERGENCY_MEETING', label: '🔔 Call Emergency Meeting (gather & vote)' });
    }
  } else {
    // Possessed actions
    const targets = playersInRoom(state, player.roomId).filter(p => p.id !== player.id && p.alive);

    // KILL (only if cooldown allows)
    if (state.round - state.lastKillRound >= KILL_COOLDOWN_ROUNDS) {
      for (const t of targets) {
        items.push({ kind: 'KILL', label: `☠️  Kill ${t.name}`, targetId: t.id });
      }
    }

    // SABOTAGE
    const roomName = state.rooms.find(r => r.id === player.roomId)?.name ?? 'this room';
    items.push({ kind: 'SABOTAGE', label: `💣 Sabotage ${roomName} (block tasks here)`, targetId: player.roomId });

    // PRETEND_TASK
    items.push({ kind: 'PRETEND_TASK', label: '🎭 Pretend to do a task (looks normal to others)' });

    // EMERGENCY_MEETING
    if (canCallMeeting(state, player)) {
      items.push({ kind: 'EMERGENCY_MEETING', label: '🔔 Call Emergency Meeting (gather & vote)' });
    }
  }

  return items;
}

function canCallMeeting(state: GameState, player: Player): boolean {
  if (state.round < state.meetingCooldownUntilRound) return false;
  if (player.lastEmergencyMeetingRound >= 0 &&
      state.round - player.lastEmergencyMeetingRound < MEETING_COOLDOWN_ROUNDS) return false;
  return true;
}
