/** CLI rendering. */

import type { GameState, Player, RoundSummary } from '../core/types.js';
import { alivePlayers } from '../domain/player/playerSelectors.js';
import { cluesForPlayer } from '../domain/clue/clueSelectors.js';
import { escapeProgress } from '../domain/task/taskSelectors.js';
import { tasksInRoom } from '../domain/task/taskSelectors.js';
import { connectedRooms } from '../domain/room/roomSelectors.js';
import { divider, thinDivider, banner } from './screen.js';

// ─── Game intro ────────────────────────────────────────────────────

export function renderIntro(state: GameState): void {
  banner('🏚️  THE HAUNTED HOUSE  🏚️');

  console.log('  ┌──────────────────────────────────────────────┐');
  console.log('  │  HOW TO PLAY                                 │');
  console.log('  │                                              │');
  console.log('  │  You are trapped in a haunted house.         │');
  console.log('  │  Complete tasks to unlock the escape.        │');
  console.log('  │  But one of you is POSSESSED by a ghost      │');
  console.log('  │  and is secretly working against the group.  │');
  console.log('  │                                              │');
  console.log('  │  🔧 Complete tasks  → progresses escape      │');
  console.log('  │  🔍 Solve tasks     → earn clues about the   │');
  console.log('  │     possessed (delivered next round)         │');
  console.log('  │  🗳️  Call meetings   → vote to eliminate      │');
  console.log('  │     suspects                                 │');
  console.log('  │  🚶 Move each round → explore rooms          │');
  console.log('  │                                              │');
  console.log('  │  Innocents win by escaping OR eliminating    │');
  console.log('  │  the possessed. The ghost wins if time runs  │');
  console.log('  │  out or too few innocents remain.            │');
  console.log('  └──────────────────────────────────────────────┘');

  const progress = escapeProgress(state);
  console.log(`\n  📊 Tasks to escape: ${progress.required}`);
  console.log(`  🔄 Max rounds: ${state.maxRounds}`);
  console.log(`  👥 Players: ${state.players.map(p => p.name).join(', ')}`);
  thinDivider();
  console.log(`\n  ${state.ghost.backstory}\n`);
}

// ─── Role reveal (shown once at start, privately) ──────────────────

export function renderRoleReveal(state: GameState, player: Player): void {
  console.log('');
  thinDivider();
  if (player.role === 'possessed') {
    console.log('  ☠️  YOU ARE POSSESSED');
    console.log(`  The ghost "${state.ghost.name}" has taken hold of you.`);
    console.log(`  Motive: ${state.ghost.motive}`);
    console.log('');
    console.log('  Your goal: Sabotage tasks, pretend to work,');
    console.log('  and eliminate innocents without being caught.');
    console.log('  You can KILL, SABOTAGE rooms, and PRETEND to do tasks.');
  } else {
    console.log('  ✨ YOU ARE INNOCENT');
    console.log('  Something evil lurks among your group.');
    console.log('');
    console.log('  Your goal: Complete tasks to escape the house.');
    console.log('  Earn clues by solving tasks — they hint at who is possessed.');
    console.log('  Call a meeting if you think you know who it is.');
  }
  console.log(`\n  🏷️  Your traits: ${player.traits.join(', ')}`);
  thinDivider();
}

// ─── Round narration (shown to all before individual turns) ────────

export function renderRoundNarration(state: GameState): void {
  const round = state.round;
  const progress = escapeProgress(state);
  const alive = alivePlayers(state);
  const ghosts = state.players.filter(p => !p.alive).length;

  banner(`⏳ ROUND ${round}`);

  // Atmospheric opener based on round progression
  const maxRounds = state.maxRounds;
  const pct = round / maxRounds;
  if (pct < 0.3) {
    console.log('  The house groans quietly. Everything still feels... uncertain.\n');
  } else if (pct < 0.6) {
    console.log('  Shadows lengthen. The air grows thick with unease.\n');
  } else if (pct < 0.85) {
    console.log('  Time is running out. The ghost grows bolder.\n');
  } else {
    console.log('  The walls seem to close in. You must act NOW.\n');
  }

  // Quick status bar
  console.log(`  📊 Escape progress:  ${'█'.repeat(progress.completed)}${'░'.repeat(Math.max(0, progress.required - progress.completed))} ${progress.completed}/${progress.required}`);
  console.log(`  👥 Alive: ${alive.length}/${state.players.length}${ghosts > 0 ? `  (💀 ${ghosts} dead)` : ''}`);
  console.log(`  🔄 Round ${round} of ${maxRounds}`);
  console.log('');
}

