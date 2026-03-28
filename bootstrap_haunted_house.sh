#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${1:-haunted-house}"

mkdir -p "$PROJECT_ROOT"
cd "$PROJECT_ROOT"

mkdir -p \
  src/cli \
  src/core \
  src/systems \
  src/domain/player \
  src/domain/room \
  src/domain/ghost \
  src/domain/task \
  src/domain/clue \
  src/actions \
  src/content \
  src/ai/contracts \
  src/ai/services \
  src/ai/providers \
  src/ai/prompts \
  src/ai/mappers \
  src/infra \
  src/tests/unit \
  src/tests/integration \
  src/tests/mocks

cat > .gitignore <<'EOF'
node_modules/
dist/
.env
coverage/
*.log
EOF

cat > .env.example <<'EOF'
OPENAI_API_KEY=your_api_key_here
AI_PROVIDER=mock
EOF

cat > package.json <<'EOF'
{
  "name": "haunted-house",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "dotenv": "^16.4.5",
    "tsx": "^4.19.2",
    "typescript": "^5.6.3",
    "vitest": "^2.1.8"
  }
}
EOF

cat > tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noUncheckedIndexedAccess": true,
    "declaration": false
  },
  "include": ["src"]
}
EOF

cat > README.md <<'EOF'
# Haunted House

CLI-first social deduction horror game built with Node.js + TypeScript.

This repository starts as a structured scaffold. Source files intentionally contain responsibility notes
instead of implementation so an AI coding agent can fill them in systematically.

Primary goals:
- Build a deterministic turn-based game engine.
- Keep CLI concerns separate from game logic.
- Support AI-generated ghost stories, tasks, and clues through interfaces and swappable providers.
- Allow mocked AI for tests and offline development.

Run:
1. npm install
2. cp .env.example .env
3. npm run dev
EOF

cat > AGENT_BRIEF.md <<'EOF'
# Haunted House — Agent Build Brief

You are implementing a TypeScript Node.js CLI game called Haunted House.

## Product summary
A multiplayer hidden-role social deduction game:
- One player is secretly possessed.
- Possession is influenced by trait-driven ghost logic.
- Players move through rooms over rounds.
- Innocents perform tasks, receive clues, call meetings, and try to escape or eliminate the possessed.
- The possessed kills isolated players, sabotages progress, and manipulates meetings.

## Architectural rules
1. Keep game logic separate from CLI rendering and prompts.
2. The engine must work with mocked AI or fallback content.
3. The engine must not directly call OpenAI SDK in systems or core orchestration files.
4. AI must be accessed through contracts/interfaces and injected through a game context.
5. Prefer pure functions in systems where possible.
6. Use deterministic resolution order for each round.
7. Use strong domain types and tagged action unions.
8. Content files contain static structured data, not gameplay orchestration.

## MVP gameplay assumptions
- CLI pass-and-play.
- Round 0: all players must move.
- Innocent actions: MOVE, DO_TASK, FOLLOW, EMERGENCY_MEETING.
- Possessed actions: MOVE, KILL, SABOTAGE, PRETEND_TASK, EMERGENCY_MEETING.
- Tasks are the primary source of clues.
- Passive room flavor text can provide light information.
- Kill works only if target is isolated according to current MVP kill rule.
- Meetings trigger on body discovery or emergency meeting.
- Emergency meeting consumes the caller's action.
- Body discovery can bypass meeting cooldown.
- Win conditions:
  - Innocents: escape objectives complete OR possessed eliminated.
  - Possessed: timer runs out OR survivors reduced enough to prevent escape.

## Required implementation order
1. Implement core types and constants.
2. Implement AI contracts.
3. Implement content definitions.
4. Implement factories for players, rooms, ghost profile, tasks, clues.
5. Implement setup flow.
6. Implement action types and validation.
7. Implement systems in isolated files.
8. Implement engine/phase resolver.
9. Implement CLI loop.
10. Add tests for setup, movement, kill, meetings, and engine integration.

## Core engine expectations
Implement a round resolver that processes in a fixed order:
1. Resolve scheduled movement/follow from prior round.
2. Snapshot room occupancy.
3. Apply sabotage.
4. Resolve tasks and queue clue rewards.
5. Resolve kill.
6. Detect bodies / meeting triggers.
7. Run meeting and voting if triggered.
8. Check win conditions.
9. Build round summary and private messages.

## AI integration requirements
AI is present in architecture now, but should be safe to mock.
Implement:
- TaskGenerator
- ClueGenerator
- GhostStoryGenerator

Provide:
- mock provider
- fallback provider
- real OpenAI provider skeleton

All provider output must be mapped into internal domain types through mappers.

