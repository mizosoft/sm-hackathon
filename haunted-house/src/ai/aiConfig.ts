/** AI configuration. */

import { loadEnv } from '../infra/env.js';

export interface AIConfig {
  provider: 'mock' | 'fallback' | 'openai' | 'gemini';
  openaiModel: string;
  openaiApiKey?: string;
  geminiModel: string;
  geminiApiKey?: string;
}

export function getAIConfig(): AIConfig {
  const env = loadEnv();
  return {
    provider: env.aiProvider,
    openaiModel: env.openaiModel,
    openaiApiKey: env.openaiApiKey,
    geminiModel: env.geminiModel,
    geminiApiKey: env.geminiApiKey,
  };
}
