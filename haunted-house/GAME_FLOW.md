# Haunted House — Game Flow Specification

## 1. Overview

**Haunted House** is a turn-based multiplayer social deduction game set in a haunted mansion.

One player is secretly possessed by a ghost. The rest are innocents trying to survive, complete escape-related objectives, gather clues, and identify the possessed before the haunting wins.

The first version of the game is a **CLI pass-and-play MVP** built in Node.js + TypeScript.

---

## 2. Core Design Goals

The implementation should preserve these design goals:

1. **Deterministic turn resolution**  
   The engine must resolve rounds in a fixed, testable order.

2. **Hidden-role social deduction**  
   One player is secretly possessed. Others must infer the truth from clues, deaths, and meetings.

3. **Trait-driven ghost logic**  
   The ghost has a profile and motive, and it chooses a host based on player traits.

4. **Task-driven clue discovery**  
   Tasks are the main source of meaningful clues.

5. **Separation of concerns**  
   CLI rendering/input must be separate from game logic.
   AI must be separate from engine logic and accessed via contracts/interfaces.

---

## 3. High-Level Game Fantasy

Players are trapped inside a haunted mansion.

- The mansion contains rooms, room-specific tasks, and supernatural events.
- A ghost has a motive and emotional signature.
- That ghost possesses one player in secret.
- Innocents try to complete objectives and uncover the possessed.
- The possessed tries to kill isolated players, sabotage progress, and manipulate meetings.

Each game should feel replayable because:
- player traits vary
- ghost profile varies
- clue flavor varies
- room/task/clue combinations vary

---

## 4. Player Roles

## 4.1 Innocent
An innocent player is trying to:
- survive
- complete objectives/tasks
- receive clues
- use meetings and voting to eliminate the possessed

## 4.2 Possessed
The possessed player is trying to:
- avoid detection
- kill isolated players
- sabotage innocent progress
- mislead others in meetings
- stall until innocents lose

The possessed knows their role.  
Innocents do not.

---

## 5. Traits and Ghost Logic

At game start, each player has a set of traits.

Examples:
- aggressive
- patient
- impulsive
- selfish
- loyal
- paranoid
- brave
- calm

The game generates a **ghost profile** with structured properties such as:
- archetype
- backstory
- motive
- emotional signature
- preferred traits
- hated traits
- clue style

The possessed is selected based on how strongly each player’s traits match the ghost’s affinity rules.

This is important:
- possession is not purely random flavor
- ghost profile should influence clue style and story tone
- clues should indirectly reflect the ghost’s emotional logic

---

## 6. Setup Flow

The game setup should follow this sequence:

### 6.1 Collect players
Collect:
- player count
- player names
- player traits

### 6.2 Create mansion state
Create:
- room definitions
- currently available rooms
- room metadata
- room/task associations

### 6.3 Generate ghost profile
Use AI or fallback logic to create a structured ghost profile.

This should produce:
- ghost archetype
- narrative backstory
- motive
- emotional signature
- preferred traits
- clue flavor style

### 6.4 Select possessed
Use ghost trait affinity logic to determine which player becomes possessed.

This should be secret.

### 6.5 Initialize game state
Initialize:
- round number
- players
- rooms
- ghost profile
- task state
- pending clue queue
- meeting cooldown state
- alive/dead state
- no winner yet

---

## 7. Turn Structure

The game is played in **rounds**.

Each round has two broad parts:
1. players privately choose actions
2. the engine resolves those actions in a fixed order

The game continues until a win condition is reached.

---

## 8. Round 0 Rule

Round 0 is special.

### Round 0 restrictions
- all players must choose **MOVE**
- **FOLLOW** is not allowed
- **DO_TASK** is not allowed
- the possessed also behaves like a normal player outwardly

### Purpose of Round 0
This exists to:
- force initial dispersion
- prevent immediate meta deductions
- establish room positions before task play begins

---

## 9. Player Actions

## 9.1 Innocent Actions

In a normal round, an innocent may choose exactly one action:

### MOVE
Choose a destination room.

Important:
- movement is **declared this round**
- movement is **applied at the start of the next round**

### DO_TASK
Attempt a task available to that player in their current room.

If successful:
- the task is completed
- a clue is queued
- the clue is delivered next round

### FOLLOW
Choose another player to follow.

On the next round’s movement resolution:
- the follower ends in the same resolved destination as the followed player

### EMERGENCY_MEETING
Call a meeting immediately.

Important:
- this consumes the player’s action for the round

---

