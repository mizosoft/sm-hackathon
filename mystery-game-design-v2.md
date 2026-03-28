# SHADOWS IN THE HOUSE — Game Design & Technical Blueprint
### React Native + Gemini Live API (Voice Narration) + Antigravity (Development)

---

## 1. The Game in One Paragraph

**Shadows in the House** is a multiplayer narrative mystery game for 3–6 players, built as a **React Native mobile app**. An AI narrator powered by **Gemini Live API** runs the entire experience with **real-time voice narration** — it speaks the story aloud, reacts to what players do, and adapts its tone to rising tension. One player is secretly the **Killer**. One is the **Investigator**. The rest are **Innocents**. The game plays out in rounds: a spoken story event unfolds, players choose where to go and what to do, the consequences are narrated live, and then everyone discusses over voice chat who they trust. The Killer wins by eliminating enough players. Everyone else wins by voting out the Killer. Think of it as *Among Us meets a voice-acted thriller*, narrated in real time by AI.

The game is **built using Google Antigravity** — the agentic IDE handles scaffolding, multi-file builds, and iterative development with Gemini-powered coding agents.

---

## 2. What Each Technology Does

| Technology | Role in This Project |
|-----------|---------------------|
| **React Native** | Cross-platform mobile app (iOS + Android). All UI: lobby, game screens, room map, choices, chat, voting. |
| **Gemini Live API** | **Core gameplay engine.** Real-time bidirectional WebSocket session with `gemini-3.1-flash-live-preview`. Streams voice narration to all players. Receives game state updates via function calling. Maintains session memory across rounds. |
| **Gemini API (standard)** | **Structured data generation.** Used for round resolution, choice generation, and clue distribution — anything that needs strict JSON output. Uses `gemini-2.5-flash` with `responseSchema`. |
| **Google Antigravity** | **Development platform.** Used to build the game, not embedded in it. Antigravity's agentic IDE handles scaffolding the React Native app, writing server code, debugging, and iterating on the codebase with autonomous AI agents. |
| **Node.js + Socket.IO** | Game server. Manages lobbies, relays game state, enforces rules, and brokers between players and the Gemini APIs. |
| **Firebase** | Authentication (anonymous/guest), Firestore for game history, Cloud Functions for ephemeral token generation for Gemini Live API. |

---

## 3. Architecture: Two-API Design

This game uses **two separate Gemini APIs** for different purposes. This is intentional — the Live API excels at voice and atmosphere but is unreliable for structured JSON output. The standard API is perfect for structured data but can't stream audio.

### The Split

| Concern | API | Why |
|---------|-----|-----|
| Voice narration (story events, dramatic reveals, death announcements) | **Gemini Live API** (`gemini-3.1-flash-live-preview`) | Real-time audio streaming, affective dialog, session memory, human-like delivery |
| Choice generation (3 choices per player, private clues, round resolution) | **Gemini Standard API** (`gemini-2.5-flash`) | Structured JSON output with `responseSchema`, deterministic, parseable |

### Why Not Just Use Live API For Everything?

A developer building a similar voice RPG (GM-Genie) discovered that **function calling inside Gemini Live API caused a 70% WebSocket crash rate** in voice mode. The solution: move all structured logic to the server side and use the Live API purely for narration. This is the architecture we adopt:

- **Server-side logic** handles all mechanical decisions (kill validation, position tracking, clue distribution, vote counting)
- **Standard Gemini API** generates structured round data (choices, clues, resolution outcomes)
- **Gemini Live API** receives a pre-composed narrative script and **speaks it aloud** with dramatic delivery
- The Live API session has the game's backstory and current state in its system instructions, so its narration stays coherent and atmospheric

---

## 4. Roles

| Role | Count | Goal | Special Ability |
|------|-------|------|-----------------|
| **Killer** | 1 | Eliminate players until parity (1v1) | Can choose to "attack" when alone with one other player. Gets a kill option among their 3 choices when conditions are met. |
| **Investigator** | 1 | Identify and expose the Killer | Once per round, can "inspect" a player. Gets a vague read: `suspicious` or `seems clean`. Can call an emergency meeting (limited to 2 per game). Identity is secret. |
| **Innocent** | 1–4 | Survive. Deduce the Killer. Vote them out. | No powers. Strength comes from observation, memory, and social deduction. |

