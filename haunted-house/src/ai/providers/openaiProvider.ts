/** OpenAI provider — real AI integration. */

import OpenAI from 'openai';
import type { AIGateway, AIGatewayRequest, AIGatewayResponse } from '../contracts/AIGateway.js';
import type { ClueGenerator, ClueInput, ClueOutput } from '../contracts/ClueGenerator.js';
import type { GhostStoryGenerator, GhostStoryInput, GhostStoryOutput } from '../contracts/GhostStoryGenerator.js';
import type { TaskGenerator, TaskInput, TaskOutput } from '../contracts/TaskGenerator.js';
import { buildCluePrompt } from '../prompts/cluePrompt.js';
import { buildGhostStoryPrompt } from '../prompts/ghostStoryPrompt.js';
import { buildTaskPrompt } from '../prompts/taskPrompt.js';
import { mapClueResponse } from '../mappers/clueMapper.js';
import { mapGhostStoryResponse } from '../mappers/ghostStoryMapper.js';
import { mapTaskResponse } from '../mappers/taskMapper.js';

export function createOpenAIGateway(apiKey: string, model: string): AIGateway {
  const client = new OpenAI({ apiKey });

  return {
    async complete(req: AIGatewayRequest): Promise<AIGatewayResponse> {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: req.systemPrompt },
          { role: 'user', content: req.userPrompt },
        ],
        temperature: req.temperature ?? 0.7,
        max_tokens: req.maxTokens ?? 200,
      });

      const text = response.choices[0]?.message?.content ?? '{}';
      return { text };
    },
  };
}

export function createOpenAIClueGenerator(apiKey: string, model: string): ClueGenerator {
  const gateway = createOpenAIGateway(apiKey, model);
  return {
    async generate(input: ClueInput): Promise<ClueOutput> {
      const prompt = buildCluePrompt(input);
      const response = await gateway.complete(prompt);
      return mapClueResponse(response.text);
    },
  };
}

export function createOpenAIGhostStoryGenerator(apiKey: string, model: string): GhostStoryGenerator {
  const gateway = createOpenAIGateway(apiKey, model);
  return {
    async generate(input: GhostStoryInput): Promise<GhostStoryOutput> {
      const prompt = buildGhostStoryPrompt(input);
      const response = await gateway.complete(prompt);
      return mapGhostStoryResponse(response.text);
    },
  };
}

export function createOpenAITaskGenerator(apiKey: string, model: string): TaskGenerator {
  const gateway = createOpenAIGateway(apiKey, model);
  return {
    async generate(input: TaskInput): Promise<TaskOutput> {
      const prompt = buildTaskPrompt(input);
      const response = await gateway.complete(prompt);
      return mapTaskResponse(response.text);
    },
  };
}