## 9.2 Possessed Actions

In a normal round, the possessed may choose exactly one action:

### MOVE
Same movement rule as innocents.

### KILL
Attempt to kill a valid isolated target.

### SABOTAGE
Interfere with innocent progress.

### PRETEND_TASK
Perform an innocent-looking deception action.

### EMERGENCY_MEETING
Call a meeting, consuming the round action.

Important:
- the possessed cannot call a meeting and kill in the same round
- the possessed should be allowed to use meetings socially as part of deception

---

## 10. Delayed Movement Model

Movement is intentionally delayed.

### Rule
When a player chooses MOVE:
- they do not immediately leave their room
- their move is scheduled
- at the start of the next round, movement is resolved first

### Why this matters
This design:
- creates prediction
- makes following meaningful
- avoids reactive spam
- makes room commitment matter

The engine must support this cleanly and deterministically.

---

## 11. Follow Rules

FOLLOW is a movement-linked tracking action.

If Player A follows Player B:
- A does not move immediately
- on the next round’s movement phase, A ends in B’s resolved room

The exact behavior for rare edge cases must be deterministic and tested.

At a minimum, the system must clearly define:
- what happens if the target dies
- what happens if multiple players follow the same target
- what happens if the target does not move

For MVP:
- FOLLOW should be implemented as a grouping/tracking mechanic
- FOLLOW should help players reduce isolation risk

---

## 12. Tasks

Tasks are one of the main innocent progression systems.

### Task design requirements
- tasks are room-based
- task availability is player-specific
- tasks help innocents progress toward victory
- tasks are the primary source of clues
- tasks should be compatible with AI generation or fallback templates

### Task completion result
If a player completes a task successfully:
- task state is updated
- clue reward is queued
- clue is delivered in the next round

### Task purpose
Tasks should:
- create pressure
- encourage movement
- generate clues
- support escape progression

Tasks should not feel like meaningless filler.

---

## 13. Clues

Clues are the main deduction resource for innocents.

### Main clue source
- completed tasks

### Secondary clue source
- room flavor
- body discovery
- passive supernatural events

### Clue style rule
Clues should **not directly reveal** the possessed.

Bad:
- “Player 2 is the possessed.”

Bad:
- “The possessed has trait aggressive.”

Good:
- “The violence here feels impulsive and uncontrolled.”
- “Something in this room suggests resentment rather than panic.”
- “The objects were carefully staged, not destroyed in rage.”

The clue system should push players toward:
- interpreting motive
- discussing trait implications
- suspecting players socially

---

## 14. Kill Rules

The possessed can choose **KILL**.

### MVP Kill Rule
The kill succeeds only if the target is **isolated** according to the current MVP isolation rule.

Recommended MVP interpretation:
- a target can only be killed if they are alone in their room at kill resolution time

This means:
- grouped players are safe
- isolated players are vulnerable
- follow and movement matter

### Kill result
If valid:
- target becomes dead
- a body is placed in the room
- game state updates accordingly

Dead-player ghost mechanics may be added later, but are not required for MVP.

---

## 15. Sabotage

The possessed can choose **SABOTAGE** instead of killing.

### Sabotage goals
Sabotage should:
- slow innocent progress
- interfere with tasks or clues
- create uncertainty
- remain deterministic and testable

### MVP sabotage examples
Possible early sabotage types:
- disable a room’s task outcome for the round
- prevent clue reward from a task
- delay room/task progress
- temporarily affect room usability

Sabotage should be kept simple in early implementation.

---

## 16. Pretend Task

The possessed can choose **PRETEND_TASK**.

Purpose:
- mimic innocent behavior
- create social cover
- support bluffing in meetings

For MVP, this may be mostly:
- a logged deceptive action
- a state marker used in round summaries or future systems

It does not need to be deep at first.

---

## 17. Meetings

Meetings are the main social deduction phase.

### A meeting can start in two ways:

#### 17.1 Body-triggered meeting
If a body is discovered, a meeting is automatically triggered.

#### 17.2 Emergency meeting
Any living player, including the possessed, may call an emergency meeting if allowed by cooldown rules.

### Important emergency meeting rule
Calling an emergency meeting:
- consumes the caller’s action for the round

This is especially important for the possessed:
- they gain social timing control
- but give up kill/sabotage that round

### Cooldown
Emergency meetings should be limited by cooldown rules to avoid spam.

Body-triggered meetings should bypass emergency cooldown restrictions if necessary.

---

## 18. Voting

During a meeting:
- living players discuss
- each living player votes for:
  - a player
  - or skip