Roles are assigned secretly at game start. Nobody knows anyone else's role.

---

## 5. The Map

The game takes place in a single location (e.g., an old mansion) with **5 rooms**:

- **Foyer** — the central hub, well-lit
- **Kitchen** — connected to Foyer and Basement
- **Study** — connected to Foyer, has documents and clues
- **Basement** — dark, isolated, connected to Kitchen
- **Garden** — outside, connected to Foyer

Rooms matter because **kills can only happen when exactly 2 players share a room** and certain conditions are met (darkness, isolation). The AI uses room layout to generate movement-based story events.

---

## 6. Round Structure

Each game lasts **5–8 rounds**. Every round follows this sequence:

### Phase 1 → AI Story Event (VOICE — Gemini Live API)
The narrator speaks a dramatic event aloud to all players simultaneously. The Live API's affective dialog adapts tone to the current tension level — calm and atmospheric early, urgent and tense later.

> *[Spoken by Gemini, eerie tone]:* "The lights in the Kitchen flicker and die. A cold draft sweeps through the Foyer. Something scrapes against the Basement door."

Events include: power outages, locked doors, strange noises, weather changes, discovered objects. They create **asymmetric information** — different players in different rooms experience different things.

### Phase 2 → Player Choices (TEXT — Gemini Standard API)
Each player receives **exactly 3 text choices** on their screen, generated by the standard API with structured JSON output. Choices are submitted privately by tapping.

Example for an Innocent in the Study:
1. Go to the Kitchen to check on the power
2. Stay and search the desk drawers for clues
3. Call out to Player B and ask them to come here

Example for the Killer alone with one player:
1. Attack Player C *(kill attempt)*
2. Pretend to search the room together
3. Leave quickly toward the Foyer

### Phase 3 → Resolution (SERVER + Standard API)
The server processes all choices simultaneously. Kill conditions are validated server-side (never by the AI). The standard API generates narrative text for outcomes.

### Phase 4 → Narration (VOICE — Gemini Live API)
The narrator speaks the results. Each player hears a shared public narration, plus private audio whispered through their earbuds.

> *[Public, all players]:* "A scream echoes from the Kitchen. When players rush in, they find Player C on the floor, unmoving."
> *[Private, whispered to Player A only]:* "You were in the Foyer. You saw someone rush past you toward the Kitchen moments before the scream."
> *[Private, to Killer only]:* "You slipped away unnoticed. Your hands are steady."

