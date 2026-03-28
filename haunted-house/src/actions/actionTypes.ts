/** Tagged action unions. */

export type ActionKind =
  | 'MOVE'
  | 'DO_TASK'
  | 'FOLLOW'
  | 'EMERGENCY_MEETING'
  | 'KILL'
  | 'SABOTAGE'
  | 'PRETEND_TASK';

interface BaseAction {
  kind: ActionKind;
  playerId: string;
}

export interface MoveAction extends BaseAction {
  kind: 'MOVE';
  targetRoomId: string;
}

export interface DoTaskAction extends BaseAction {
  kind: 'DO_TASK';
  taskId: string;
}

export interface FollowAction extends BaseAction {
  kind: 'FOLLOW';
  targetPlayerId: string;
}

export interface EmergencyMeetingAction extends BaseAction {
  kind: 'EMERGENCY_MEETING';
}

export interface KillAction extends BaseAction {
  kind: 'KILL';
  targetPlayerId: string;
}

export interface SabotageAction extends BaseAction {
  kind: 'SABOTAGE';
  targetRoomId: string;
}

export interface PretendTaskAction extends BaseAction {
  kind: 'PRETEND_TASK';
}

export type InnocentAction = MoveAction | DoTaskAction | FollowAction | EmergencyMeetingAction;
export type PossessedAction = MoveAction | KillAction | SabotageAction | PretendTaskAction | EmergencyMeetingAction;
export type GameAction = InnocentAction | PossessedAction;
