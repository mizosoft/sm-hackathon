/** Task generator contract. */

export interface TaskInput {
  roomName: string;
  category: string;
  playerName: string;
}

export interface TaskChallengeOutput {
  type: 'riddle' | 'word-puzzle' | 'sequence' | 'choice' | 'unscramble';
  prompt: string;
  answer: string;
  hints: string[];
  flavorText: string;
}

export interface TaskOutput {
  name: string;
  description: string;
  challenge: TaskChallengeOutput;
}

export interface TaskGenerator {
  generate(input: TaskInput): Promise<TaskOutput>;
}
