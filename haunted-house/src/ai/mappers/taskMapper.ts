/** Map raw AI output to TaskOutput. */

import type { TaskOutput, TaskChallengeOutput } from '../contracts/TaskGenerator.js';

const DEFAULT_CHALLENGE: TaskChallengeOutput = {
  type: 'riddle',
  prompt: 'A voice whispers: "I have cities but no houses. I have mountains but no trees. I have water but no fish. What am I?"',
  answer: 'map',
  hints: ['You use it to navigate', 'It shows the world on paper'],
  flavorText: 'An eerie whisper echoes through the room...',
};

export function mapTaskResponse(raw: string): TaskOutput {
  try {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    const challenge = parsed.challenge;

    return {
      name: String(parsed.name ?? 'Mysterious Errand'),
      description: String(parsed.description ?? 'Do something mysterious.'),
      challenge: challenge ? {
        type: challenge.type ?? 'riddle',
        prompt: String(challenge.prompt ?? DEFAULT_CHALLENGE.prompt),
        answer: String(challenge.answer ?? DEFAULT_CHALLENGE.answer).toLowerCase().trim(),
        hints: Array.isArray(challenge.hints) ? challenge.hints.map(String) : DEFAULT_CHALLENGE.hints,
        flavorText: String(challenge.flavorText ?? DEFAULT_CHALLENGE.flavorText),
      } : DEFAULT_CHALLENGE,
    };
  } catch {
    return {
      name: 'Mysterious Errand',
      description: 'Do something mysterious.',
      challenge: DEFAULT_CHALLENGE,
    };
  }
}
