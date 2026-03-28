/** Application entry point. */

import 'dotenv/config';
import { setupGame } from './core/setupGame.js';
import type { GameContext } from './core/gameContext.js';
import { gameLoop } from './cli/gameLoop.js';
import { textPrompt } from './cli/prompt.js';
import { header, clearScreen } from './cli/screen.js';
import { createConsoleLogger } from './infra/logger.js';
import { createDefaultRandom } from './infra/random.js';
import { createFallbackClueGenerator, createFallbackGhostStoryGenerator, createFallbackTaskGenerator } from './ai/providers/fallbackProvider.js';
import { createOpenAIClueGenerator, createOpenAIGhostStoryGenerator, createOpenAITaskGenerator } from './ai/providers/openaiProvider.js';
import { createGeminiClueGenerator, createGeminiGhostStoryGenerator, createGeminiTaskGenerator } from './ai/providers/geminiProvider.js';
import { MIN_PLAYERS, MAX_PLAYERS } from './core/constants.js';
import { loadEnv } from './infra/env.js';

function buildContext(): GameContext {
  const env = loadEnv();
  const logger = createConsoleLogger();
  const rng = createDefaultRandom();

  if (env.aiProvider === 'gemini' && env.geminiApiKey) {
    logger.info(`Using Gemini provider (model: ${env.geminiModel})`);
    return {
      clueGenerator: createGeminiClueGenerator(env.geminiApiKey, env.geminiModel),
      ghostStoryGenerator: createGeminiGhostStoryGenerator(env.geminiApiKey, env.geminiModel),
      taskGenerator: createGeminiTaskGenerator(env.geminiApiKey, env.geminiModel),
      logger,
      rng,
    };
  }

  if (env.aiProvider === 'openai' && env.openaiApiKey) {
    logger.info(`Using OpenAI provider (model: ${env.openaiModel})`);
    return {
      clueGenerator: createOpenAIClueGenerator(env.openaiApiKey, env.openaiModel),
      ghostStoryGenerator: createOpenAIGhostStoryGenerator(env.openaiApiKey, env.openaiModel),
      taskGenerator: createOpenAITaskGenerator(env.openaiApiKey, env.openaiModel),
      logger,
      rng,
    };
  }

  if (env.aiProvider === 'gemini' && !env.geminiApiKey) {
    logger.info('AI_PROVIDER=gemini but no GEMINI_API_KEY set. Falling back to local templates.');
  } else if (env.aiProvider === 'openai' && !env.openaiApiKey) {
    logger.info('AI_PROVIDER=openai but no OPENAI_API_KEY set. Falling back to local templates.');
  } else {
    logger.info(`Using ${env.aiProvider} AI provider.`);
  }

  return {
    clueGenerator: createFallbackClueGenerator(rng.next.bind(rng)),
    ghostStoryGenerator: createFallbackGhostStoryGenerator(),
    taskGenerator: createFallbackTaskGenerator(rng.next.bind(rng)),
    logger,
    rng,
  };
}

async function main(): Promise<void> {
  clearScreen();
  header('HAUNTED HOUSE \u2014 Setup');

  // Collect player names
  const names: string[] = [];
  console.log(`  Enter ${MIN_PLAYERS}-${MAX_PLAYERS} player names (empty line to finish):\n`);

  while (names.length < MAX_PLAYERS) {
    const name = await textPrompt(`  Player ${names.length + 1}`);
    if (!name) {
      if (names.length >= MIN_PLAYERS) break;
      console.log(`  Need at least ${MIN_PLAYERS} players.`);
      continue;
    }
    names.push(name);
  }

  const ctx = buildContext();
  const state = await setupGame(names, ctx);
  await gameLoop(state, ctx);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
