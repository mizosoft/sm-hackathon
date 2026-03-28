/** Multiplayer web server entry point. */

import 'dotenv/config';
import path from 'node:path';
import os from 'node:os';
import express from 'express';
import { createServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { GameRoom } from './gameRoom.js';
import type { GameContext } from '../core/gameContext.js';
import { loadEnv } from '../infra/env.js';
import { createConsoleLogger } from '../infra/logger.js';
import { createDefaultRandom } from '../infra/random.js';
import { createFallbackClueGenerator, createFallbackGhostStoryGenerator, createFallbackTaskGenerator } from '../ai/providers/fallbackProvider.js';
import { createGeminiClueGenerator, createGeminiGhostStoryGenerator, createGeminiTaskGenerator } from '../ai/providers/geminiProvider.js';
import { createOpenAIClueGenerator, createOpenAIGhostStoryGenerator, createOpenAITaskGenerator } from '../ai/providers/openaiProvider.js';

const PORT = parseInt(process.env['PORT'] ?? '3000', 10);

function buildContext(): GameContext {
  const env = loadEnv();
  const logger = createConsoleLogger();
  const rng = createDefaultRandom();

  if (env.aiProvider === 'gemini' && env.geminiApiKey) {
    logger.info(`AI: Gemini (${env.geminiModel})`);
    return { clueGenerator: createGeminiClueGenerator(env.geminiApiKey, env.geminiModel), ghostStoryGenerator: createGeminiGhostStoryGenerator(env.geminiApiKey, env.geminiModel), taskGenerator: createGeminiTaskGenerator(env.geminiApiKey, env.geminiModel), logger, rng };
  }
  if (env.aiProvider === 'openai' && env.openaiApiKey) {
    logger.info(`AI: OpenAI (${env.openaiModel})`);
    return { clueGenerator: createOpenAIClueGenerator(env.openaiApiKey, env.openaiModel), ghostStoryGenerator: createOpenAIGhostStoryGenerator(env.openaiApiKey, env.openaiModel), taskGenerator: createOpenAITaskGenerator(env.openaiApiKey, env.openaiModel), logger, rng };
  }
  logger.info('AI: local fallback templates');
  return { clueGenerator: createFallbackClueGenerator(rng.next.bind(rng)), ghostStoryGenerator: createFallbackGhostStoryGenerator(), taskGenerator: createFallbackTaskGenerator(rng.next.bind(rng)), logger, rng };
}

function getLanIP(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

// ── Room code generation ─────────────────────────────────

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ── Setup ────────────────────────────────────────────────

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, { cors: { origin: '*' } });

app.use(express.static(path.join(process.cwd(), 'public')));

const ctx = buildContext();
const rooms = new Map<string, GameRoom>();

function broadcastRoomList(): void {
  const list = [...rooms.values()].map(r => r.info);
  io.emit('rooms-list', list);
}

function createRoom(): GameRoom {
  let code: string;
  do { code = generateCode(); } while (rooms.has(code));

  const room = new GameRoom(io, code, ctx, () => {
    rooms.delete(code);
    ctx.logger.info(`Room ${code} removed (empty)`);
    broadcastRoomList();
  });
  rooms.set(code, room);
  ctx.logger.info(`Room ${code} created`);
  broadcastRoomList();
  return room;
}

io.on('connection', (socket) => {
  // Send current room list on connect
  socket.emit('rooms-list', [...rooms.values()].map(r => r.info));

  socket.on('create-room', (data: { name: string }) => {
    const room = createRoom();
    room.addSocket(socket, data.name);
    broadcastRoomList();
  });

  socket.on('join-room', (data: { code: string; name: string }) => {
    const code = data.code.toUpperCase().trim();
    const room = rooms.get(code);
    if (!room) { socket.emit('error-msg', `Room ${code} not found.`); return; }
    if (!room.isJoinable) { socket.emit('error-msg', 'Room is not joinable (game in progress or full).'); return; }
    room.addSocket(socket, data.name);
    broadcastRoomList();
  });

  socket.on('list-rooms', () => {
    socket.emit('rooms-list', [...rooms.values()].map(r => r.info));
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const lanIP = getLanIP();
  console.log('');
  console.log('  🏚️  THE HAUNTED HOUSE — Multiplayer Server');
  console.log('  ──────────────────────────────────────────');
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  LAN:     http://${lanIP}:${PORT}`);
  console.log('');
  console.log('  Share the LAN address with other players!');
  console.log('');
});