## Coding standards
- Use named exports.
- Avoid default exports unless there is a strong reason.
- Keep files focused.
- Add brief doc comments to public types/functions.
- Use TODO markers only for clearly identified future work.
- Keep CLI text readable and minimal.

## Testing requirements
At minimum, cover:
- setup creates legal initial state
- possessed selection happens
- movement resolution
- follow resolution
- isolation-based kill validity
- meeting trigger behavior
- voting tie behavior
- win condition checks

## Final expectation
Make the project compile, then make it minimally playable with mocked AI, then improve content richness.
EOF

create_file() {
  local path="$1"
  local title="$2"
  local body="$3"

  cat > "$path" <<EOF
/**
 * ${title}
 *
 * ${body}
 *
 * Agent notes:
 * - Replace this placeholder with real implementation.
 * - Keep the file focused on its stated responsibility.
 * - Follow AGENT_BRIEF.md and preserve separation of concerns.
 */

export {};
EOF
}

create_file "src/index.ts" \
  "Application entry point" \
  "Bootstrap environment, create runtime dependencies, initialize a game context, and start the CLI game loop."

create_file "src/cli/gameLoop.ts" \
  "CLI game loop" \
  "Coordinate pass-and-play CLI flow. Prompt each player privately, collect actions, call the engine, and render round summaries and meetings."

create_file "src/cli/prompt.ts" \
  "CLI prompt helpers" \
  "Implement terminal prompting utilities using Node readline/promises. Handle menu selection, confirmation, and safe pass-and-play input."

create_file "src/cli/render.ts" \
  "CLI rendering" \
  "Render game state views, private player prompts, room summaries, meetings, clues, deaths, and win screens. No game rule logic here."

create_file "src/cli/screen.ts" \
  "CLI screen utilities" \
  "Provide terminal helpers like clear screen, pause, divider lines, hidden handoff prompts between players, and consistent formatting helpers."

create_file "src/core/types.ts" \
  "Core domain and engine types" \
  "Define all core types and enums: GameState, Player, Room, GhostProfile, Task, Clue, Role, Action unions, Meeting state, RoundSummary, and engine result shapes."

create_file "src/core/constants.ts" \
  "Global gameplay constants" \
  "Store gameplay constants like meeting cooldown defaults, max players, min players, initial room counts, round labels, and other shared config values."

create_file "src/core/engine.ts" \
  "Main game engine orchestration" \
  "Expose the main function that accepts game state and submitted actions, calls the phase resolver and systems in order, and returns the next state plus round output."

create_file "src/core/phaseResolver.ts" \
  "Round phase resolver" \
  "Implement the deterministic round pipeline and coordinate calls to movement, sabotage, tasks, kill, body detection, meeting, clue, and win systems."

create_file "src/core/setupGame.ts" \
  "Game setup orchestration" \
  "Create a new game from player input and runtime context. Build rooms, traits, ghost profile, possessed assignment, initial tasks, and initial round state."

create_file "src/core/gameContext.ts" \
  "Runtime dependency container" \
  "Define the dependency container passed into setup and engine. Include AI generators, RNG service, logger, config, and ID helpers."

create_file "src/core/utils.ts" \
  "Core utility helpers" \
  "Provide pure helpers shared by core logic such as safe assertions, invariant checks, shallow summaries, and small domain-independent helpers."

create_file "src/systems/movementSystem.ts" \
  "Movement system" \
  "Resolve room movement chosen in the previous round. Update player locations and room occupancy based on validated movement intents."

create_file "src/systems/followSystem.ts" \
  "Follow system" \
  "Resolve follow behavior so a player ends in the same destination as the followed player according to the game rules and edge-case policy."

create_file "src/systems/taskSystem.ts" \
  "Task system" \
  "Resolve task attempts, determine success/failure, apply sabotage interference, update task state, and queue clue rewards for the following round."

create_file "src/systems/sabotageSystem.ts" \
  "Sabotage system" \
  "Apply possessed sabotage actions to rooms, tasks, or clue flows according to MVP sabotage rules while keeping behavior deterministic and testable."

create_file "src/systems/killSystem.ts" \
  "Kill system" \
  "Validate and execute possessed kill actions. Apply the current MVP isolation rule, mark deaths, and place bodies in the appropriate rooms."

create_file "src/systems/bodySystem.ts" \
  "Body detection system" \
  "Detect whether bodies are discovered during or after resolution and determine whether a meeting must be triggered automatically."

create_file "src/systems/meetingSystem.ts" \
  "Meeting and voting system" \
  "Handle emergency meetings, body-triggered meetings, vote collection, skip behavior, ties, eliminations, and post-meeting state updates."

create_file "src/systems/clueSystem.ts" \
  "Clue delivery system" \
  "Generate or reveal clues from completed tasks and passive room events. Attach clues privately to players and format public-facing summary hooks."