// ─── Previous-round recap (narrative summary) ──────────────────────

export function renderPreviousRoundRecap(state: GameState): void {
  const summaryIdx = state.roundSummaries.length - 1;
  const summary = state.roundSummaries[summaryIdx];
  if (!summary || summary.round < 1) return;

  thinDivider();
  console.log(`  📜 WHAT HAPPENED LAST ROUND (Round ${summary.round}):`);
  console.log('');

  // Group events by type for clearer narration
  const movements: string[] = [];
  const tasks: string[] = [];
  const clueDeliveries: string[] = [];
  const dangerous: string[] = [];
  const atmosphere: string[] = [];
  const other: string[] = [];

  for (const e of summary.publicEvents) {
    if (e.includes('moved to') || e.includes('prepares to move')) {
      movements.push(e);
    } else if (e.includes('completed') || e.includes('worked on') || e.includes('sabotaged')) {
      tasks.push(e);
    } else if (e.includes('clue') || e.includes('investigated')) {
      clueDeliveries.push(e);
    } else if (e.includes('found dead') || e.includes('Kill') || e.includes('dead body') || e.includes('Meeting') || e.includes('meeting')) {
      dangerous.push(e);
    } else if (e.startsWith('🕯️')) {
      atmosphere.push(e);
    } else {
      other.push(e);
    }
  }

  if (dangerous.length > 0) {
    console.log('  ⚠️  CRITICAL:');
    for (const e of dangerous) console.log(`     ${e}`);
    console.log('');
  }
  if (tasks.length > 0) {
    console.log('  🔧 Activity:');
    for (const e of tasks) console.log(`     ${e}`);
    console.log('');
  }
  if (movements.length > 0) {
    console.log('  🚶 Movement:');
    for (const e of movements) console.log(`     ${e}`);
    console.log('');
  }
  if (clueDeliveries.length > 0) {
    console.log('  🔍 Clues:');
    for (const e of clueDeliveries) console.log(`     ${e}`);
    console.log('');
  }
  if (atmosphere.length > 0) {
    for (const e of atmosphere) console.log(`  ${e}`);
    console.log('');
  }
  for (const e of other) {
    console.log(`     ${e}`);
  }

  thinDivider();
}

// ─── Player turn view ──────────────────────────────────────────────

export function renderPlayerView(state: GameState, player: Player): void {
  const room = state.rooms.find(r => r.id === player.roomId);
  const roommates = alivePlayers(state).filter(p => p.roomId === player.roomId && p.id !== player.id);
  const progress = escapeProgress(state);
  const tasks = tasksInRoom(state, player.roomId);
  const exits = connectedRooms(state, player.roomId);

  // Header
  console.log(`\n  ╔══════════════════════════════════════════════╗`);
  console.log(`  ║  👤 ${player.name.padEnd(20)} ${player.role === 'possessed' ? '☠️  POSSESSED' : '✨ INNOCENT'}        ║`);
  console.log(`  ╚══════════════════════════════════════════════╝`);

  // Room narration
  console.log(`\n  📍 You are in the ${room?.name ?? 'Unknown Room'}.`);
  console.log(`     ${room?.description ?? ''}`);

  if (player.pendingMove) {
    const dest = state.rooms.find(r => r.id === player.pendingMove);
    console.log(`     🚶 You are about to move to ${dest?.name ?? 'somewhere'}...`);
  }

  // Who's here
  console.log('');
  if (roommates.length > 0) {
    console.log(`  👥 With you: ${roommates.map(p => p.name).join(', ')}`);
  } else {
    console.log(`  👥 You are alone in this room.`);
  }

  // What's available
  if (tasks.length > 0) {
    console.log(`  🔧 Tasks here: ${tasks.map(t => `"${t.name}"`).join(', ')}`);
  }

  // Exits
  console.log(`  🚪 Exits: ${exits.map(r => r.name).join(', ')}`);

  // Status
  console.log('');
  thinDivider();
  console.log(`  📊 Escape: ${'█'.repeat(progress.completed)}${'░'.repeat(Math.max(0, progress.required - progress.completed))} ${progress.completed}/${progress.required}  │  🔄 Round ${state.round}/${state.maxRounds}`);
  console.log(`  🏷️  Traits: ${player.traits.join(', ') || 'none'}`);

  // Clues
  const clues = cluesForPlayer(state, player.id);
  if (clues.length > 0) {
    thinDivider();
    console.log(`  🔍 YOUR CLUES (${clues.length} total):`);
    for (const c of clues.slice(-5)) {
      console.log(`     • ${c.text}`);
    }
    if (clues.length > 5) {
      console.log(`     ... and ${clues.length - 5} older clues.`);
    }
  }

  // Private messages from this round
  const lastSummary = state.roundSummaries[state.roundSummaries.length - 1];
  if (lastSummary) {
    const msgs = lastSummary.privateMessages[player.id];
    if (msgs && msgs.length > 0) {
      thinDivider();
      console.log(`  🔒 PRIVATE NOTES (only you see this):`);
      for (const m of msgs) {
        console.log(`     ${m}`);
      }
    }
  }

  thinDivider();
  console.log('');
}