### Phase 5 → Discussion (VOICE CHAT — Player-to-Player)
A timed voice chat opens (90–120 seconds). Players discuss freely using the app's built-in voice channel. The AI **transcribes** what's said (via the Live API's transcription feature) and logs key statements for future context.

### Phase 6 → Vote (UI — React Native)
Players can vote to eliminate a suspect via the app UI. Majority rules. If the Killer is voted out → Innocents win. If an innocent is eliminated → game continues.

---

## 7. Win Conditions

| Side | Wins When |
|------|-----------|
| **Innocents + Investigator** | The Killer is correctly voted out |
| **Killer** | Kills enough that only 1 other player remains (parity) |

---

## 8. Player Traits

At game start, each player picks **2 traits** from a small pool. Traits influence which choices the AI generates.

| Trait | Effect on AI Choices |
|-------|---------------------|
| Curious | More exploration options, higher chance of finding clues |
| Cautious | Options to stay hidden, avoid danger |
| Social | Options to interact with other players, form groups |
| Analytical | Clues are more detailed, logical deduction options |
| Impulsive | Riskier options that may yield big rewards or big trouble |
| Observant | Passive awareness clues (who moved where) |

Traits shape **narrative flavor** and **choice variety**, not mechanical advantage.

---

## 9. The AI Prompts

### 9A. Gemini Live API — Narrator System Instructions

Set once at session creation. Updated between rounds by injecting new game state via `send_client_content`.

```
You are the narrator of "Shadows in the House," a multiplayer murder mystery game.

YOUR VOICE AND STYLE:
- You are a dramatic, atmospheric storyteller in the style of a gothic horror narrator
- Adapt your tone to the tension level: calm and mysterious early, urgent and sinister later
- Use pauses for effect. Whisper when revealing private information.
- Never break character. Never reference game mechanics directly.
- When announcing deaths, be chilling but not gratuitous.
- When narrating private info, speak as if confiding a secret.

WHAT YOU KNOW:
- The full game state will be provided to you before each narration
- You know who the killer is but you NEVER reveal it
- You know what happened each round and must narrate it dramatically

WHAT YOU DO:
- When given a narration script, perform it with appropriate voice and emotion
- For public narrations: speak to all players as a group
- For private narrations: speak directly to the individual, intimately
- React to the tension level: higher tension = faster pace, more dread

WHAT YOU NEVER DO:
- Never reveal the killer's identity
- Never make mechanical game decisions
- Never generate choices (those come from the structured API)
- Never improvise plot points beyond the script you're given
```

### 9B. Standard API — Choice Generation Prompt

Sent each round with full game state. Must return strict JSON.

```
SYSTEM:
You are the game engine for "Shadows in the House," a multiplayer murder mystery.
Generate personalized choices and clues for each player based on game state.

RULES:
- Generate EXACTLY 3 choices per living player
- Choices must be logical given position, traits, and context
- The Killer gets an "attack" option ONLY when alone with exactly 1 other player
- The Investigator gets an "inspect" option when they haven't used it this round
- Generate clues that are partial — never give away the full truth
- Maintain consistency with the story log

GAME STATE:
{
  "round": <number>,
  "tension_level": <1-10>,
  "rooms": ["Foyer", "Kitchen", "Study", "Basement", "Garden"],
  "players": [
    {
      "id": "<player_id>",
      "name": "<display_name>",
      "role": "<killer|investigator|innocent>",
      "traits": ["<trait1>", "<trait2>"],
      "status": "<alive|dead>",
      "location": "<current_room>",
      "knowledge": ["<clue1>", "<clue2>"],
      "actions_history": ["<round1_choice>", "<round2_choice>"]
    }
  ],
  "story_log": ["<round1_summary>", "<round2_summary>"],
  "chat_highlights": ["<notable_statement1>"],
  "deaths": [{ "victim": "<id>", "round": <n>, "location": "<room>" }],
  "votes_history": [{ "round": <n>, "target": "<id>", "result": "<eliminated|survived>" }]
}

RESPOND IN THIS EXACT JSON FORMAT:
{
  "story_event_script": "<narration text for the Live API to speak aloud>",
  "environmental_change": {
    "affected_rooms": ["<room>"],
    "effect": "<description>"
  },
  "players": {
    "<player_id>": {
      "choices": [
        { "id": "c1", "text": "<choice text>", "type": "<move|interact|attack|inspect|meeting>" },
        { "id": "c2", "text": "...", "type": "..." },
        { "id": "c3", "text": "...", "type": "..." }
      ],
      "private_info_script": "<text for Live API to whisper to this player>",
      "clue": "<new clue text or null>"
    }
  },
  "tension_level": <1-10>
}
```

### 9C. Standard API — Round Resolution Prompt

```
SYSTEM:
Resolve a round of "Shadows in the House."

PLAYER CHOICES THIS ROUND:
{ "<player_id>": { "chosen": "c2", "type": "move", "detail": "Go to Kitchen" }, ... }

RULES:
- A kill succeeds ONLY if: Killer chose attack AND is alone with exactly 1 player
  after all movement resolves
- Failed kill attempts happen silently
- Investigation returns "suspicious" for Killer, "seems clean" otherwise
- Bodies are discovered only when someone enters the room

RESPOND IN JSON:
{
  "deaths": [{ "victim": "<id>", "location": "<room>" }],
  "new_positions": { "<player_id>": "<room>" },
  "clues_distributed": { "<player_id>": "<clue>" },
  "investigation_result": { "target": "<id>", "reading": "<suspicious|seems clean>" },
  "public_narration_script": "<text for Live API to narrate to everyone>",
  "private_narration_scripts": { "<player_id>": "<text for Live API to whisper>" }
}
```

---

## 10. System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        PLAYER DEVICES                                │
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │ React Native│  │ React Native│  │ React Native│   (3-6 players)  │
│  │   App       │  │   App       │  │   App       │                  │
│  │             │  │             │  │             │                  │
│  │ • Room map  │  │ • Choices   │  │ • Chat      │                  │
│  │ • Choices   │  │ • Story     │  │ • Voting    │                  │
│  │ • Audio out │  │ • Audio out │  │ • Audio out │                  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                  │
│         │                │                │                          │
└─────────┼────────────────┼────────────────┼──────────────────────────┘
          │  Socket.IO     │                │
          └────────────────┼────────────────┘
                           │
                           ▼
            ┌──────────────────────────┐
            │      GAME SERVER         │
            │      (Node.js)           │
            │                          │
            │  ┌────────────────────┐  │
            │  │   Room Manager     │  │  ← Lobby, join codes, player tracking
            │  ├────────────────────┤  │
            │  │   Game Engine      │  │  ← Round loop, kill validation,
            │  │                    │  │    vote counting, win conditions
            │  ├────────────────────┤  │
            │  │   AI Orchestrator  │──┼──────┐
            │  │                    │  │      │
            │  └────────────────────┘  │      │
            │                          │      │
            │  ┌────────────────────┐  │      │
            │  │   Voice Relay      │──┼──────┼──────┐
            │  │   (Audio Router)   │  │      │      │
            │  └────────────────────┘  │      │      │
            │                          │      │      │
            │  ┌────────────────────┐  │      │      │
            │  │   Redis            │  │      │      │
            │  │   (Game State)     │  │      │      │
            │  └────────────────────┘  │      │      │
            └──────────────────────────┘      │      │
                                              │      │
                    ┌─────────────────────────┘      │
                    │                                │
                    ▼                                ▼
     ┌──────────────────────┐        ┌──────────────────────────┐
     │  Gemini Standard API │        │    Gemini Live API        │
     │  (gemini-2.5-flash)  │        │ (gemini-3.1-flash-live)  │
     │                      │        │                          │
     │  • JSON choices      │        │  • Voice narration       │
     │  • Clue generation   │        │  • Affective dialog      │
     │  • Round resolution  │        │  • Tone adaptation       │
     │  • responseSchema    │        │  • Session memory        │
     │    enforced output   │        │  • Audio transcription   │
     └──────────────────────┘        └──────────────────────────┘
```

---

## 11. Gemini Live API — Voice Integration Details

### Session Lifecycle

1. **Game start** → Server opens a Live API WebSocket session with narrator system instructions
2. **Each round** → Server sends narration script as text via `send_client_content`
3. **Live API responds** with streaming audio (24kHz PCM)
4. **Server relays** audio to players via Socket.IO binary events
5. **Between rounds** → Server updates the session context with new game state
6. **Game end** → Session closes

### Voice Configuration

```javascript
const config = {
  responseModalities: ["AUDIO"],
  speechConfig: {
    voiceConfig: {
      prebuiltVoiceConfig: {
        voiceName: "FENRIR"  // Deep, dramatic voice for narrator
      }
    }
  },
  systemInstruction: {
    parts: [{ text: NARRATOR_SYSTEM_PROMPT }]
  }
};

const session = await ai.live.connect({
  model: "gemini-3.1-flash-live-preview",
  config: config,
  callbacks: {
    onAudio: (audioData) => {
      // Stream audio chunks to all connected players via Socket.IO
      io.to(roomId).emit("narrator_audio", audioData);
    },
    onMessage: (message) => {
      // Log transcriptions for chat analysis
      if (message.serverContent?.modelTurn?.parts) {
        logTranscription(message);
      }
    }
  }
});
```

### Sending Narration to the Live API

```javascript
// After generating round data via standard API, 
// send the narration script to Live API for voice performance
async function narrateRound(session, roundData) {
  // Public narration — broadcast to all
  await session.sendClientContent({
    turns: [{
      role: "user",
      parts: [{ text: `[NARRATE TO ALL PLAYERS]: ${roundData.public_narration_script}` }]
    }]
  });

  // Wait for public narration to complete, then send private whispers
  for (const [playerId, data] of Object.entries(roundData.private_narration_scripts)) {
    await session.sendClientContent({
      turns: [{
        role: "user",
        parts: [{ text: `[WHISPER PRIVATELY TO ${playerId}]: ${data}` }]
      }]
    });
    // Server routes this audio only to the specific player's socket
  }
}
```

### Critical Lessons from GM-Genie (Avoid These Pitfalls)

1. **Do NOT use function calling inside the Live API session.** It causes ~70% WebSocket crash rate. All structured logic goes through the standard API.
2. **Pre-compose narration scripts** on the server, then feed them to the Live API as text input. Don't ask the Live API to improvise story content.
3. **Batch audio on the server side.** Send 100ms audio batches (3200 bytes at 16kHz), not raw AudioWorklet chunks. Small fragments break the Voice Activity Detection.
4. **Keep Live API sessions under 10 minutes.** This is the default max. For longer games, use session resumption or create a new session between halves.
5. **Server-side transcription analysis** — monitor the Live API's text transcriptions to detect when narration is complete before proceeding to the next phase.

---

## 12. React Native App Structure

### Navigation Flow

```
App Launch
  └→ Home Screen
       ├→ Create Game → Lobby (host)
       └→ Join Game (enter code) → Lobby (guest)
            └→ Game Screen (after host starts)
                 ├→ Story Panel (audio playing + text captions)
                 ├→ Room Map (interactive)
                 ├→ Choice Cards (3 options, tap to select)
                 ├→ Discussion (voice chat + text)
                 ├→ Vote Panel
                 └→ Game Over (roles revealed)
```

### Key Components

```
src/
├── navigation/
│   └── AppNavigator.tsx
├── screens/
│   ├── HomeScreen.tsx           # Create / Join
│   ├── LobbyScreen.tsx          # Player list, traits, waiting
│   └── GameScreen.tsx           # Main game loop
├── components/
│   ├── StoryPanel.tsx           # Narration text + audio visualizer
│   ├── RoomMap.tsx              # Interactive 2D room layout
│   ├── ChoiceCards.tsx          # 3 swipeable choice cards
│   ├── PlayerList.tsx           # Player avatars + status (alive/dead)
│   ├── DiscussionChat.tsx       # Voice + text chat during discussion
│   ├── VotePanel.tsx            # Vote UI with player portraits
│   ├── PrivateClueDrawer.tsx    # Slide-up drawer showing your clues
│   └── AudioVisualizer.tsx      # Waveform when narrator is speaking
├── services/
│   ├── socketService.ts         # Socket.IO connection + event handlers
│   ├── audioService.ts          # Play narrator audio, manage voice chat
│   └── gameStateService.ts      # Local game state management
├── hooks/
│   ├── useSocket.ts             # Socket.IO React hook
│   ├── useGameState.ts          # Game state subscription
│   └── useAudio.ts              # Audio playback controls
├── types/
│   └── game.ts                  # TypeScript interfaces for game entities
└── utils/
    └── constants.ts             # Room names, trait definitions, etc.
```

### Audio Playback on Client

```typescript
// audioService.ts — handling narrator audio stream
import { Audio } from 'expo-av';

class NarratorAudioService {
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying = false;

  // Called when server sends narrator_audio via Socket.IO
  onAudioChunk(chunk: ArrayBuffer) {
    this.audioQueue.push(chunk);
    if (!this.isPlaying) this.playNext();
  }

  private async playNext() {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }
    this.isPlaying = true;
    const chunk = this.audioQueue.shift()!;
    // Convert PCM to playable format and queue
    await this.playPCMAudio(chunk);
    this.playNext();
  }

  private async playPCMAudio(pcmData: ArrayBuffer) {
    // Gemini Live API outputs 24kHz 16-bit mono PCM
    // Convert to WAV header + PCM body for expo-av playback
    const wavBuffer = this.wrapPCMInWAV(pcmData, 24000, 16, 1);
    const { sound } = await Audio.Sound.createAsync(
      { uri: this.bufferToDataUri(wavBuffer) }
    );
    await sound.playAsync();
  }
}
```

---

## 13. Lobby System

### Creating a Game
1. Player taps "Create Game" on HomeScreen
2. Server generates a **6-character room code** (e.g., `XK7M2P`)
3. Creator becomes host, enters LobbyScreen
4. Host shares code with friends (copy button, share sheet)

### Joining a Game
1. Player enters room code on HomeScreen
2. Server validates: room exists, game not started, not full
3. Player joins lobby, appears in player list for everyone

### Lobby Features
- Real-time player list (Socket.IO updates)
- Trait selection (pick 2 from list)
- Display name entry
- Host controls: Start game (requires 3–6 players)
- 5-second countdown before game begins

### Socket.IO Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `create_room` | Client → Server | `{ playerName }` |
| `room_created` | Server → Client | `{ roomCode }` |
| `join_room` | Client → Server | `{ roomCode, playerName }` |
| `player_joined` | Server → All | `{ players[] }` |
| `select_traits` | Client → Server | `{ traits: [t1, t2] }` |
| `start_game` | Host → Server | `{}` |
| `game_starting` | Server → All | `{ countdown: 5, roles: {private} }` |
| `round_start` | Server → All | `{ round, tensionLevel }` |
| `narrator_audio` | Server → All/Individual | `binary audio chunk` |
| `your_choices` | Server → Individual | `{ choices[], privateInfo }` |
| `submit_choice` | Client → Server | `{ choiceId }` |
| `round_result` | Server → All | `{ publicNarration }` |
| `your_result` | Server → Individual | `{ privateNarration, newClues[] }` |
| `discussion_start` | Server → All | `{ duration: 90 }` |
| `voice_audio` | Client ↔ Server | `binary audio (player voice chat)` |
| `chat_message` | Client → All | `{ sender, text }` |
| `vote_start` | Server → All | `{ candidates[] }` |
| `submit_vote` | Client → Server | `{ targetId }` |
| `vote_result` | Server → All | `{ eliminated, wasKiller }` |
| `game_over` | Server → All | `{ winner, allRoles[] }` |

---

## 14. Development with Antigravity

### What Antigravity Does for This Project

Antigravity is your **development environment**, not a runtime dependency. Use it to:

1. **Scaffold the project** — Tell the Antigravity agent: "Create a React Native app with Expo, Socket.IO client, and audio playback. Set up navigation with Home, Lobby, and Game screens." It generates the full folder structure.

2. **Build the server** — Dispatch an agent: "Build a Node.js server with Socket.IO that manages game rooms with 6-char codes, tracks player state, and handles round-based game flow." It creates `roomManager.js`, `gameEngine.js`, etc.

3. **Integrate Gemini APIs** — Dispatch another agent: "Add a service that calls Gemini 2.5 Flash with structured JSON output for choice generation, using this schema: [paste schema]. Also add a Gemini Live API WebSocket session for audio narration."

4. **Iterate and debug** — Use the Manager Surface to run multiple agents in parallel: one fixing a Socket.IO reconnection bug, another building the vote UI, another writing tests.

5. **Deploy** — Agent handles Cloud Run deployment for the server, Firebase hosting for any web client, and Expo EAS builds for mobile.

### Antigravity Workflow

```
You (architect)
  │
  ├── Agent 1: "Build the React Native lobby screen with room codes"
  │     → Generates LobbyScreen.tsx, socketService.ts
  │     → Creates Artifact: implementation plan + screenshots
  │     → You review, leave comments, agent iterates
  │
  ├── Agent 2: "Build the game engine server with round loop"
  │     → Generates gameEngine.js, resolveRound.js
  │     → Runs tests, fixes failures
  │
  ├── Agent 3: "Integrate Gemini Live API for audio narration"
  │     → Generates aiService.js, voiceRelay.js
  │     → Handles WebSocket session lifecycle
  │
  └── You verify Artifacts, merge, ship
