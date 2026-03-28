/** Environment variable loading. */

export interface EnvConfig {
  aiProvider: 'mock' | 'fallback' | 'openai' | 'gemini';
  openaiApiKey?: string;
  openaiModel: string;
  geminiApiKey?: string;
  geminiModel: string;
}

export function loadEnv(): EnvConfig {
  return {
    aiProvider: (process.env['AI_PROVIDER'] as EnvConfig['aiProvider']) ?? 'fallback',
    openaiApiKey: process.env['OPENAI_API_KEY'],
    openaiModel: process.env['OPENAI_MODEL'] ?? 'gpt-4o-mini',
    geminiApiKey: process.env['GEMINI_API_KEY'],
    geminiModel: process.env['GEMINI_MODEL'] ?? 'gemini-2.0-flash',
  };
}
