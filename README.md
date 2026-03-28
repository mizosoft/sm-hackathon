# impost.io

A browser-based multiplayer murder mystery for 4–6 players. The game unfolds as a scrolling chat. One player is secretly the Killer. One is the Investigator. The rest are Innocents. Gemini AI narrates the story and drives AI agent players.

---

## Requirements

- Node.js 18+
- A Gemini API key — get one free at https://aistudio.google.com/apikey

---

## Setup

### 1. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 2. Configure environment

Copy the example env file into the server directory:

```bash
cp .env.example server/.env
```

Then edit `server/.env`:

```
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
PORT=3001
```

---

## Running

### Development (two terminals)

```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

Open http://localhost:5173

The client proxies API and socket requests to the server at port 3001.

### Production (single server)

```bash
cd client && npm run build
cd ../server && npm start
```

Open http://localhost:3001

The server serves the built client from `client/dist/`.

---

## How to Play

1. One player creates a room and shares the 6-character code
2. Others join using the code
3. The host can add AI agent players to fill empty slots (up to 3 AI agents)
4. The game requires at least 4 players to start
5. When the host starts the game, each player is secretly assigned a role:
   - **Killer** — eliminate players one by one without being caught. Blend in.
   - **Investigator** — gather clues, call emergency meetings, expose the killer.
   - **Innocent** — survive, explore, and vote out the killer.
6. Your role is shown in a popup when the game begins. During play, hold your role badge in the header to reveal it privately.

### Rounds

Each round you receive three choices — move to another area, interact with your surroundings, or stay hidden. Pick one within the time limit. You won't see what others chose. After all choices are resolved, you receive a private observation about what you personally noticed.

The killer can eliminate another player by choosing **attack** when alone with them.

### Emergency Meetings

Any living player can call an emergency meeting (limited uses). During the meeting, discuss freely via chat, then vote to eliminate a suspect. If all living human players agree, the discussion can be skipped early.

### Winning

- **Innocents win** if the killer is voted out
- **Killer wins** if only 2 players remain alive

---

## AI Agents

Add bot players in the lobby with **+ Add AI agent**. They:

- Make choices automatically each round
- Send authentic discussion messages during meetings (powered by Gemini)
- Vote based on clues and game history
- Have unique names: ARIA, ECHO, CIPHER, VECTOR, NOVA, PHANTOM

---

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express, Socket.IO |
| AI | Google Gemini (`gemini-2.5-flash`) via `@google/genai` |
| Realtime | Socket.IO (WebSocket) |
