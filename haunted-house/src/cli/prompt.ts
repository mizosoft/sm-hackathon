/** CLI prompt helpers. */

import * as readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

/** Show a numbered menu and return the chosen index. */
export async function menuPrompt(options: string[], label = 'Choose an action'): Promise<number> {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  console.log(`\n${label}:`);
  for (let i = 0; i < options.length; i++) {
    console.log(`  ${i + 1}. ${options[i]}`);
  }

  while (true) {
    const answer = await rl.question('\n> ');
    const num = parseInt(answer, 10);
    if (num >= 1 && num <= options.length) {
      rl.close();
      return num - 1;
    }
    console.log(`Please enter a number between 1 and ${options.length}.`);
  }
}

/** Ask for text input. */
export async function textPrompt(label: string): Promise<string> {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const answer = await rl.question(`${label}: `);
  rl.close();
  return answer.trim();
}

/** Ask a yes/no question. */
export async function confirmPrompt(label: string): Promise<boolean> {
  const answer = await textPrompt(`${label} (y/n)`);
  return answer.toLowerCase().startsWith('y');
}
