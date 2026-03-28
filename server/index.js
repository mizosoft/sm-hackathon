import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import RoomManager from './roomManager.js';
import GameEngine from './gameEngine.js';
import AIService from './aiService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(express.json());

// Serve static client build in production
const clientDist = join(__dirname, '../client/dist');
app.use(express.static(clientDist));

const roomManager = new RoomManager();
const aiService = new AIService();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, rooms: roomManager.rooms.size });
});

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  // ─── LOBBY ─────────────────────────────────────────────────────────────────

  socket.on('create_room', ({ playerName }) => {
    if (!playerName?.trim()) return socket.emit('join_error', { message: 'Name required' });

    const { room, player } = roomManager.createRoom(socket.id, playerName.trim());
    socket.join(room.code);

    socket.emit('room_created', {
      roomCode: room.code,
      playerId: player.id,
      isHost: true,
    });

    console.log(`[room] ${room.code} created by ${player.name}`);

    // Start world generation in background immediately so lobby shows a preview
    room._worldPromise = aiService.generateWorld(4)
      .then(world => {
        if (room.phase !== 'lobby') return; // game started before gen finished
        room.world = world;
        io.to(room.code).emit('world_generated', {
          settingName: world.setting_name,
          settingDescription: world.setting_description,
        });
      })
      .catch(err => {
        console.error(`[world_gen] Pre-gen failed for ${room.code}:`, err.message);
      });
  });

  socket.on('join_room', ({ roomCode, playerName }) => {
    if (!playerName?.trim() || !roomCode?.trim()) {
      return socket.emit('join_error', { message: 'Name and room code required' });
    }

    // Check if this is a reconnect
    const room = roomManager.getRoom(roomCode.trim());
    if (room && room.phase !== 'lobby') {
      const result = roomManager.reconnectPlayer(roomCode.trim(), socket.id, playerName.trim());
      if (result.error) return socket.emit('join_error', { message: result.error });

      socket.join(room.code);
      const { player } = result;

      socket.emit('reconnected', {
        roomCode: room.code,
        playerId: player.id,
        isHost: room.hostId === player.id,
        phase: room.phase,
        players: room.players.map(p => ({
          id: p.id, name: p.name, isAI: p.isAI, status: p.status,
        })),
        world: room.world,
        role: player.role,
        emergencyMeetings: player.emergencyMeetingsLeft,
      });

      // Re-send role
      socket.emit('role_assigned', {
        role: player.role,
        emergencyMeetings: player.emergencyMeetingsLeft,
        playerId: player.id,
      });

      io.to(room.code).emit('player_reconnected', {
        playerId: player.id,
        name: player.name,
      });
      return;
    }

    const result = roomManager.joinRoom(roomCode.trim(), socket.id, playerName.trim());
    if (result.error) return socket.emit('join_error', { message: result.error });

    const { player } = result;
    socket.join(result.room.code);

    socket.emit('room_joined', {
      roomCode: result.room.code,
      playerId: player.id,
      isHost: false,
      players: result.room.players.map(p => ({
        id: p.id, name: p.name, isAI: p.isAI,
      })),
    });

    // Send world preview if already generated
    if (result.room.world) {
      socket.emit('world_generated', {
        settingName: result.room.world.setting_name,
        settingDescription: result.room.world.setting_description,
      });
    }

    io.to(result.room.code).emit('player_joined', {
      players: result.room.players.map(p => ({
        id: p.id, name: p.name, isAI: p.isAI,
      })),
    });

    console.log(`[room] ${player.name} joined ${result.room.code}`);
  });

  socket.on('add_ai_player', () => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (!room || room.phase !== 'lobby') return;

    const player = roomManager.getPlayerBySocket(socket.id);
    if (!player || room.hostId !== player.id) return;

    const aiPlayer = roomManager.addAIPlayer(room.code);
    if (!aiPlayer) return socket.emit('join_error', { message: 'Cannot add more AI players' });

    io.to(room.code).emit('player_joined', {
      players: room.players.map(p => ({ id: p.id, name: p.name, isAI: p.isAI })),
    });
  });

  socket.on('remove_ai_player', ({ aiId }) => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (!room || room.phase !== 'lobby') return;

    const player = roomManager.getPlayerBySocket(socket.id);
    if (!player || room.hostId !== player.id) return;

    const removed = roomManager.removeAIPlayer(room.code, aiId);
    if (removed) {
      io.to(room.code).emit('player_left', {
        players: room.players.map(p => ({ id: p.id, name: p.name, isAI: p.isAI })),
      });
    }
  });

  socket.on('start_game', async () => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (!room || room.phase !== 'lobby') return;

    const player = roomManager.getPlayerBySocket(socket.id);
    if (!player || room.hostId !== player.id) return;

    if (room.players.length < 4) {
      return socket.emit('join_error', { message: 'Need at least 4 players to start' });
    }

    room.phase = 'starting';

    try {
      if (!room.world) {
        // World not ready yet — wait for background generation or generate fresh
        io.to(room.code).emit('game_starting', { message: 'Generating world...' });
        if (room._worldPromise) {
          await room._worldPromise;
        }
        if (!room.world) {
          // Background gen failed — try once more with actual player count
          const world = await aiService.generateWorld(room.players.length);
          room.world = world;
          io.to(room.code).emit('world_generated', {
            settingName: world.setting_name,
            settingDescription: world.setting_description,
          });
        }
      } else {
        // World already ready from pre-generation
        io.to(room.code).emit('game_starting', { message: 'Starting game...' });
      }

      // Brief pause before engine starts
      await new Promise(r => setTimeout(r, 1200));

      // Start the game engine
      const engine = new GameEngine(room, io);
      room._engine = engine;

      engine.start().catch(err => {
        console.error(`[engine] Room ${room.code} crashed:`, err);
        io.to(room.code).emit('chat_msg', {
          id: 'error',
          type: 'narrator',
          content: 'The story has come to an abrupt end. Something went wrong.',
          sender: 'narrator',
          visibility: 'public',
          ts: Date.now(),
        });
        room.phase = 'ended';
      });

    } catch (err) {
      console.error('[start_game] World generation failed:', err.message);
      room.phase = 'lobby';
      socket.emit('join_error', { message: 'World generation failed. Please try again.' });
    }
  });

  // ─── GAMEPLAY ──────────────────────────────────────────────────────────────

  socket.on('submit_choice', ({ choiceId }) => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (!room?._engine) return;

    const player = roomManager.getPlayerBySocket(socket.id);
    if (!player) return;

    room._engine.handleSubmitChoice(player.id, choiceId);
  });

  socket.on('emergency_meeting', () => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (!room?._engine) return;

    const player = roomManager.getPlayerBySocket(socket.id);
    if (!player) return;

    room._engine.handleEmergencyMeeting(player.id);
  });

  socket.on('chat_message', ({ message }) => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (!room?._engine) return;

    const player = roomManager.getPlayerBySocket(socket.id);
    if (!player) return;

    room._engine.handleChatMessage(player.id, message);
  });

  socket.on('skip_discussion', () => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (!room?._engine) return;

    const player = roomManager.getPlayerBySocket(socket.id);
    if (!player) return;

    room._engine.handleSkipDiscussion(player.id);
  });

  socket.on('submit_vote', ({ targetId }) => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (!room?._engine) return;

    const player = roomManager.getPlayerBySocket(socket.id);
    if (!player) return;

    room._engine.handleVote(player.id, targetId);
  });

  // ─── DISCONNECT ────────────────────────────────────────────────────────────

  socket.on('disconnect', () => {
    const result = roomManager.leaveRoom(socket.id);
    if (!result?.room) return;

    const { room, player } = result;
    console.log(`[disconnect] ${player?.name} left ${room.code}`);

    if (room.phase === 'lobby') {
      io.to(room.code).emit('player_left', {
        players: room.players.map(p => ({ id: p.id, name: p.name, isAI: p.isAI })),
        newHostId: room.hostId,
      });
    } else {
      io.to(room.code).emit('player_disconnected', {
        playerId: player?.id,
        name: player?.name,
      });
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`🎭 Mystery game server running on port ${PORT}`);
});
