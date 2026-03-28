import { v4 as uuidv4 } from 'uuid';
import { assignRoles, checkWinCondition, tallyVotes } from './utils/gameRules.js';
import AIService from './aiService.js';
import AIAgentPlayer from './aiAgentPlayer.js';

class ChoiceCollector {
  constructor() {
    this.choices = {};
    this._resolve = null;
    this._done = false;
    this._timer = null;
    this._humanPlayers = [];
    this.promise = new Promise(res => { this._resolve = res; });
  }

  start(alivePlayers, timeout) {
    this._humanPlayers = alivePlayers.filter(p => !p.isAI);
    this._timer = setTimeout(() => this._finish(false), timeout);
    this._checkComplete();
    return this.promise;
  }

  submit(playerId, choice) {
    if (this._done) return;
    this.choices[playerId] = choice;
    this._checkComplete();
  }

  interrupt(reason, callerId) {
    if (this._done) return;
    clearTimeout(this._timer);
    this._done = true;
    this._resolve({ choices: this.choices, interrupted: true, reason, callerId });
  }

  _checkComplete() {
    if (this._done) return;
    if (this._humanPlayers.length === 0) {
      this._finish(false);
      return;
    }
    if (this._humanPlayers.every(p => this.choices[p.id] !== undefined)) {
      this._finish(false);
    }
  }

  _finish(interrupted) {
    if (this._done) return;
    this._done = true;
    if (this._timer) clearTimeout(this._timer);
    this._resolve({ choices: this.choices, interrupted });
  }
}

class VoteCollector {
  constructor() {
    this.votes = {};
    this._resolve = null;
    this._done = false;
    this._timer = null;
    this._humanVoters = [];
    this.promise = new Promise(res => { this._resolve = res; });
  }

  start(aliveVoters, timeout) {
    this._humanVoters = aliveVoters.filter(p => !p.isAI);
    this._timer = setTimeout(() => this._finish(), timeout);
    this._checkComplete();
    return this.promise;
  }

  submit(playerId, targetId) {
    if (this._done) return;
    this.votes[playerId] = targetId;
    this._checkComplete();
  }

  _checkComplete() {
    if (this._done) return;
    if (this._humanVoters.every(p => this.votes[p.id] !== undefined)) {
      this._finish();
    }
  }

  _finish() {
    if (this._done) return;
    this._done = true;
    if (this._timer) clearTimeout(this._timer);
    this._resolve({ votes: this.votes });
  }
}

export default class GameEngine {
  constructor(room, io) {
    this.room = room;
    this.io = io;
    this.aiService = new AIService();
    this.aiAgent = new AIAgentPlayer(this.aiService);
    this.running = false;
    this.currentChoiceCollector = null;
    this.currentVoteCollector = null;
    this.currentRoundPlayerData = null;
    this._skipDiscussion = null;
  }

  broadcast(event, data) {
    this.io.to(this.room.code).emit(event, data);
  }

  sendTo(player, event, data) {
    if (!player || player.isAI || !player.socketId) return;
    this.io.to(player.socketId).emit(event, data);
  }

  alive() {
    return this.room.players.filter(p => p.status === 'alive');
  }

  getPlayer(id) {
    return this.room.players.find(p => p.id === id);
  }

  getName(id) {
    return this.getPlayer(id)?.name || 'Unknown';
  }