create_file "src/systems/winSystem.ts" \
  "Win condition system" \
  "Check innocent and possessed win conditions after each round and after meetings. Return a winner or indicate that play should continue."

create_file "src/domain/player/playerFactory.ts" \
  "Player factory" \
  "Create Player entities with validated initial state, role defaults, traits, cooldown fields, and pending action placeholders."

create_file "src/domain/player/playerSelectors.ts" \
  "Player selectors" \
  "Provide pure query helpers for players such as alive players, dead players, possessed player lookup, players in a room, and task-related selection helpers."

create_file "src/domain/room/roomFactory.ts" \
  "Room factory" \
  "Create Room entities from static room definitions with starting state for occupancy, bodies, sabotage flags, and room metadata."

create_file "src/domain/room/roomSelectors.ts" \
  "Room selectors" \
  "Provide pure room query helpers such as finding a room by id, occupancy count, rooms containing bodies, and task-capable rooms."

create_file "src/domain/ghost/ghostFactory.ts" \
  "Ghost factory" \
  "Create structured GhostProfile entities from static content and/or AI-generated story output, including motive, trait affinity, and clue style."

create_file "src/domain/ghost/ghostSelectors.ts" \
  "Ghost selectors" \
  "Provide helpers for querying ghost motive, preferred traits, clue themes, and host selection scoring support."

create_file "src/domain/task/taskFactory.ts" \
  "Task factory" \
  "Create Task entities for players and rooms from templates or AI-generated task content while preserving a stable internal shape."

create_file "src/domain/task/taskSelectors.ts" \
  "Task selectors" \
  "Provide pure task lookup helpers such as available tasks by player/room, pending clues, completed tasks, and escape objective progress."

create_file "src/domain/clue/clueFactory.ts" \
  "Clue factory" \
  "Create Clue entities from AI or fallback content with consistent fields such as text, type, confidence, related traits, and source."

create_file "src/domain/clue/clueSelectors.ts" \
  "Clue selectors" \
  "Provide helpers for clue lookup, filtering by player/source/type, and preparing clue summaries for meetings or UI presentation."

create_file "src/actions/actionTypes.ts" \
  "Action type definitions" \
  "Define tagged action unions for innocent and possessed actions and shared helper types for action validation and resolution."

create_file "src/actions/actionFactory.ts" \
  "Action builders" \
  "Create helper functions for constructing valid action objects in a consistent way from CLI input or tests."

create_file "src/actions/validateAction.ts" \
  "Action validation" \
  "Validate whether a chosen action is legal for a player in the current state, including role constraints, cooldowns, and round-specific restrictions."

create_file "src/actions/buildActionMenu.ts" \
  "Action menu builder" \
  "Return the allowed action list and menu options for a given player and round state so the CLI can display only legal choices."

create_file "src/content/traits.ts" \
  "Trait definitions" \
  "Define the static list of supported player traits, their ids, labels, descriptions, and optional metadata used by ghost affinity logic."

create_file "src/content/rooms.ts" \
  "Room definitions" \
  "Define the static mansion rooms available to the MVP including ids, names, descriptions, and any room-level tags relevant to tasks or events."

create_file "src/content/ghostArchetypes.ts" \
  "Ghost archetype definitions" \
  "Define reusable ghost archetypes with motives, emotional signatures, preferred traits, hated traits, clue styles, and flavor anchors."

create_file "src/content/taskTemplates.ts" \
  "Task template definitions" \
  "Define structured fallback task templates used when AI is unavailable or for deterministic testing. Include category, prompt seed, and reward metadata."

create_file "src/content/clueTemplates.ts" \
  "Clue template definitions" \
  "Define structured fallback clue templates and light passive room clue patterns used when AI is unavailable or testing requires stable outputs."

create_file "src/content/events.ts" \
  "Static event definitions" \
  "Define optional passive supernatural events, room flavor events, or future event hooks that can be triggered by the engine."

create_file "src/ai/contracts/AIGateway.ts" \
  "Low-level AI gateway contract" \
  "Define the low-level interface for sending prompts to an AI provider. This is transport-oriented and should not be used directly by the engine."

create_file "src/ai/contracts/TaskGenerator.ts" \
  "Task generator contract" \
  "Define the engine-facing interface for generating a task payload based on player, room, and ghost/game context."

create_file "src/ai/contracts/ClueGenerator.ts" \
  "Clue generator contract" \
  "Define the engine-facing interface for generating clue payloads from tasks, ghost profile, room context, and recent events."

create_file "src/ai/contracts/GhostStoryGenerator.ts" \
  "Ghost story generator contract" \
  "Define the engine-facing interface for generating or expanding the structured ghost story used during setup and clue theming."