### Vote outcome
- majority vote eliminates that player
- tie means no elimination
- skip can result in no elimination depending on vote totals

### Immediate victory interaction
If the eliminated player is the possessed:
- innocents win immediately

If the eliminated player is innocent:
- game continues

---

## 19. Win Conditions

## 19.1 Innocent Win
The innocents win if either:
- they complete the required escape/objective progress
- they eliminate the possessed in a meeting

## 19.2 Possessed Win
The possessed wins if either:
- enough innocents die that recovery is no longer possible
- the round limit / game timer expires before innocent objectives are completed

For MVP, the possessed’ victory should mainly be:
- kill/stall long enough that innocents fail their objective

---

## 20. Deterministic Round Resolution Order

This is critical.

The engine must resolve each round in a fixed order.

### Resolution order

#### Phase 1 — Resolve previous movement and follow
Apply all scheduled movement/follow from the previous round.

After this phase:
- every player has a resolved room for the current round

#### Phase 2 — Snapshot room occupancy
Freeze room occupancy for downstream calculations.

This snapshot is used for:
- kill validation
- room safety checks
- possibly other systems

#### Phase 3 — Resolve sabotage
Apply sabotage effects for the round.

#### Phase 4 — Resolve tasks
Resolve all task attempts.

If successful:
- mark task complete
- queue clue reward for next round

#### Phase 5 — Resolve kill
Evaluate the possessed kill action using current room occupancy and the kill rule.

If valid:
- mark target dead
- place body

#### Phase 6 — Detect bodies and meeting triggers
Determine whether:
- a body has been discovered
- an emergency meeting was called

#### Phase 7 — Run meeting if triggered
If a meeting occurs:
- collect votes
- resolve elimination
- update state

#### Phase 8 — Check win conditions
Determine whether the game has ended.

#### Phase 9 — Build round output
Produce:
- public round summary
- private player messages
- clue deliveries
- room descriptions

This order should be implemented and tested.

---

## 21. CLI Pass-and-Play Requirements

The first version is a CLI game using one machine shared between players.

### CLI requirements
- players take turns privately
- private information must not leak between turns
- screen should be cleared or hidden between players
- prompts should be simple and readable

### CLI responsibilities only
The CLI layer should:
- collect input
- render menus
- show summaries
- hide private info between turns

The CLI must **not** contain game rules.

---

## 22. AI Integration Requirements

AI is part of the architecture from the start.

### AI should be used for:
- ghost story generation
- task generation
- clue generation

### AI access rule
The engine must not directly call a raw AI SDK.

Instead, AI must be accessed through interfaces/contracts such as:
- `GhostStoryGenerator`
- `TaskGenerator`
- `ClueGenerator`

### Supported AI modes
The architecture must support:
- mock provider
- fallback local/template provider
- real provider

This is required so:
- tests are deterministic
- development works offline
- engine remains decoupled

---

## 23. Minimum Data Model Expectations

The implementation should include at least these structured concepts.

### Player
- id
- name
- traits
- role
- alive/dead
- current room
- known clues
- pending/scheduled action
- task state
- meeting cooldown state

### Room
- id
- name
- description
- occupancy
- bodies
- sabotage state
- room tags

### GhostProfile
- archetype
- backstory
- motive
- emotional signature
- preferred traits
- hated traits
- clue style

### Task
- id
- assigned player
- assigned room
- category
- status
- reward metadata

### Clue
- id
- text
- source
- type
- related traits
- confidence/strength

### GameState
- players
- rooms
- ghost profile
- round number
- pending movement/follow state
- pending clue queue
- meeting state
- round limit/timer
- winner if any

---

## 24. Implementation Priorities

The coding agent should implement in passes.

### Pass 1
- make project compile
- implement core types
- implement constants
- implement game context
- implement AI contracts
- implement static content
- implement factories

### Pass 2
- implement setup flow
- wire mock AI provider
- wire fallback provider
- boot a basic CLI

### Pass 3
- implement action types and validation
- implement movement/follow
- implement tasks
- implement kill
- implement meetings
- implement win checks
- implement engine phase resolver

### Pass 4
- improve clue richness
- deepen sabotage behavior
- improve rendering
- expand tests

---

## 25. Final Build Rule

The game must be implemented as:
- a modular deterministic engine
- with CLI separated from rules
- with AI behind contracts
- with strong typed state
- with tests covering setup, movement, kill, meetings, and win conditions

Do not overbuild speculative features before the MVP loop works.