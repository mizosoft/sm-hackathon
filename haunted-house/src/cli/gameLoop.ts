/** CLI game loop — pass-and-play coordination. */

import type { GameState } from '../core/types.js';
import type { GameContext } from '../core/gameContext.js';
import type { GameAction } from '../actions/actionTypes.js';
import { processRound, processMeeting, advanceRound } from '../core/engine.js';
import { buildActionMenu } from '../actions/buildActionMenu.js';
import { moveAction, doTaskAction, followAction, emergencyMeetingAction, killAction, sabotageAction, pretendTaskAction } from '../actions/actionFactory.js';
import { alivePlayers } from '../domain/player/playerSelectors.js';
import { clearScreen, handoff, pause, thinDivider, banner } from './screen.js';
import { menuPrompt, textPrompt } from './prompt.js';
import {
  renderIntro, renderRoleReveal, renderRoundNarration, renderPreviousRoundRecap,
  renderPlayerView, renderRoundSummary, renderPrivateMessages, renderWinScreen, renderMeetingHeader,
} from './render.js';

export async function gameLoop(state: GameState, ctx: GameContext): Promise<void> {
  // ── Intro & Rules ──
  clearScreen();
  renderIntro(state);
  await pause();

  // ── Role Reveal (private per player) ──
  for (const player of state.players) {
    await handoff(player.name);
    renderRoleReveal(state, player);
    await pause('\n  Press ENTER when you\'ve read your role...');
  }

  // ── Main game loop ──
  while (state.phase !== 'ended') {
    // ── Round start: show narration + recap to everyone ──
    if (state.round > 0) {
      clearScreen();
      renderRoundNarration(state);
      renderPreviousRoundRecap(state);
      await pause('\n  Everyone, read the recap above. Press ENTER when ready...');
    }

    // ── Collect actions from each player ──
    const actions = await collectActions(state);

    const result = await processRound(state, actions, ctx);

    // ── Show round summary (public) ──
    clearScreen();
    const latestSummary = state.roundSummaries[state.roundSummaries.length - 1];
    if (latestSummary) {
      renderRoundSummary(latestSummary);
    }
    await pause();

    // ── Handle meeting if triggered ──
    if (result.meetingTriggered && result.meetingTrigger && result.meetingCalledBy && (state.phase as string) !== 'ended') {
      clearScreen();
      const callerPlayer = state.players.find(p => p.id === result.meetingCalledBy);
      renderMeetingHeader(result.meetingTrigger, callerPlayer?.name ?? 'unknown');

      // Show everyone's locations so discussion is informed
      console.log('\n  📍 Where everyone was:');
      for (const p of alivePlayers(state)) {
        const room = state.rooms.find(r => r.id === p.roomId);
        console.log(`     ${p.name} — ${room?.name ?? '???'}`);
      }
      thinDivider();
      console.log('\n  🗣️  Discuss among yourselves. Share clues and suspicions.');
      console.log('  When ready, each player will vote privately.\n');
      await pause();

      const votes = await collectVotes(state);
      const meetingResult = processMeeting(state, result.meetingTrigger, result.meetingCalledBy, votes);

      clearScreen();
      banner('📋  VOTE RESULTS');
      for (const e of meetingResult.events) {
        console.log(`     • ${e}`);
      }
      console.log('');
      await pause();
    }

    if ((state.phase as string) === 'ended') {
      break;
    }

    advanceRound(state);
  }

  clearScreen();
  renderWinScreen(state);
}

// ─── Action Collection ─────────────────────────────────────────────

