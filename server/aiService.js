import { GoogleGenAI } from '@google/genai';
import PromptBuilder from './promptBuilder.js';

const WORLD_SCHEMA = {
  type: 'object',
  properties: {
    setting_name: { type: 'string' },
    setting_description: { type: 'string' },
    backstory: { type: 'string' },
    areas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          connected_to: { type: 'array', items: { type: 'string' } },
        },
        required: ['name', 'description', 'connected_to'],
      },
    },
    opening_scene: { type: 'string' },
  },
  required: ['setting_name', 'setting_description', 'backstory', 'areas', 'opening_scene'],
};

const ROUND_SCHEMA = {
  type: 'object',
  properties: {
    story_event: { type: 'string' },
    player_data: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          player_id: { type: 'string' },
          choices: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                text: { type: 'string' },
                type: { type: 'string' },
              },
              required: ['id', 'text', 'type'],
            },
          },
          private_info: { type: 'string' },
          clue: { type: 'string' },
        },
        required: ['player_id', 'choices'],
      },
    },
    tension_level: { type: 'integer' },
  },
  required: ['story_event', 'player_data', 'tension_level'],
};

const RESOLUTION_SCHEMA = {
  type: 'object',
  properties: {
    new_positions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          player_id: { type: 'string' },
          area: { type: 'string' },
        },
        required: ['player_id', 'area'],
      },
    },
    deaths: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          victim_id: { type: 'string' },
          location: { type: 'string' },
        },
        required: ['victim_id', 'location'],
      },
    },
    public_narration: { type: 'string' },
    private_narrations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          player_id: { type: 'string' },
          narration: { type: 'string' },
        },
        required: ['player_id', 'narration'],
      },
    },
    clues_distributed: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          player_id: { type: 'string' },
          clue: { type: 'string' },
        },
        required: ['player_id', 'clue'],
      },
    },
  },
  required: ['new_positions', 'deaths', 'public_narration'],
};

const DISCUSSION_SCHEMA = {
  type: 'object',
  properties: {
    messages: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['messages'],
};

export default class AIService {
  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    this.model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.promptBuilder = new PromptBuilder();
  }

  async _generate(prompt, schema, retries = 1) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await Promise.race([
          this.ai.models.generateContent({
            model: this.model,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: schema,
            },
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('AI request timeout')), 45000)
          ),
        ]);

        const text = result.text;
        return JSON.parse(text);
      } catch (err) {
        console.error(`AI attempt ${attempt + 1} failed:`, err.message);
        if (attempt === retries) throw err;
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  async generateWorld(playerCount) {
    const prompt = this.promptBuilder.buildWorldGenPrompt(playerCount);
    return this._generate(prompt, WORLD_SCHEMA);
  }

  async generateRound(room) {
    const prompt = this.promptBuilder.buildRoundPrompt(room);
    return this._generate(prompt, ROUND_SCHEMA);
  }

  async resolveRound(room, choices) {
    const prompt = this.promptBuilder.buildResolutionPrompt(room, choices);
    return this._generate(prompt, RESOLUTION_SCHEMA);
  }

  async generateDiscussionMessages(aiPlayer, room) {
    const prompt = this.promptBuilder.buildAIDiscussionPrompt(aiPlayer, room);
    const result = await this._generate(prompt, DISCUSSION_SCHEMA);
    return result?.messages || [];
  }
}