  isAlive(id) {
    return this.getPlayer(id)?.status === 'alive';
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  msg(type, content, extra = {}) {
    return { id: uuidv4(), type, content, sender: 'narrator', visibility: 'public', ts: Date.now(), ...extra };
  }

  async start() {
    this.running = true;
    this.room.phase = 'playing';

    // Assign roles
    const withRoles = assignRoles(this.room.players);
    for (const rp of withRoles) {
      const p = this.getPlayer(rp.id);
      if (p) {
        p.role = rp.role;
        p.emergencyMeetingsLeft = rp.role === 'investigator' ? -1 : 1;
      }
    }

    // Set starting locations — everyone starts in the hub
    const areas = this.room.world.areas;
    const hub = areas.reduce((best, a) =>
      a.connected_to.length > (best?.connected_to.length || 0) ? a : best, areas[0]);
    for (const p of this.room.players) {
      p.location = hub.name;
    }

    // Notify each player of their role (private)
    for (const p of this.room.players) {
      if (!p.isAI) {
        this.sendTo(p, 'role_assigned', {
          role: p.role,
          emergencyMeetings: p.emergencyMeetingsLeft,
          playerId: p.id,
        });
      }
    }

    // Broadcast full player list with IDs (no roles)
    this.broadcast('game_started', {
      players: this.room.players.map(pl => ({
        id: pl.id,
        name: pl.name,
        isAI: pl.isAI,
        status: pl.status,
      })),
      world: this.room.world,
    });

    // Opening scene — wait long enough for players to read it before the round begins
    this.broadcast('chat_msg', this.msg('narrator', this.room.world.opening_scene));
    const readTime = Math.min(Math.max(this.room.world.opening_scene.length * 55 + 2000, 8000), 14000);
    await this.delay(readTime);

    // Main game loop
    while (this.running) {
      await this.playRound();
      if (!this.running) break;

      const win = checkWinCondition(this.room.players);
      if (win) {
        await this.endGame(win);
        return;
      }
    }
  }

  async playRound() {
    this.room.state.round++;
    this.room.state.roundsSinceLastMeeting++;

    // Tell clients we're back in the playing phase (important after a meeting ends)
    this.room.phase = 'playing';
    this.broadcast('phase_change', { phase: 'playing', round: this.room.state.round });

    // Show typing indicator while AI generates the round — reuse same ID so it gets replaced
    const roundMsgId = `round-${this.room.state.round}`;
    this.broadcast('chat_msg', {
      ...this.msg('typing_indicator', ''),
      id: roundMsgId,
    });

    let roundData;
    try {
      roundData = await this.aiService.generateRound(this.room);
    } catch (e) {
      console.error('Round gen failed, using fallback:', e.message);
      roundData = this._fallbackRound();
    }

    this.currentRoundPlayerData = roundData.player_data || [];
    if (roundData.tension_level) this.room.state.tensionLevel = roundData.tension_level;

    // Replace typing indicator with the actual story event (same ID)
    this.broadcast('chat_msg', {
      ...this.msg('narrator', roundData.story_event),
      id: roundMsgId,
    });
    // Wait for typewriter on clients before sending choices
    const typeTime = Math.min(roundData.story_event.length * 30 + 500, 3500);
    await this.delay(typeTime);

    // Send choices to all alive players
    const collector = new ChoiceCollector();
    this.currentChoiceCollector = collector;

    for (const p of this.alive()) {
      const pd = this.currentRoundPlayerData.find(d => d.player_id === p.id);
      if (!pd) continue;

      const privateInfo = pd.private_info && pd.private_info !== 'null' ? pd.private_info : null;
      const clueText = pd.clue && pd.clue !== 'null' ? pd.clue : null;

      if (privateInfo) {
        this.sendTo(p, 'chat_msg', {
          ...this.msg('private_info', privateInfo),
          visibility: 'private',
        });
      }
      if (clueText) {
        p.clues.push(clueText);
        this.sendTo(p, 'chat_msg', {
          ...this.msg('private_info', `[clue] ${clueText}`),
          visibility: 'private',
        });
      }

      if (p.isAI) {
        this._scheduleAIChoice(p, pd.choices, collector);
      } else {
        this.sendTo(p, 'chat_msg', {
          id: uuidv4(),
          type: 'choice',
          content: 'What do you do?',
          choices: pd.choices,
          sender: 'narrator',
          visibility: 'private',
          ts: Date.now(),
          roundId: this.room.state.round,
        });
      }
    }

    // Wait for choices (20s) or interruption
    const result = await collector.start(this.alive(), 20000);
    this.currentChoiceCollector = null;
    this.currentRoundPlayerData = null;

    if (result.interrupted) {
      // Deduct emergency meeting use (investigator = -1 = unlimited, never deduct)
      const caller = this.getPlayer(result.callerId);
      if (caller && caller.emergencyMeetingsLeft > 0) {
        caller.emergencyMeetingsLeft--;
        this.sendTo(caller, 'emergency_meetings_update', {
          remaining: caller.emergencyMeetingsLeft,
        });
      }
      await this.runMeeting('emergency', result.callerId);
      if (!this.running) return;

      // Check win after meeting
      const win = checkWinCondition(this.room.players);
      if (win) {
        await this.endGame(win);
        this.running = false;
      }
      return;
    }

    // Fill in auto-choices for players who didn't choose
    const choices = result.choices;
    for (const p of this.alive()) {
      if (!choices[p.id]) {
        const pd = (roundData.player_data || []).find(d => d.player_id === p.id);
        const hideChoice = pd?.choices?.find(c => c.type === 'hide') || pd?.choices?.[pd.choices.length - 1];
        if (hideChoice) {
          choices[p.id] = hideChoice;
          if (!p.isAI) {
            this.sendTo(p, 'chat_msg', {
              ...this.msg('player_action', "You didn't do anything."),
              sender: p.name,
              senderId: p.id,
              visibility: 'private',
            });
          }
        }
      }
    }

    // Show typing indicator while AI resolves the round
    const resultMsgId = `result-${this.room.state.round}`;
    this.broadcast('chat_msg', {
      ...this.msg('typing_indicator', ''),
      id: resultMsgId,
    });

    let resolved;
    try {
      resolved = await this.aiService.resolveRound(this.room, choices);
    } catch (e) {
      console.error('Round resolution failed, using fallback:', e.message);
      resolved = this._fallbackResolution(choices);
    }

    const validated = this._validate(resolved, choices);
    this._apply(validated);

    // Replace typing indicator with the resolution narration
    this.broadcast('chat_msg', {
      ...this.msg('result', validated.public_narration),
      id: resultMsgId,
    });
    await this.delay(800);

    // Send private narrations
    for (const p of this.alive()) {
      const priv = (validated.private_narrations || []).find(n => n.player_id === p.id);
      const privText = priv?.narration && priv.narration !== 'null' ? priv.narration : null;
      if (privText) {
        this.sendTo(p, 'chat_msg', {
          ...this.msg('private_info', privText),
          visibility: 'private',
        });
      }
      const clue = (validated.clues_distributed || []).find(c => c.player_id === p.id);
      const clueText = clue?.clue && clue.clue !== 'null' ? clue.clue : null;
      if (clueText) {
        p.clues.push(clueText);
        this.sendTo(p, 'chat_msg', {
          ...this.msg('private_info', `[clue] ${clueText}`),
          visibility: 'private',
        });
      }
    }

    // Handle deaths
    for (const death of validated.deaths || []) {
      const victim = this.getPlayer(death.victim_id);
      if (victim && victim.status === 'alive') {
        victim.status = 'dead';
        this.room.state.deaths.push({
          victim: death.victim_id,
          location: death.location,
          round: this.room.state.round,
          discovered: false,
          votedOut: false,
        });
        this.room.state.undiscoveredBodies.push({
          victim: death.victim_id,
          location: death.location,
        });
        this.sendTo(victim, 'chat_msg', {
          ...this.msg('private_info', 'You have been killed. You are now spectating.'),
          visibility: 'private',
        });
        this.broadcast('player_status_update', { playerId: victim.id, status: 'dead' });
      }
    }

    // Win check after deaths (before body discovery meeting)
    const winAfterDeath = checkWinCondition(this.room.players);
    if (winAfterDeath) {
      await this.delay(1500);
      await this.endGame(winAfterDeath);
      this.running = false;
      return;
    }

    // Body discoveries → auto meeting
    if (validated.body_discoveries?.length > 0) {
      for (const disc of validated.body_discoveries) {
        const victimName = this.getName(disc.victim_id);
        this.broadcast('chat_msg', this.msg(
          'body_discovery',
          `${victimName} has been found dead in ${disc.area}.`
        ));
      }
      await this.delay(2000);
      await this.runMeeting('body_found', validated.body_discoveries[0].discoverer_id);
      if (!this.running) return;

      const winAfterMeeting = checkWinCondition(this.room.players);
      if (winAfterMeeting) {
        await this.endGame(winAfterMeeting);
        this.running = false;
        return;
      }
      return;
    }

    // Update story log
    this.room.state.storyLog.push(`Round ${this.room.state.round}: ${validated.public_narration}`);
    if (this.room.state.storyLog.length > 10) this.room.state.storyLog.shift();

    await this.delay(2000);
  }

  async runMeeting(reason, callerId) {
    this.room.phase = 'meeting';
    this.room.state.meetingsHeld++;
    this.room.state.roundsSinceLastMeeting = 0;

    // Token to detect if this meeting is still active when async callbacks fire
    const meetingToken = uuidv4();
    this._currentMeetingToken = meetingToken;

    const callerName = this.getName(callerId) || 'Unknown';
    const bannerText = reason === 'emergency'
      ? `Emergency meeting called by ${callerName}`
      : `A body was found. Emergency meeting called.`;

    this.broadcast('chat_msg', this.msg('meeting_banner', bannerText));
    await this.delay(500);

    const DISCUSSION_DURATION = 90000;
    const humanAlive = this.alive().filter(p => !p.isAI);
    let skipResolve;
    const skipPromise = new Promise(r => { skipResolve = r; });
    this._skipDiscussion = { votes: new Set(), needed: humanAlive.length, resolve: skipResolve };

    this.broadcast('discussion_start', { duration: 90 });

    // Broadcast initial skip vote state so clients show the button
    this.broadcast('skip_votes_update', { count: 0, needed: humanAlive.length });

    // Schedule AI agent discussion messages — they check the token before sending
    for (const ai of this.alive().filter(p => p.isAI)) {
      this._scheduleAIDiscussion(ai, DISCUSSION_DURATION, meetingToken);
    }

    await Promise.race([this.delay(DISCUSSION_DURATION), skipPromise]);
    this._skipDiscussion = null;
    this.broadcast('discussion_end', {});
    await this.delay(500);

    // Vote phase
    const candidates = this.alive().map(p => ({ id: p.id, name: p.name }));
    this.broadcast('chat_msg', {
      ...this.msg('vote_prompt', 'Time to vote. Who do you eliminate?'),
      candidates,
    });

    const voteCollector = new VoteCollector();
    this.currentVoteCollector = voteCollector;

    // AI votes (staggered)
    for (const ai of this.alive().filter(p => p.isAI)) {
      const voteDelay = 3000 + Math.random() * 20000;
      setTimeout(() => {
        const targetId = this.aiAgent.pickVote(ai, candidates, this.room.state);
        voteCollector.submit(ai.id, targetId);
      }, voteDelay);
    }

    const voteResult = await voteCollector.start(this.alive(), 30000);
    this.currentVoteCollector = null;

    const tally = tallyVotes(voteResult.votes, candidates);

    let resultContent;
    let wasKiller = false;
    let eliminatedId = null;

    if (tally.eliminated) {
      eliminatedId = tally.eliminated;
      const target = this.getPlayer(eliminatedId);
      if (target) {
        target.status = 'dead';
        wasKiller = target.role === 'killer';
        this.room.state.deaths.push({
          victim: target.id,
          location: target.location,
          round: this.room.state.round,
          discovered: true,
          votedOut: true,
        });
        this.broadcast('player_status_update', { playerId: target.id, status: 'dead' });
        this.broadcast('role_revealed', { playerId: target.id, role: target.role, name: target.name });

        resultContent = wasKiller
          ? `${target.name} was eliminated. They were the killer. Innocents win.`
          : `${target.name} was eliminated. They were ${target.role === 'investigator' ? 'the investigator' : 'innocent'}. The game continues.`;
      }
    } else {
      resultContent = 'No majority. No one was eliminated.';
    }

    this.broadcast('chat_msg', {
      ...this.msg('vote_result', resultContent),
      data: {
        votes: voteResult.votes,
        eliminated: eliminatedId,
        wasKiller,
      },
    });

    this.room.state.votesHistory.push({
      round: this.room.state.round,
      votes: voteResult.votes,
      eliminated: eliminatedId,
    });

    // Win check
    const win = checkWinCondition(this.room.players);
    if (win) {
      await this.delay(2000);
      await this.endGame(win);
      this.running = false;
      return;
    }

    await this.delay(3000);
    this.room.phase = 'playing';
  }

  handleSubmitChoice(playerId, choiceId) {
    const player = this.getPlayer(playerId);
    if (!player || player.status === 'dead') return;
    if (!this.currentChoiceCollector || this.currentChoiceCollector._done) return;

    const pd = (this.currentRoundPlayerData || []).find(d => d.player_id === playerId);
    if (!pd) return;

    const choice = pd.choices.find(c => c.id === choiceId);
    if (!choice) return;

    this.currentChoiceCollector.submit(playerId, choice);
    // Confirm to player
    this.sendTo(player, 'chat_msg', {
      id: uuidv4(),
      type: 'player_action',
      content: choice.text,
      sender: player.name,
      senderId: playerId,
      visibility: 'private',
      ts: Date.now(),
    });
  }

  handleEmergencyMeeting(playerId) {
    const player = this.getPlayer(playerId);
    if (!player) return;
    if (player.status === 'dead') return;
    // -1 = unlimited (investigator); 0 = none left
    if (player.emergencyMeetingsLeft === 0) return;
    if (this.room.phase !== 'playing') return;
    if (!this.currentChoiceCollector) return;

    this.currentChoiceCollector.interrupt('emergency', playerId);
  }

  handleChatMessage(playerId, message) {
    if (this.room.phase !== 'meeting') return;
    const player = this.getPlayer(playerId);
    if (!player || player.status === 'dead') return;

    const trimmed = message.trim().slice(0, 300);
    if (!trimmed) return;

    this.room.state.chatHighlights.push(`${player.name}: "${trimmed}"`);
    if (this.room.state.chatHighlights.length > 15) this.room.state.chatHighlights.shift();

    this.broadcast('chat_msg', {
      id: uuidv4(),
      type: 'discussion',
      content: trimmed,
      sender: player.name,
      senderId: playerId,
      visibility: 'public',
      ts: Date.now(),
    });
  }

  handleSkipDiscussion(playerId) {
    if (!this._skipDiscussion) return;
    if (this.room.phase !== 'meeting') return;
    const player = this.getPlayer(playerId);
    if (!player || player.isAI || player.status === 'dead') return;

    this._skipDiscussion.votes.add(playerId);
    const { votes, needed, resolve } = this._skipDiscussion;

    this.broadcast('skip_votes_update', { count: votes.size, needed });

    if (votes.size >= needed) {
      this.broadcast('chat_msg', this.msg('result', 'Everyone agreed to skip. Moving to vote.'));
      resolve();
    }
  }

  handleVote(playerId, targetId) {
    if (!this.currentVoteCollector || this.currentVoteCollector._done) return;
    const player = this.getPlayer(playerId);
    if (!player || player.status === 'dead') return;

    this.currentVoteCollector.submit(playerId, targetId);

    const targetName = targetId === 'skip' ? 'Skip' : this.getName(targetId);
    this.sendTo(player, 'chat_msg', {
      id: uuidv4(),
      type: 'player_action',
      content: `You voted: ${targetName}`,
      sender: player.name,
      senderId: playerId,
      visibility: 'private',
      ts: Date.now(),
    });
  }

  async endGame(win) {
    this.room.phase = 'ended';
    this.running = false;

    const killer = this.room.players.find(p => p.role === 'killer');
    const content = win.winner === 'innocents'
      ? `The innocents win. ${killer?.name || 'The Killer'} has been brought to justice.`
      : `${killer?.name || 'The Killer'} wins. The killer outlasted the rest.`;

    const roles = this.room.players.map(p => ({
      id: p.id,
      name: p.name,
      role: p.role,
      status: p.status,
      isAI: p.isAI,
    }));

    this.broadcast('chat_msg', {
      ...this.msg('game_over', content),
      data: { winner: win.winner, reason: win.reason, roles },
    });

    this.broadcast('game_ended', { winner: win.winner, roles });
  }

  _scheduleAIChoice(aiPlayer, choices, collector) {
    const delay = 2000 + Math.random() * 13000;
    setTimeout(() => {
      if (collector._done) return;
      const choice = this.aiAgent.pickChoice(aiPlayer, choices);
      if (choice) collector.submit(aiPlayer.id, choice);
    }, delay);
  }

  _scheduleAIDiscussion(aiPlayer, totalDuration, meetingToken) {
    // Send 1 or 2 messages spread across the discussion window
    const count = 1 + Math.floor(Math.random() * 2);
    const interval = totalDuration / (count + 1);

    for (let i = 0; i < count; i++) {
      const jitter = (Math.random() - 0.5) * interval * 0.3;
      const sendTime = (i + 1) * interval + jitter;

      setTimeout(async () => {
        // Bail if this meeting is no longer active or phase changed
        if (this._currentMeetingToken !== meetingToken) return;
        if (this.room.phase !== 'meeting') return;

        try {
          const msgs = await this.aiAgent.generateDiscussionMessages(aiPlayer, this.room);
          for (const text of msgs) {
            // Double-check after async Gemini call returns
            if (this._currentMeetingToken !== meetingToken) return;
            if (this.room.phase !== 'meeting') return;

            this.broadcast('chat_msg', {
              id: uuidv4(),
              type: 'discussion',
              content: text,
              sender: aiPlayer.name,
              senderId: aiPlayer.id,
              visibility: 'public',
              ts: Date.now(),
            });
            await this.delay(1200);
          }
        } catch (e) {
          console.error(`AI discussion (${aiPlayer.name}) failed:`, e.message);
        }
      }, sendTime);
    }
  }

  _validate(resolved, choices) {
    const killer = this.room.players.find(p => p.role === 'killer' && p.status === 'alive');

    // Validate kill
    if (!killer) {
      resolved.deaths = [];
    } else {
      const killerChoice = choices[killer.id];
      if (!killerChoice || killerChoice.type !== 'attack') {
        resolved.deaths = [];
      } else {
        const killerNewPos = (resolved.new_positions || []).find(np => np.player_id === killer.id)?.area;
        if (killerNewPos) {
          const othersInArea = (resolved.new_positions || []).filter(
            np => np.player_id !== killer.id &&
              np.area === killerNewPos &&
              this.isAlive(np.player_id)
          ).length;
          if (othersInArea !== 1) resolved.deaths = [];
        } else {
          resolved.deaths = [];
        }
      }
    }

    // Validate body discoveries
    resolved.body_discoveries = [];
    for (const pos of (resolved.new_positions || [])) {
      if (!this.isAlive(pos.player_id)) continue;
      const bodyHere = this.room.state.undiscoveredBodies.find(b => b.location === pos.area);
      if (bodyHere) {
        resolved.body_discoveries.push({
          discoverer_id: pos.player_id,
          victim_id: bodyHere.victim,
          area: pos.area,
        });
        const deathRecord = this.room.state.deaths.find(d => d.victim === bodyHere.victim && !d.discovered);
        if (deathRecord) deathRecord.discovered = true;
        this.room.state.undiscoveredBodies = this.room.state.undiscoveredBodies.filter(
          b => b.victim !== bodyHere.victim
        );
      }
    }

    return resolved;
  }

  _apply(resolved) {
    for (const pos of (resolved.new_positions || [])) {
      const p = this.getPlayer(pos.player_id);
      // Validate area exists
      const validArea = this.room.world.areas.find(a => a.name === pos.area);
      if (p && validArea) p.location = pos.area;
    }
  }

  _fallbackRound() {
    const alive = this.alive();
    const areas = this.room.world?.areas || [{ name: 'Main Hall', connected_to: [] }];

    const player_data = alive.map(p => {
      const current = areas.find(a => a.name === p.location) || areas[0];
      const reachable = (current.connected_to || []).map(name => ({
        id: `c_move_${name.replace(/\s/g, '_')}`,
        text: `Move to ${name}`,
        type: 'move',
      }));

      let choices;
      if (p.role === 'killer') {
        choices = [
          reachable[0] || { id: 'c_hide', text: `Stay in ${p.location}`, type: 'hide' },
          reachable[1] || { id: 'c_hide2', text: 'Wait and observe', type: 'hide' },
          { id: 'c_attack', text: 'Attack someone nearby', type: 'attack' },
        ];
      } else {
        choices = [
          ...reachable.slice(0, 2),
          { id: 'c_hide', text: `Stay and observe in ${p.location}`, type: 'hide' },
        ].slice(0, 3);
        while (choices.length < 3) {
          choices.push({ id: `c${choices.length + 1}`, text: 'Wait quietly', type: 'hide' });
        }
      }

      return { player_id: p.id, choices, private_info: `You look around ${p.location} carefully.`, clue: null };
    });

    return {
      story_event: 'An uneasy silence settles over the space. The shadows seem to breathe.',
      player_data,
      tension_level: Math.min((this.room.state.tensionLevel || 1) + 1, 10),
    };
  }

  _fallbackResolution(choices) {
    const newPositions = this.alive().map(p => {
      const choice = choices[p.id];
      let area = p.location;
      if (choice?.type === 'move') {
        const match = choice.text?.match(/Move to (.+)/);
        if (match) {
          const targetArea = this.room.world?.areas.find(a => a.name === match[1]);
          if (targetArea) area = targetArea.name;
        }
      }
      return { player_id: p.id, area };
    });

    return {
      new_positions: newPositions,
      deaths: [],
      public_narration: 'The tension builds as everyone moves through the shadows, watching their backs.',
      private_narrations: [],
      clues_distributed: [],
    };
  }
}