async function collectActions(state: GameState): Promise<GameAction[]> {
  const actions: GameAction[] = [];
  const alive = alivePlayers(state);

  // Round 0 special prompt
  if (state.round === 0) {
    for (const player of alive) {
      await handoff(player.name);
      console.log(`\n  🏚️  You stand in the Foyer. The door slams shut behind you.`);
      console.log(`  You need to split up and explore the house.\n`);
      renderPlayerView(state, player);

      const menu = buildActionMenu(state, player);
      const labels = menu.map(m => m.label);
      const choice = await menuPrompt(labels, '  Where do you want to go?');
      const selected = menu[choice]!;

      const action = buildAction(player.id, selected.kind, selected.targetId);
      if (action) actions.push(action);
    }
    return actions;
  }

  for (const player of alive) {
    await handoff(player.name);
    renderPlayerView(state, player);

    const menu = buildActionMenu(state, player);
    if (menu.length === 0) {
      console.log('  ⏸️  No actions available this round.');
      await pause();
      continue;
    }

    // Group and label actions for clarity
    console.log('  💭 What would you like to do?\n');
    const labels = menu.map(m => m.label);
    const choice = await menuPrompt(labels, '  Choose your action');
    const selected = menu[choice]!;

    // If player chose DO_TASK, run the interactive challenge
    if (selected.kind === 'DO_TASK' && selected.targetId) {
      const task = state.tasks.find(t => t.id === selected.targetId);
      if (task) {
        const passed = await runTaskChallenge(task, player.name);
        if (!passed) {
          console.log(`\n  ❌ You failed the task. The puzzle remains unsolved... for now.`);
          await pause();
          continue;
        }
        console.log(`\n  ✅ Correct! Task completed. A clue will be revealed next round.`);
        await pause();
      }
    }

    const action = buildAction(player.id, selected.kind, selected.targetId);
    if (action) {
      actions.push(action);
    }
  }

  return actions;
}

// ─── Task Challenges ───────────────────────────────────────────────

async function runTaskChallenge(task: import('../core/types.js').Task, playerName: string): Promise<boolean> {
  const ch = task.challenge;

  thinDivider();
  console.log(`  📜 TASK: ${task.name}`);
  console.log(`  ${task.description}`);
  thinDivider();
  console.log(`\n  ${ch.flavorText}\n`);
  console.log(`  🧩 ${ch.prompt}\n`);

  const MAX_ATTEMPTS = 3;
  let hintsUsed = 0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const remaining = MAX_ATTEMPTS - attempt;
    const answer = await textPrompt(`  ${playerName}, your answer (${attempt}/${MAX_ATTEMPTS})`);

    if (normalizeAnswer(answer) === normalizeAnswer(ch.answer)) {
      return true;
    }

    if (attempt < MAX_ATTEMPTS) {
      console.log(`\n  ❌ That's not right.`);

      // Offer a hint if available
      if (hintsUsed < ch.hints.length) {
        console.log(`  💡 Hint: ${ch.hints[hintsUsed]}`);
        hintsUsed++;
      }
      console.log(`  ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
      console.log('');
    }
  }

  return false;
}

function normalizeAnswer(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

function buildAction(playerId: string, kind: string, targetId?: string): GameAction | null {
  switch (kind) {
    case 'MOVE': return moveAction(playerId, targetId!);
    case 'DO_TASK': return doTaskAction(playerId, targetId!);
    case 'FOLLOW': return followAction(playerId, targetId!);
    case 'EMERGENCY_MEETING': return emergencyMeetingAction(playerId);
    case 'KILL': return killAction(playerId, targetId!);
    case 'SABOTAGE': return sabotageAction(playerId, targetId!);
    case 'PRETEND_TASK': return pretendTaskAction(playerId);
    default: return null;
  }
}

async function collectVotes(state: GameState): Promise<Record<string, string | null>> {
  const alive = alivePlayers(state);
  const votes: Record<string, string | null> = {};

  for (const voter of alive) {
    await handoff(voter.name);
    console.log(`\n  🗳️  ${voter.name}, who do you want to vote to eliminate?`);

    const candidates = alive.filter(p => p.id !== voter.id);
    const options = [...candidates.map(p => `Vote for ${p.name}`), 'Skip vote'];
    const choice = await menuPrompt(options, 'Cast your vote');

    if (choice < candidates.length) {
      votes[voter.id] = candidates[choice]!.id;
    } else {
      votes[voter.id] = null;
    }
  }

  return votes;
}
