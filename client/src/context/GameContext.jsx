import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { PLAYER_COLORS } from '../utils/constants';

const GameContext = createContext(null);

const initialState = {
  roomCode: null,
  playerId: null,
  isHost: false,
  phase: 'home',
  players: [],
  messages: [],
  world: null,
  myRole: null,
  emergencyMeetingsLeft: 0,
  discussionActive: false,
  discussionEndsAt: null,
  skipVotes: null,
  revealedRoles: {},
  playerColors: {},
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_ROOM':
      return { ...state, ...action.payload };

    case 'SET_PLAYERS': {
      const players = action.payload;
      const colors = { ...state.playerColors };
      let idx = Object.keys(colors).length;
      for (const p of players) {
        if (!colors[p.id]) {
          colors[p.id] = PLAYER_COLORS[idx % PLAYER_COLORS.length];
          idx++;
        }
      }
      return { ...state, players, playerColors: colors };
    }

    case 'ADD_MESSAGE': {
      // If a message with this ID already exists, replace it in-place
      // This is used for typing indicators → real content transitions
      const existingIdx = state.messages.findIndex(m => m.id === action.payload.id);
      if (existingIdx !== -1) {
        const updated = [...state.messages];
        updated[existingIdx] = action.payload;
        return { ...state, messages: updated };
      }
      return { ...state, messages: [...state.messages, action.payload] };
    }

    case 'RESOLVE_CHOICES':
      // Mark all unresolved choice messages as resolved (called when meeting starts)
      return {
        ...state,
        messages: state.messages.map(m =>
          m.type === 'choice' && !m._resolved ? { ...m, _resolved: true } : m
        ),
      };

    case 'REPLACE_LAST_CHOICE': {
      const msgs = [...state.messages];
      const idx = msgs.map(m => m.type).lastIndexOf('choice');
      if (idx !== -1) msgs[idx] = { ...msgs[idx], _resolved: true };
      return { ...state, messages: msgs };
    }

    case 'UPDATE_PLAYER_STATUS':
      return {
        ...state,
        players: state.players.map(p =>
          p.id === action.payload.playerId ? { ...p, status: action.payload.status } : p
        ),
      };

    case 'REVEAL_ROLE':
      return {
        ...state,
        revealedRoles: { ...state.revealedRoles, [action.payload.playerId]: action.payload.role },
      };

    case 'SET_DISCUSSION':
      return {
        ...state,
        discussionActive: action.payload.active,
        discussionEndsAt: action.payload.endsAt || null,
        skipVotes: action.payload.active ? state.skipVotes : null,
      };

    case 'SET_SKIP_VOTES':
      return { ...state, skipVotes: action.payload };

    case 'SET_PHASE':
      return { ...state, phase: action.payload };

    case 'SET_ROLE':
      return {
        ...state,
        myRole: action.payload.role,
        emergencyMeetingsLeft: action.payload.emergencyMeetings,
      };

    case 'UPDATE_EMERGENCY_MEETINGS':
      return { ...state, emergencyMeetingsLeft: action.payload };

    case 'SET_WORLD':
      return { ...state, world: action.payload };

    case 'RESET':
      return { ...initialState };

    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { socket, connected } = useSocket();

  const addMessage = useCallback((msg) => {
    dispatch({ type: 'ADD_MESSAGE', payload: msg });
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handlers = {
      room_created: ({ roomCode, playerId, isHost }) => {
        dispatch({ type: 'SET_ROOM', payload: { roomCode, playerId, isHost, phase: 'lobby' } });
      },

      room_joined: ({ roomCode, playerId, isHost, players }) => {
        dispatch({ type: 'SET_ROOM', payload: { roomCode, playerId, isHost, phase: 'lobby' } });
        dispatch({ type: 'SET_PLAYERS', payload: players });
      },

      player_joined: ({ players }) => {
        dispatch({ type: 'SET_PLAYERS', payload: players });
      },

      player_left: ({ players }) => {
        dispatch({ type: 'SET_PLAYERS', payload: players });
      },

      join_error: ({ message }) => {
        dispatch({ type: 'SET_ROOM', payload: { phase: 'home' } });
        addMessage({
          id: `err-${Date.now()}`,
          type: 'private_info',
          content: `Error: ${message}`,
          visibility: 'private',
          ts: Date.now(),
        });
      },

      game_starting: ({ message }) => {
        dispatch({ type: 'SET_PHASE', payload: 'starting' });
        addMessage({
          id: `starting-${Date.now()}`,
          type: 'narrator',
          content: message,
          sender: 'narrator',
          visibility: 'public',
          ts: Date.now(),
        });
      },

      world_generated: ({ settingName, settingDescription }) => {
        dispatch({ type: 'SET_WORLD', payload: {
          setting_name: settingName,
          setting_description: settingDescription,
        }});
      },

      game_started: ({ players, world }) => {
        dispatch({ type: 'SET_PLAYERS', payload: players });
        dispatch({ type: 'SET_WORLD', payload: world });
        dispatch({ type: 'SET_PHASE', payload: 'playing' });
      },

      role_assigned: ({ role, emergencyMeetings, playerId }) => {
        dispatch({ type: 'SET_ROLE', payload: { role, emergencyMeetings } });
        if (playerId) dispatch({ type: 'SET_ROOM', payload: { playerId } });
      },

      emergency_meetings_update: ({ remaining }) => {
        dispatch({ type: 'UPDATE_EMERGENCY_MEETINGS', payload: remaining });
      },

      // ── Core event: all game updates arrive here ──────────────────────────
      chat_msg: (msg) => {
        // meeting_banner = meeting starting: resolve pending choices, set meeting phase
        if (msg.type === 'meeting_banner') {
          dispatch({ type: 'RESOLVE_CHOICES' });
          dispatch({ type: 'SET_PHASE', payload: 'meeting' });
        }
        addMessage(msg);
      },

      // ── Phase change from server (e.g. new round starting after meeting) ──
      phase_change: ({ phase }) => {
        dispatch({ type: 'SET_PHASE', payload: phase });
        // Also end discussion if switching back to playing
        if (phase === 'playing') {
          dispatch({ type: 'SET_DISCUSSION', payload: { active: false, endsAt: null } });
        }
      },

      discussion_start: ({ duration }) => {
        dispatch({ type: 'SET_PHASE', payload: 'meeting' });
        dispatch({
          type: 'SET_DISCUSSION',
          payload: { active: true, endsAt: Date.now() + duration * 1000 },
        });
      },

      discussion_end: () => {
        dispatch({ type: 'SET_DISCUSSION', payload: { active: false, endsAt: null } });
      },

      skip_votes_update: ({ count, needed }) => {
        dispatch({ type: 'SET_SKIP_VOTES', payload: { count, needed } });
      },

      player_status_update: ({ playerId, status }) => {
        dispatch({ type: 'UPDATE_PLAYER_STATUS', payload: { playerId, status } });
      },

      role_revealed: ({ playerId, role }) => {
        dispatch({ type: 'REVEAL_ROLE', payload: { playerId, role } });
      },

      game_ended: ({ winner, roles }) => {
        dispatch({ type: 'SET_PHASE', payload: 'ended' });
        for (const r of roles) {
          dispatch({ type: 'REVEAL_ROLE', payload: { playerId: r.id, role: r.role } });
        }
      },

      reconnected: ({ roomCode, playerId, isHost, phase, players, world, role, emergencyMeetings }) => {
        dispatch({ type: 'SET_ROOM', payload: { roomCode, playerId, isHost, phase } });
        dispatch({ type: 'SET_PLAYERS', payload: players });
        if (world) dispatch({ type: 'SET_WORLD', payload: world });
        if (role) dispatch({ type: 'SET_ROLE', payload: { role, emergencyMeetings } });
        addMessage({
          id: `reconnect-${Date.now()}`,
          type: 'private_info',
          content: 'Reconnected to the game.',
          visibility: 'private',
          ts: Date.now(),
        });
      },

      player_disconnected: ({ name }) => {
        addMessage({
          id: `dc-${Date.now()}`,
          type: 'private_info',
          content: `${name} disconnected.`,
          visibility: 'public',
          ts: Date.now(),
        });
      },

      player_reconnected: ({ name }) => {
        addMessage({
          id: `rc-${Date.now()}`,
          type: 'private_info',
          content: `${name} reconnected.`,
          visibility: 'public',
          ts: Date.now(),
        });
      },
    };

    for (const [event, handler] of Object.entries(handlers)) {
      socket.on(event, handler);
    }
    return () => {
      for (const [event, handler] of Object.entries(handlers)) {
        socket.off(event, handler);
      }
    };
  }, [socket, addMessage]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const createRoom = useCallback((playerName) => {
    socket?.emit('create_room', { playerName });
  }, [socket]);

  const joinRoom = useCallback((roomCode, playerName) => {
    socket?.emit('join_room', { roomCode, playerName });
  }, [socket]);

  const addAIPlayer = useCallback(() => {
    socket?.emit('add_ai_player');
  }, [socket]);

  const removeAIPlayer = useCallback((aiId) => {
    socket?.emit('remove_ai_player', { aiId });
  }, [socket]);

  const startGame = useCallback(() => {
    socket?.emit('start_game');
  }, [socket]);

  const submitChoice = useCallback((choiceId) => {
    if (!socket) return;
    socket.emit('submit_choice', { choiceId });
    dispatch({ type: 'REPLACE_LAST_CHOICE' });
  }, [socket]);

  const callEmergencyMeeting = useCallback(() => {
    socket?.emit('emergency_meeting');
  }, [socket]);

  const sendChatMessage = useCallback((message) => {
    if (!socket || !state.discussionActive) return;
    socket.emit('chat_message', { message });
  }, [socket, state.discussionActive]);

  const skipDiscussion = useCallback(() => {
    socket?.emit('skip_discussion');
  }, [socket]);

  const submitVote = useCallback((targetId) => {
    socket?.emit('submit_vote', { targetId });
  }, [socket]);

  const value = {
    ...state,
    connected,
    createRoom,
    joinRoom,
    addAIPlayer,
    removeAIPlayer,
    startGame,
    submitChoice,
    callEmergencyMeeting,
    sendChatMessage,
    skipDiscussion,
    submitVote,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
