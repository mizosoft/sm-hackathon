import { v4 as uuidv4 } from 'uuid';
import { generateRoomCode } from './utils/generateCode.js';

const AI_NAMES = ['ARIA', 'ECHO', 'CIPHER', 'VECTOR', 'NOVA', 'PHANTOM', 'RAVEN', 'SPECTER'];

class RoomManager {
  constructor() {
    this.rooms = new Map();       // code → room
    this.socketToRoom = new Map(); // socketId → roomCode
    this.socketToPlayer = new Map(); // socketId → playerId
  }

  createRoom(hostSocketId, hostName) {
    const code = this._uniqueCode();
    const hostId = uuidv4();

    const host = this._makePlayer(hostId, hostSocketId, hostName, false);

    const room = {
      code,
      hostId,
      phase: 'lobby',
      players: [host],
      world: null,
      state: {
        round: 0,
        undiscoveredBodies: [],
        deaths: [],
        storyLog: [],
        chatHighlights: [],
        meetingsHeld: 0,
        roundsSinceLastMeeting: 0,
        votesHistory: [],
        tensionLevel: 1,
      },
      _engine: null,
    };

    this.rooms.set(code, room);
    this.socketToRoom.set(hostSocketId, code);
    this.socketToPlayer.set(hostSocketId, hostId);

    return { room, player: host };
  }

  joinRoom(roomCode, socketId, playerName) {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return { error: 'Room not found' };
    if (room.phase !== 'lobby') return { error: 'Game already in progress' };
    if (room.players.length >= 6) return { error: 'Room is full' };

    const existingName = room.players.find(
      p => p.name.toLowerCase() === playerName.toLowerCase()
    );
    if (existingName) return { error: 'Name already taken in this room' };

    const playerId = uuidv4();
    const player = this._makePlayer(playerId, socketId, playerName, false);

    room.players.push(player);
    this.socketToRoom.set(socketId, roomCode.toUpperCase());
    this.socketToPlayer.set(socketId, playerId);

    return { room, player };
  }

  reconnectPlayer(roomCode, socketId, playerName) {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return { error: 'Room not found' };

    const player = room.players.find(
      p => !p.isAI && p.name.toLowerCase() === playerName.toLowerCase()
    );
    if (!player) return { error: 'Player not found in room' };

    const oldSocketId = player.socketId;
    if (oldSocketId) {
      this.socketToRoom.delete(oldSocketId);
      this.socketToPlayer.delete(oldSocketId);
    }

    player.socketId = socketId;
    player.disconnected = false;
    this.socketToRoom.set(socketId, roomCode.toUpperCase());
    this.socketToPlayer.set(socketId, player.id);

    return { room, player };
  }

  addAIPlayer(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room || room.phase !== 'lobby') return null;

    const aiCount = room.players.filter(p => p.isAI).length;
    if (aiCount >= 3) return null;
    if (room.players.length >= 6) return null;

    const usedNames = new Set(room.players.map(p => p.name));
    const availableName = AI_NAMES.find(n => !usedNames.has(n)) || `AI-${uuidv4().slice(0, 4)}`;

    const aiId = uuidv4();
    const aiPlayer = this._makePlayer(aiId, null, availableName, true);
    room.players.push(aiPlayer);

    return aiPlayer;
  }

  removeAIPlayer(roomCode, aiId) {
    const room = this.rooms.get(roomCode);
    if (!room || room.phase !== 'lobby') return false;

    const idx = room.players.findIndex(p => p.isAI && p.id === aiId);
    if (idx === -1) return false;

    room.players.splice(idx, 1);
    return true;
  }

  leaveRoom(socketId) {
    const roomCode = this.socketToRoom.get(socketId);
    if (!roomCode) return null;

    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const playerId = this.socketToPlayer.get(socketId);
    const player = room.players.find(p => p.id === playerId);

    this.socketToRoom.delete(socketId);
    this.socketToPlayer.delete(socketId);

    if (room.phase === 'lobby') {
      room.players = room.players.filter(p => p.id !== playerId);
      if (room.players.length === 0) {
        this.rooms.delete(roomCode);
        return { room: null, player };
      }
      // Transfer host if needed
      if (room.hostId === playerId && room.players.length > 0) {
        const newHost = room.players.find(p => !p.isAI) || room.players[0];
        room.hostId = newHost.id;
      }
    } else {
      // In game — mark disconnected but keep player
      if (player) player.disconnected = true;
    }

    return { room, player };
  }

  getRoom(roomCode) {
    return this.rooms.get(roomCode?.toUpperCase());
  }

  getRoomBySocket(socketId) {
    const code = this.socketToRoom.get(socketId);
    return code ? this.rooms.get(code) : null;
  }

  getPlayerBySocket(socketId) {
    const room = this.getRoomBySocket(socketId);
    if (!room) return null;
    const playerId = this.socketToPlayer.get(socketId);
    return room.players.find(p => p.id === playerId) || null;
  }

  _makePlayer(id, socketId, name, isAI) {
    return {
      id,
      socketId,
      name,
      isAI,
      role: null,
      status: 'alive',
      location: null,
      emergencyMeetingsLeft: 0,
      clues: [],
      disconnected: false,
    };
  }

  _uniqueCode() {
    let code;
    do { code = generateRoomCode(); } while (this.rooms.has(code));
    return code;
  }
}

export default RoomManager;