```

---

## 15. Full Data Flow Per Round

```
1.  Game Engine triggers new round
2.  AI Orchestrator builds prompt from game state (Redis)
3.  → Sends prompt to Gemini Standard API (gemini-2.5-flash)
4.  ← Receives structured JSON: story script, choices, clues, tension
5.  Server validates response, stores in Redis
6.  Server sends story_event_script to Gemini Live API session
7.  ← Live API streams back narrator audio (24kHz PCM chunks)
8.  Server relays audio to all players via Socket.IO (narrator_audio)
9.  Players hear the story narrated aloud on their phones
10. Server sends private choices to each player (your_choices event)
11. Players see 3 choice cards on screen, tap to select
12. Server collects all choices, builds resolution prompt
13. → Sends to Gemini Standard API
14. ← Receives resolution JSON (deaths, positions, clues)
15. Server validates kill conditions (server-side, not AI-trusted)
16. Server updates game state in Redis
17. Server sends resolution script to Gemini Live API
18. ← Live API narrates outcomes (public + private whispers)
19. Server routes public audio to all, private audio to individuals
20. Discussion phase opens (player-to-player voice relay via Socket.IO)
21. Server transcribes discussion highlights (for AI context next round)
22. Vote phase if triggered
23. Win condition check
24. Loop to step 1
```

---

## 16. Tech Stack Summary

| Layer | Technology | Details |
|-------|-----------|---------|
| **Mobile App** | React Native + Expo | Cross-platform iOS/Android |
| **UI Framework** | React Navigation + NativeWind (Tailwind) | Navigation and styling |
| **Audio** | expo-av + custom PCM decoder | Narrator playback + voice chat |
| **Networking (client)** | socket.io-client | WebSocket to game server |
| **Backend** | Node.js + Express + Socket.IO | Game server, room management |
| **AI (structured data)** | `@google/generative-ai` SDK → `gemini-2.5-flash` | Choices, clues, resolution |
| **AI (voice)** | `@google/genai` SDK → `gemini-3.1-flash-live-preview` | Real-time narrator voice |
| **State** | Redis | Ephemeral game state |
| **Auth + History** | Firebase Auth + Firestore | Guest login, game logs |
| **Ephemeral Tokens** | Firebase Cloud Functions | Secure Live API auth for mobile |
| **Development** | Google Antigravity | Agentic IDE for building the project |
| **Deployment** | Cloud Run (server) + Expo EAS (mobile) | Production hosting |

---

## 17. Implementation Roadmap

### Phase 1 — Core Prototype (Week 1–2)
*Use Antigravity agents to scaffold aggressively*
- [ ] Expo React Native app with Home, Lobby, Game screens
- [ ] Node.js server with Socket.IO room management
- [ ] 6-character room codes, join/leave logic
- [ ] Trait selection UI
- [ ] Gemini Standard API integration: choice generation with `responseSchema`
- [ ] Basic game loop: story → choices → resolution → text display
- [ ] No voice yet — text-only narration

### Phase 2 — Voice Integration (Week 3–4)
- [ ] Gemini Live API session on server
- [ ] Audio streaming relay (server → Socket.IO → client)
- [ ] PCM-to-WAV decoder on client for playback
- [ ] Narrator audio visualizer component
- [ ] Private vs public audio routing
- [ ] Ephemeral token generation via Cloud Functions
- [ ] Voice chat during discussion phase (P2P or server-relayed)
- [ ] Session resumption for games > 10 minutes

### Phase 3 — Full Mechanics (Week 5–6)
- [ ] Kill condition validation (server-side)
- [ ] Investigator inspect mechanic
- [ ] Body discovery logic
- [ ] Clue tracking and history drawer
- [ ] Chat transcription → AI context pipeline
- [ ] Voting system with majority calculation
- [ ] Win condition checks and game-over screen
- [ ] Role reveal animations

### Phase 4 — Polish & Ship (Week 7+)
- [ ] Room map with player position indicators
- [ ] Sound effects and ambient audio layers
- [ ] Haptic feedback on death reveals and votes
- [ ] Multiple voice characters (different Gemini voices per setting)
- [ ] Multiple settings (mansion, ship, space station)
- [ ] Firebase game history and replay
- [ ] Expo EAS builds for TestFlight / Play Store
- [ ] Load testing with concurrent games

---

## 18. Key Design Principles

**The AI narrates, the server judges.** The Live API delivers atmosphere and voice. The standard API generates structured game data. The server enforces all rules. Never let the AI make mechanical decisions.

**Two APIs, one experience.** The player hears a seamless voiced story. Under the hood, structured data comes from one API and voice performance from another. The server orchestrates both.

**Voice is immersion, not interaction.** Players don't talk *to* the AI — they listen to it. Discussion happens player-to-player. The AI is the narrator, not a participant.

**Build with Antigravity, ship with Expo.** Antigravity accelerates development by handling boilerplate, multi-file scaffolding, and parallel feature development. The output is standard React Native + Node.js code that deploys normally.

**Keep it simple on screen, rich in audio.** The mobile UI shows: room map, 3 choices, player list. The complexity lives in the voice narration — dramatic tone shifts, whispered secrets, atmospheric tension. Audio carries the experience.

---

## 19. Example Full Round (Walkthrough)

**Round 3. 4 players alive. No deaths yet. Tension: 5/10.**

**State:** Alice (Kitchen, curious+observant), Bob (Study, cautious+analytical), Charlie (Foyer, social+impulsive), Diana (Garden, Killer, observant+cautious).

**Step 1 — Standard API generates round data:**
```json
{
  "story_event_script": "Rain begins to pound against the windows. The Garden lights short out with a sharp pop. In the Kitchen, a fuse blows — plunging the room into absolute darkness.",
  "players": {
    "alice": {
      "choices": [
        { "id": "c1", "text": "Feel your way to the Foyer", "type": "move" },
        { "id": "c2", "text": "Stay and search the dark Kitchen by feel", "type": "interact" },
        { "id": "c3", "text": "Call out to see if anyone is nearby", "type": "interact" }
      ],
      "private_info_script": "You hear footsteps outside the Kitchen door. They stop."
    },
    "diana": {
      "choices": [
        { "id": "c1", "text": "Move to the Kitchen in the dark", "type": "move" },
        { "id": "c2", "text": "Stay in the dark Garden and hide", "type": "hide" },
        { "id": "c3", "text": "Head to the Foyer and act frightened", "type": "move" }
      ]
    }
  }
}
```

**Step 2 — Live API narrates the story event:**
> *[Gemini voice, low and tense]:* "Rain... begins to pound against the windows. In the Garden, the lights short out with a sharp pop. And in the Kitchen... [pause] ...a fuse blows. Plunging the room... into absolute darkness."

**Step 3 — Players see choices, tap to select.**
Alice picks c2 (stay in Kitchen). Diana picks c1 (move to Kitchen).

**Step 4 — Server resolves:**
Diana is now alone with Alice in a dark room. Kill conditions met. Server registers death.

**Step 5 — Live API narrates the result:**
> *[Public, all players, voice quickening]:* "The rain intensifies. From somewhere deep in the house... silence falls. Heavier than before."
> *[Private, whispered to Bob]:* "The Study is quiet. You hear nothing. But the quiet feels... wrong."
> *[Private, whispered to Charlie]:* "You thought you heard something from the Kitchen. But it might have been the storm."
> *[Private, to Diana, calm]:* "It's done. You slip out of the Kitchen as quietly as you entered."

Alice's body will be discovered when someone enters the Kitchen next round.

---

*This document is the complete blueprint. Open Antigravity, dispatch agents, build Phase 1, test with friends, and iterate.*
