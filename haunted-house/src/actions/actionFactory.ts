/** Action builder helpers. */

import type {
  MoveAction,
  DoTaskAction,
  FollowAction,
  EmergencyMeetingAction,
  KillAction,
  SabotageAction,
  PretendTaskAction,
} from './actionTypes.js';

export function moveAction(playerId: string, targetRoomId: string): MoveAction {
  return { kind: 'MOVE', playerId, targetRoomId };
}

export function doTaskAction(playerId: string, taskId: string): DoTaskAction {
  return { kind: 'DO_TASK', playerId, taskId };
}

export function followAction(playerId: string, targetPlayerId: string): FollowAction {
  return { kind: 'FOLLOW', playerId, targetPlayerId };
}

export function emergencyMeetingAction(playerId: string): EmergencyMeetingAction {
  return { kind: 'EMERGENCY_MEETING', playerId };
}

export function killAction(playerId: string, targetPlayerId: string): KillAction {
  return { kind: 'KILL', playerId, targetPlayerId };
}

export function sabotageAction(playerId: string, targetRoomId: string): SabotageAction {
  return { kind: 'SABOTAGE', playerId, targetRoomId };
}

export function pretendTaskAction(playerId: string): PretendTaskAction {
  return { kind: 'PRETEND_TASK', playerId };
}
