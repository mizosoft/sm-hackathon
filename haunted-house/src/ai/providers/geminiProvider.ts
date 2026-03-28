/** Gemini provider — Google AI integration. */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ClueGenerator, ClueInput, ClueOutput } from '../contracts/ClueGenerator.js';
import type { GhostStoryGenerator, GhostStoryInput, GhostStoryOutput } from '../contracts/GhostStoryGenerator.js';
import type { TaskGenerator, TaskInput, TaskOutput } from '../contracts/TaskGenerator.js';
import { buildCluePrompt } from '../prompts/cluePrompt.js';
import { buildGhostStoryPrompt } from '../prompts/ghostStoryPrompt.js';
import { buildTaskPrompt } from '../prompts/taskPrompt.js';
import { mapClueResponse } from '../mappers/clueMapper.js';
import { mapGhostStoryResponse } from '../mappers/ghostStoryMapper.js';
import { mapTaskResponse } from '../mappers/taskMapper.js';
import type { AIGatewayRequest } from '../contracts/AIGateway.js';

function createGeminiClient(apiKey: string, model: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model });
}

async function geminiComplete(
  apiKey: string,
  model: string,
  req: AIGatewayRequest,
): Promise<string> {
  const client = createGeminiClient(apiKey, model);
  const prompt = `${req.systemPrompt}\n\n${req.userPrompt}`;
  const result = await client.generateContent(prompt);
  const response = result.response;
  return response.text();
}

export function createGeminiClueGenerator(apiKey: string, model: string): ClueGenerator {
  return {
    async generate(input: ClueInput): Promise<ClueOutput> {
      const prompt = buildCluePrompt(input);
      const text = await geminiComplete(apiKey, model, prompt);
      return mapClueResponse(text);
    },
  };
}

export function createGeminiGhostStoryGenerator(apiKey: string, model: string): GhostStoryGenerator {
  return {
    async generate(input: GhostStoryInput): Promise<GhostStoryOutput> {
      const prompt = buildGhostStoryPrompt(input);
      const text = await geminiComplete(apiKey, model, prompt);
      return mapGhostStoryResponse(text);
    },
  };
}

export function createGeminiTaskGenerator(apiKey: string, model: string): TaskGenerator {
  return {
    async generate(input: TaskInput): Promise<TaskOutput> {
      const prompt = buildTaskPrompt(input);
      const text = await geminiComplete(apiKey, model, prompt);
      return mapTaskResponse(text);
    },
  };
}