create_file "src/ai/services/generateTask.ts" \
  "Task generation service" \
  "Implement the use-case level task generation flow. Build prompt input, call the provider contract, validate raw output, and map it into Task content."

create_file "src/ai/services/generateClue.ts" \
  "Clue generation service" \
  "Implement the use-case level clue generation flow. Build clue input context, call the provider, validate raw output, and map it into Clue content."

create_file "src/ai/services/generateGhostStory.ts" \
  "Ghost story generation service" \
  "Implement the ghost story generation flow. Use archetypes and player traits as inputs, call AI or fallback logic, and return structured ghost story data."

create_file "src/ai/providers/openaiProvider.ts" \
  "OpenAI provider" \
  "Implement the real AI provider integration. Read API key from env, call the provider safely, and return raw outputs in the format expected by services."

create_file "src/ai/providers/mockAIProvider.ts" \
  "Mock AI provider" \
  "Implement stable deterministic fake AI responses for tests and local development. This provider should be easy to seed and predictable."

create_file "src/ai/providers/fallbackProvider.ts" \
  "Fallback AI provider" \
  "Implement non-network generation using local templates and heuristics so the game still works if real AI is disabled or unavailable."

create_file "src/ai/prompts/taskPrompt.ts" \
  "Task prompt builder" \
  "Build the prompt or structured request for task generation using room context, player state, and desired difficulty/tone."

create_file "src/ai/prompts/cluePrompt.ts" \
  "Clue prompt builder" \
  "Build the prompt or structured request for clue generation based on task result, ghost profile, room, and narrative style."

create_file "src/ai/prompts/ghostStoryPrompt.ts" \
  "Ghost story prompt builder" \
  "Build the prompt or structured request for ghost story generation based on archetype, selected traits, and desired replayable narrative style."

create_file "src/ai/mappers/taskMapper.ts" \
  "Task mapper" \
  "Map raw AI or fallback output into the internal task generation result shape used by factories and task system logic."

create_file "src/ai/mappers/clueMapper.ts" \
  "Clue mapper" \
  "Map raw AI or fallback output into the internal clue generation result shape with normalized fields and safe defaults."

create_file "src/ai/mappers/ghostStoryMapper.ts" \
  "Ghost story mapper" \
  "Map raw AI or fallback output into structured ghost story data used by ghost factories and setup logic."

create_file "src/ai/aiConfig.ts" \
  "AI configuration" \
  "Centralize AI-related configuration such as provider selection, model names, timeout behavior, mock/fallback switches, and feature flags."

create_file "src/infra/env.ts" \
  "Environment loader" \
  "Load and validate environment variables. Expose typed access to provider settings, API keys, and runtime flags."

create_file "src/infra/logger.ts" \
  "Logger abstraction" \
  "Provide a lightweight logger abstraction for debug/info/error output. Keep it swappable and avoid scattering raw console calls."

create_file "src/infra/random.ts" \
  "Random service" \
  "Provide centralized random helpers and a seedable RNG strategy later. Avoid using Math.random directly across the codebase."

create_file "src/infra/ids.ts" \
  "ID generation helpers" \
  "Provide consistent ID generation helpers for players, rooms, tasks, clues, rounds, and events."

create_file "src/tests/unit/movementSystem.test.ts" \
  "Movement system tests" \
  "Add unit tests for movement resolution and room placement, including edge cases tied to the previous-round movement model."

create_file "src/tests/unit/killSystem.test.ts" \
  "Kill system tests" \
  "Add unit tests validating the possessed kill rules, especially isolation logic and failure conditions."

create_file "src/tests/unit/meetingSystem.test.ts" \
  "Meeting system tests" \
  "Add unit tests for emergency meeting behavior, body-triggered meetings, vote resolution, skip behavior, and tie results."

create_file "src/tests/unit/taskSystem.test.ts" \
  "Task system tests" \
  "Add unit tests for task availability, completion, sabotage interference, and clue reward queuing."

create_file "src/tests/integration/engine.test.ts" \
  "Engine integration tests" \
  "Add integration tests that run a full round through the engine and verify that the deterministic phase order produces expected results."

create_file "src/tests/integration/setupGame.test.ts" \
  "Setup integration tests" \
  "Add integration tests verifying legal initial state creation, ghost profile generation, possession assignment, and round-zero readiness."

create_file "src/tests/mocks/mockGameContext.ts" \
  "Mock game context" \
  "Provide a reusable test context wiring together mock AI generators, seeded random behavior, and test-safe logging."

echo "Scaffold created successfully in: $PROJECT_ROOT"
echo "Next steps:"
echo "  1. cd $PROJECT_ROOT"
echo "  2. npm install"
echo "  3. cp .env.example .env"
echo "  4. Open AGENT_BRIEF.md and let your coding agent implement from there"