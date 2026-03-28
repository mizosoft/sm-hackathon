export default class PromptBuilder {
  buildGameState(room) {
    const { state, world, players } = room;

    return {
      round: state.round,
      setting_name: world?.setting_name || '',
      backstory: world?.backstory || '',
      areas: world?.areas || [],
      players: players.map(p => ({
        id: p.id,
        name: p.name,
        role: p.role,
        status: p.status,
        location: p.location,
        is_ai: p.isAI,
      })),
      story_log: state.storyLog.slice(-10),
      chat_highlights: state.chatHighlights.slice(-10),
      deaths: state.deaths.map(d => ({
        victim: players.find(p => p.id === d.victim)?.name || d.victim,
        location: d.location,
        round: d.round,
        discovered: d.discovered,
      })),
      undiscovered_bodies: state.undiscoveredBodies.map(b => b.location),
      meetings_held: state.meetingsHeld,
      investigator_meetings_left: (() => {
        const inv = players.find(p => p.role === 'investigator');
        const left = inv?.emergencyMeetingsLeft;
        return left === -1 ? 'unlimited' : (left ?? 'unlimited');
      })(),
      rounds_since_last_meeting: state.roundsSinceLastMeeting,
      votes_history: state.votesHistory,
      tension_level: state.tensionLevel,
    };
  }

  buildWorldGenPrompt(playerCount) {
    return `Create a murder mystery setting for a chat game with ${playerCount} players. A murder already happened before the players arrive.

WRITING RULES — follow these strictly:
- Write in plain, everyday English. Short sentences. Clear words.
- No purple prose. No dramatic language.
- All text fields: 2-3 short sentences maximum.

STRUCTURE RULES:
- Exactly 5 areas, each connected to at least 1 other area
- One area must be a central hub connected to most others
- At least one area should feel isolated or dangerous
- The backstory murder should be vague — any player could plausibly be guilty
- opening_scene: what the players first see when they arrive — 2-3 short sentences

SETTING IDEAS (pick one or invent your own):
gothic manor, space station, arctic base, 1920s speakeasy, underwater research lab, desert monastery, cruise ship, mountain ski lodge, Victorian asylum, corporate office after hours`;
  }

  buildRoundPrompt(room) {
    const gameState = this.buildGameState(room);
    const alivePlayers = room.players.filter(p => p.status === 'alive');
    const killer = room.players.find(p => p.role === 'killer' && p.status === 'alive');

    const playerContext = alivePlayers.map(p => {
      const currentArea = room.world.areas.find(a => a.name === p.location);
      const reachable = currentArea?.connected_to || [];

      return {
        id: p.id,
        name: p.name,
        role: p.role,
        location: p.location,
        reachable_areas: reachable,
        clues_held: p.clues.slice(-3),
      };
    });

    return `You are narrating a murder mystery text game. Write like a person sending short text messages — simple and direct.

WRITING RULES — follow these strictly:
- Short sentences. Plain words. No complex vocabulary.
- Maximum 2-3 sentences for story_event.
- Maximum 1 sentence for private_info and clues.
- Do NOT use "tendrils", "suffocating", "palpable dread" or similar dramatic words.
- Write like: "The lights flicker. Something moved in the hallway." Not: "An oppressive darkness descends."

SETTING: ${gameState.setting_name}
${room.world.setting_description}

BACKSTORY: ${gameState.backstory}

AREAS: ${JSON.stringify(room.world.areas)}

GAME STATE:
${JSON.stringify({
  round: gameState.round,
  tension_level: gameState.tension_level,
  rounds_since_last_meeting: gameState.rounds_since_last_meeting,
  deaths: gameState.deaths,
  undiscovered_bodies: gameState.undiscovered_bodies,
  story_log: gameState.story_log.slice(-5),
  chat_highlights: gameState.chat_highlights.slice(-5),
})}

PLAYERS:
${JSON.stringify(playerContext)}

RULES FOR CHOICES:
- Each alive player gets exactly 3 choices
- Types: "move" (go to a connected area), "interact" (examine something nearby), "hide" (stay put quietly), "attack" (killer only)
- The killer ALWAYS gets "attack" as one of their 3 choices, regardless of who is nearby
- Every other player's 3 choices must include at least one "hide" option
- private_info: REQUIRED for every player — one short sentence of what THIS specific player notices, from their own angle. Each player's observation must be different from every other player's. Make it personal to them (their job, their concern, their suspicion). Never repeat the same observation across players. Never return null.
- clue: a small piece of evidence (give sparingly — at most 1-2 per round total, null for most)
- Do not reveal the killer's identity

ROLE-BASED CHOICE BALANCE — tailor choices to each role's strategy:
- killer: 1x "attack" (always) + 1x "move" toward a player or secluded area for opportunity + 1x "hide"/"interact" as a plausible cover action. Choices should feel like a normal person but create opportunities.
- investigator: 1x "move" toward a suspicious area, recent death site, or where the killer was last seen + 1x "interact" that could uncover evidence (examine something, check a door, look for traces) + 1x "hide" as fallback. Investigator is more likely to receive a clue this round.
- innocent: 1x "move" to a new area (exploration, safety, finding others) + 1x "interact" with something in their environment + 1x "hide" (safest option). Choices should feel natural for someone who doesn't know who the killer is.`;
  }

  buildResolutionPrompt(room, choices) {
    const gameState = this.buildGameState(room);
    const alivePlayers = room.players.filter(p => p.status === 'alive');

    const choicesWithContext = Object.entries(choices).map(([playerId, choice]) => {
      const player = room.players.find(p => p.id === playerId);
      return {
        player_id: playerId,
        player_name: player?.name,
        current_location: player?.location,
        choice_text: choice?.text,
        choice_type: choice?.type,
      };
    });

    const positions = alivePlayers.map(p => ({
      player_id: p.id,
      name: p.name,
      location: p.location,
    }));

    return `Resolve this round of the murder mystery. Write short, plain sentences.

WRITING RULES:
- public_narration: 2-3 short sentences describing atmosphere and events — DO NOT mention what any specific player chose to do or where they moved. Only describe what everyone as a group could notice (sounds, lights, atmosphere, discovered things).
- private_narrations: 1 plain sentence per player describing only what that specific player personally experienced or witnessed during the round.
- Write like you're describing what happened, not writing fiction.

SETTING: ${gameState.setting_name}
AREAS: ${JSON.stringify(room.world.areas)}

CURRENT POSITIONS:
${JSON.stringify(positions)}

PLAYER CHOICES:
${JSON.stringify(choicesWithContext)}

UNDISCOVERED BODIES AT: ${JSON.stringify(gameState.undiscovered_bodies)}

RESOLUTION RULES:
- Move each player to their chosen destination (only "move" type actually changes location)
- A kill only happens if the killer chose "attack" AND ends up alone with exactly 1 other alive player
- If a living player ends up where an undiscovered body is, they discover it
- clues_distributed: give out 0-1 clues total (null for most players)`;
  }

  buildAIDiscussionPrompt(aiPlayer, room) {
    const recentChat = room.state.chatHighlights.slice(-8);
    const deaths = room.state.deaths.map(d => {
      const victim = room.players.find(p => p.id === d.victim);
      return `${victim?.name || 'Unknown'} died in ${d.location} (round ${d.round})`;
    });

    return `You are playing as ${aiPlayer.name} in a murder mystery discussion. Write 1-2 short chat messages as your character.

YOUR SECRET ROLE: ${aiPlayer.role}
YOUR LOCATION: ${aiPlayer.location}
YOUR CLUES: ${aiPlayer.clues.slice(-3).join('; ') || 'none'}

RECENT EVENTS:
${room.state.storyLog.slice(-4).join('\n') || 'none'}

DISCUSSION SO FAR:
${recentChat.join('\n') || 'none'}

DEATHS:
${deaths.join('\n') || 'none'}

WRITING RULES:
- Write like you're texting. Short. Casual. Direct.
- No long speeches. 1-2 sentences each message.
- killer: act normal, blame others subtly, don't reveal yourself
- investigator: share what you've noticed, ask pointed questions
- innocent: say what you've seen, express concern, point fingers

Write 1-2 short messages. Do NOT say your role out loud.`;
  }
}
