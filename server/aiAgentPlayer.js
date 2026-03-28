/**
 * AI Agent Player — makes in-game decisions for AI-controlled players.
 * Uses heuristics for choices/votes (fast), Gemini for discussion messages (quality).
 */
export default class AIAgentPlayer {
  constructor(aiService) {
    this.aiService = aiService;
  }

  /**
   * Pick one of 3 choices for an AI player.
   * Returns the chosen choice object.
   */
  pickChoice(aiPlayer, choices) {
    if (!choices || choices.length === 0) return null;

    const role = aiPlayer.role;

    // Killer: prefer attack if available
    if (role === 'killer') {
      const attack = choices.find(c => c.type === 'attack');
      if (attack) return attack;

      // Move toward other players (prefer "move" type to spread out and hunt)
      const moveChoices = choices.filter(c => c.type === 'move');
      if (moveChoices.length > 0) {
        return moveChoices[Math.floor(Math.random() * moveChoices.length)];
      }
    }

    // Investigator: prefer interact/hide to gather info
    if (role === 'investigator') {
      const interact = choices.find(c => c.type === 'interact');
      if (interact && Math.random() > 0.4) return interact;
    }

    // Default: weighted random (avoid hide unless tension is high)
    const weighted = choices.map(c => ({
      choice: c,
      weight: c.type === 'hide' ? 0.5 : c.type === 'interact' ? 1.2 : 1.0,
    }));

    const total = weighted.reduce((s, w) => s + w.weight, 0);
    let rand = Math.random() * total;
    for (const w of weighted) {
      rand -= w.weight;
      if (rand <= 0) return w.choice;
    }

    return choices[0];
  }

  /**
   * Pick a vote target for an AI player.
   */
  pickVote(aiPlayer, candidates, gameState) {
    const role = aiPlayer.role;

    // Killer: vote for the investigator if known, otherwise random innocent
    if (role === 'killer') {
      // Try to vote for someone with the most clues (most dangerous)
      // We don't have full info here, so just pick randomly (not self)
      const others = candidates.filter(c => c.id !== aiPlayer.id);
      if (others.length > 0) {
        return others[Math.floor(Math.random() * others.length)].id;
      }
      return 'skip';
    }

    // Investigator / Innocent: use clues to guess
    // If clues mention a name, vote for them
    const clueText = aiPlayer.clues.join(' ').toLowerCase();
    for (const candidate of candidates) {
      if (candidate.id === aiPlayer.id) continue;
      if (clueText.includes(candidate.name.toLowerCase())) {
        return candidate.id;
      }
    }

    // Check game history for suspicious votes
    const suspectCounts = {};
    for (const voteRound of gameState.votesHistory || []) {
      for (const targetId of Object.values(voteRound.votes || {})) {
        if (typeof targetId === 'string' && targetId !== 'skip') {
          suspectCounts[targetId] = (suspectCounts[targetId] || 0) + 1;
        }
      }
    }

    // Vote for most voted player (crowd wisdom)
    const others = candidates.filter(c => c.id !== aiPlayer.id);
    if (others.length === 0) return 'skip';

    others.sort((a, b) => (suspectCounts[b.id] || 0) - (suspectCounts[a.id] || 0));
    const topSuspect = others[0];

    // 30% chance to skip (indecision)
    if (Math.random() < 0.3) return 'skip';

    return topSuspect.id;
  }

  /**
   * Generate discussion messages for AI player using Gemini.
   * Returns array of message strings.
   */
  async generateDiscussionMessages(aiPlayer, room) {
    try {
      const messages = await this.aiService.generateDiscussionMessages(aiPlayer, room);
      return messages.filter(m => m && m.trim().length > 0).slice(0, 2);
    } catch (err) {
      console.error(`AI discussion generation failed for ${aiPlayer.name}:`, err.message);
      return this._fallbackDiscussion(aiPlayer);
    }
  }

  _fallbackDiscussion(aiPlayer) {
    const killerLines = [
      "Has anyone checked the other areas? Something feels off.",
      "I don't know who to trust right now.",
      "We should focus — the killer could be anyone.",
    ];
    const innocentLines = [
      "I heard something strange earlier...",
      "We need to be more careful about where we're going.",
      "Something doesn't add up. Let's think this through.",
    ];
    const investigatorLines = [
      "I've noticed some suspicious movement. Pay attention.",
      "The evidence points somewhere specific. Think carefully.",
      "We can't afford another wrong vote.",
    ];

    const lines = aiPlayer.role === 'killer' ? killerLines
      : aiPlayer.role === 'investigator' ? investigatorLines
      : innocentLines;

    return [lines[Math.floor(Math.random() * lines.length)]];
  }
}
