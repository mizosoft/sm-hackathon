/** CLI screen utilities. */

import * as readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

export function clearScreen(): void {
  process.stdout.write('\x1Bc');
}

export function divider(): void {
  console.log('\n' + '═'.repeat(56) + '\n');
}

export function thinDivider(): void {
  console.log('  ' + '─'.repeat(48));
}

export function header(text: string): void {
  divider();
  console.log(`  🏚️  ${text}`);
  divider();
}

export function banner(text: string): void {
  console.log('\n' + '╔' + '═'.repeat(54) + '╗');
  console.log('║' + text.padStart(Math.floor((54 + text.length) / 2)).padEnd(54) + '║');
  console.log('╚' + '═'.repeat(54) + '╝\n');
}

export async function pause(msg = '  Press ENTER to continue...'): Promise<void> {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  await rl.question(msg);
  rl.close();
}

export async function handoff(playerName: string): Promise<void> {
  clearScreen();
  console.log('\n\n');
  banner(`📱 PASS THE DEVICE TO: ${playerName}`);
  console.log('  Only you should be looking at the screen.\n');
  await pause();
  clearScreen();
}

/** Slow-print for dramatic narration. */
export async function narrate(lines: string[], delayMs = 40): Promise<void> {
  for (const line of lines) {
    for (let i = 0; i < line.length; i++) {
      process.stdout.write(line[i]!);
      await sleep(delayMs);
    }
    process.stdout.write('\n');
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
