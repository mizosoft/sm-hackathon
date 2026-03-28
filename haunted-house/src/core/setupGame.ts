/** Game setup orchestration. */

import type { GameState } from './types.js';
import type { GameContext } from './gameContext.js';
import { DEFAULT_MAX_ROUNDS, ESCAPE_TASKS_REQUIRED, INITIAL_MEETING_COOLDOWN } from './constants.js';
import { ROOM_DEFINITIONS } from '../content/rooms.js';
import { GHOST_ARCHETYPES } from '../content/ghostArchetypes.js';
import { TASK_TEMPLATES } from '../content/taskTemplates.js';
import { TRAIT_DEFINITIONS } from '../content/traits.js';
import { createPlayer } from '../domain/player/playerFactory.js';
import { createRoom } from '../domain/room/roomFactory.js';
import { createGhostProfile } from '../domain/ghost/ghostFactory.js';
import { selectPossessionTarget } from '../domain/ghost/ghostSelectors.js';
import { createTask } from '../domain/task/taskFactory.js';
import { pickRandom, shuffle } from './utils.js';

export async function setupGame(
  playerNames: string[],
  ctx: GameContext,
): Promise<GameState> {
  const rng = ctx.rng.next.bind(ctx.rng);

  // Build rooms
  const rooms = ROOM_DEFINITIONS.map(createRoom);

  // Assign traits to players
  const traitPool = shuffle(TRAIT_DEFINITIONS.map(t => t.id), rng);
  const players = playerNames.map((name, i) => {
    const t1 = traitPool[i % traitPool.length]!;
    const t2 = traitPool[(i + 1) % traitPool.length]!;
    return createPlayer(name, 'innocent', [t1, t2]);
  });

  // Pick ghost archetype and generate backstory
  const archetype = pickRandom(GHOST_ARCHETYPES, rng);
  const story = await ctx.ghostStoryGenerator.generate({
    archetypeId: archetype.id,
    archetypeName: archetype.name,
    motive: archetype.motive,
    traits: archetype.preferredTraits,
  });
  const ghost = createGhostProfile(archetype, story);

  // Select possessed player
  const possessed = selectPossessionTarget(ghost, players, rng);
  possessed.role = 'possessed';

  // Generate initial tasks for rooms (2 tasks per non-foyer room)
  const tasks = [];
  const taskRooms = rooms.filter(r => r.id !== 'foyer');
  const usedTemplateIndices = new Set<number>();
  for (const room of taskRooms) {
    for (let t = 0; t < 2; t++) {
      // Pick a template not yet used, if possible
      let template;
      let attempts = 0;
      do {
        template = pickRandom(TASK_TEMPLATES, rng);
        attempts++;
      } while (usedTemplateIndices.has(TASK_TEMPLATES.indexOf(template)) && attempts < 20);
      usedTemplateIndices.add(TASK_TEMPLATES.indexOf(template));

      const task = createTask(
        template.name.replace('{room}', room.name),
        template.description.replace('{room}', room.name),
        room.id,
        template.category,
        {
          ...template.challenge,
          flavorText: template.challenge.flavorText.replace('{room}', room.name),
        },
      );
      tasks.push(task);
      room.taskIds.push(task.id);
    }
  }

  ctx.logger.info(`Game setup complete. ${players.length} players. Ghost: ${ghost.name}. Possessed: ${possessed.name}.`);

  return {
    phase: 'action',
    round: 0,
    players,
    rooms,
    tasks,
    clues: [],
    ghost,
    possessedPlayerId: possessed.id,
    meetingHistory: [],
    roundSummaries: [],
    meetingCooldownUntilRound: INITIAL_MEETING_COOLDOWN,
    escapeTasksRequired: ESCAPE_TASKS_REQUIRED,
    escapeTasksCompleted: 0,
    maxRounds: DEFAULT_MAX_ROUNDS,
    winner: null,
    pendingClues: [],
    lastKillRound: -99,
  };
}
