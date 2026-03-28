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

## Implementation strategy
Implement in passes, not all at once.

### Pass 1
- Make project compile.
- Fill core types, contracts, static content, and setup skeleton.
- Wire mock provider.
- Ensure npm run build passes.

### Pass 2
- Implement setup flow and factories.
- Create a minimal playable loop with mocked AI.
- Support round 0 movement and one normal round.

### Pass 3
- Implement full deterministic round resolution.
- Add task, sabotage, kill, body, meeting, clue, and win systems.

### Pass 4
- Improve rendering, content richness, and tests.

Do not over-implement speculative future mechanics before the MVP loop works.