// ─── Round summary (public) ────────────────────────────────────────

export function renderRoundSummary(summary: RoundSummary): void {
  divider();
  console.log(`  📜 Round ${summary.round} Summary`);
  for (const event of summary.publicEvents) {
    console.log(`     • ${event}`);
  }
  divider();
}

export function renderPrivateMessages(summary: RoundSummary, playerId: string): void {
  const msgs = summary.privateMessages[playerId];
  if (msgs && msgs.length > 0) {
    console.log(`  🔒 Private:`);
    for (const m of msgs) {
      console.log(`     - ${m}`);
    }
  }
}

// ─── Win screen ────────────────────────────────────────────────────

export function renderWinScreen(state: GameState): void {
  console.log('');
  switch (state.winner) {
    case 'innocents-escape':
      banner('🎉  THE INNOCENTS HAVE ESCAPED!  🎉');
      console.log('  Against all odds, you completed the tasks and');
      console.log('  fled the haunted house before the ghost could');
      console.log('  consume you all.\n');
      break;
    case 'possessed-eliminated':
      banner('🎉  THE INNOCENTS WIN!  🎉');
      console.log('  Through careful detective work and brave votes,');
      console.log('  you identified and eliminated the possessed.\n');
      break;
    case 'timer-expired':
      banner('💀  THE GHOST WINS  💀');
      console.log('  Time ran out. The haunted house has claimed you all.');
      console.log('  The ghost\'s power is now absolute.\n');
      break;
    case 'survivors-insufficient':
      banner('💀  THE GHOST WINS  💀');
      console.log('  Too few innocents remain. The survivors cannot');
      console.log('  muster the strength to escape.\n');
      break;
    default:
      console.log('  Game over.\n');
  }

  const possessed = state.players.find(p => p.id === state.possessedPlayerId);
  thinDivider();
  console.log(`  The possessed player was: ${possessed?.name ?? 'unknown'}`);
  console.log(`  Ghost: ${state.ghost.name}`);
  console.log(`  Motive: ${state.ghost.motive}`);
  console.log(`  Ghost Traits: ${state.ghost.traits.join(', ')}`);
  console.log(`  ${possessed?.name ?? 'unknown'}'s Traits: ${possessed?.traits.join(', ') ?? 'N/A'}`);

  // Show final stats
  thinDivider();
  console.log(`  📊 Final escape progress: ${state.escapeTasksCompleted}/${state.escapeTasksRequired}`);
  console.log(`  🔄 Rounds played: ${state.round}`);
  console.log(`  👥 Survivors: ${state.players.filter(p => p.alive).map(p => p.name).join(', ') || 'none'}`);
  console.log(`  💀 Eliminated: ${state.players.filter(p => !p.alive).map(p => p.name).join(', ') || 'none'}`);
  console.log(`  🔍 Clues found: ${state.clues.length}`);
  divider();
}

// ─── Meeting ───────────────────────────────────────────────────────

export function renderMeetingHeader(trigger: string, callerName: string): void {
  banner('🔔  EMERGENCY MEETING  🔔');
  if (trigger === 'body-discovery') {
    console.log(`  ${callerName} discovered a dead body!`);
  } else {
    console.log(`  ${callerName} called an emergency meeting!`);
  }
  console.log('  Everyone gathers to discuss. Who is the possessed?\n');
  thinDivider();
  console.log('  💡 TIP: Share what you\'ve seen and any clues you found.');
  console.log('  Be careful — the possessed player will try to mislead you!');
  thinDivider();
}
