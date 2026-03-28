/* eslint-disable no-undef */
// @ts-nocheck — vanilla browser JS

const socket = io();

// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════
let myName = '';
let isHost = false;
let roomCode = '';
let currentScreen = 'name';
let currentRoundData = null;
let mapMoveMode = false;          // when true, clicking adjacent rooms sends MOVE

// ── DOM helpers ──────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const show = (el) => el?.classList.remove('hidden');
const hide = (el) => el?.classList.add('hidden');
function html(el, c) { if (el) el.innerHTML = c; }

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const s = $(`screen-${name}`);
  if (s) { s.classList.add('active'); s.style.animation = 'none'; s.offsetHeight; s.style.animation = ''; }
  currentScreen = name;
  window.scrollTo(0, 0);
}

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  t.classList.remove('hidden');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function esc(s) { if (s == null) return ''; const d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; }
function evClass(e) {
  if (/dead|kill|eliminated|body/i.test(e)) return 'ev-crit';
  if (/completed|worked|sabotaged/i.test(e)) return 'ev-task';
  if (/moved|move|prepares/i.test(e)) return 'ev-move';
  if (/clue|investigated|delivered/i.test(e)) return 'ev-clue';
  if (/🕯️/.test(e)) return 'ev-atmo';
  return '';
}

// ═══════════════════════════════════════════════════════════
// PARTICLE SYSTEM
// ═══════════════════════════════════════════════════════════
const particleCanvas = $('particles');
const pCtx = particleCanvas.getContext('2d');
let particles = [];

function initParticles() {
  resizeCanvas();
  for (let i = 0; i < 60; i++) particles.push(createParticle());
  requestAnimationFrame(tickParticles);
}

function resizeCanvas() {
  particleCanvas.width = window.innerWidth;
  particleCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);

function createParticle() {
  return {
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: Math.random() * 2 + 0.5,
    dx: (Math.random() - 0.5) * 0.3,
    dy: (Math.random() - 0.5) * 0.25 - 0.1,
    alpha: Math.random() * 0.3 + 0.05,
    pulse: Math.random() * Math.PI * 2,
  };
}

function tickParticles() {
  pCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
  for (const p of particles) {
    p.x += p.dx;
    p.y += p.dy;
    p.pulse += 0.015;
    const a = p.alpha * (0.6 + 0.4 * Math.sin(p.pulse));
    if (p.x < -10 || p.x > particleCanvas.width + 10 || p.y < -10 || p.y > particleCanvas.height + 10) {
      p.x = Math.random() * particleCanvas.width;
      p.y = particleCanvas.height + 5;
      p.dy = -(Math.random() * 0.3 + 0.1);
    }
    pCtx.beginPath();
    pCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    pCtx.fillStyle = `rgba(180, 170, 220, ${a})`;
    pCtx.fill();
  }
  requestAnimationFrame(tickParticles);
}

initParticles();

// ═══════════════════════════════════════════════════════════
// 2D MAP DATA
// ═══════════════════════════════════════════════════════════
const ROOMS = {
  'Foyer':           { x: 38, y: 46 },
  'Library':         { x: 38, y: 18 },
  'Study':           { x: 12, y: 18 },
  'Hallway':         { x: 72, y: 46 },
  'Kitchen':         { x: 38, y: 74 },
  'Cellar':          { x: 38, y: 95 },
  'Attic':           { x: 72, y: 12 },
  'Master Bedroom':  { x: 72, y: 78 },
  'Dining Room':     { x: 12, y: 74 },
};

const CONNECTIONS = [
  ['Foyer', 'Library'], ['Foyer', 'Kitchen'], ['Foyer', 'Hallway'],
  ['Library', 'Study'], ['Library', 'Hallway'],
  ['Kitchen', 'Cellar'], ['Kitchen', 'Dining Room'],
  ['Hallway', 'Master Bedroom'], ['Hallway', 'Attic'],
  ['Master Bedroom', 'Attic'],
];

// ═══════════════════════════════════════════════════════════
// MAP RENDERING
// ═══════════════════════════════════════════════════════════
function renderMap(d) {
  const svg = $('map-svg');
  const nodes = $('map-nodes');

  const currentRoom = d.room.name;
  const exitNames = d.room.exits.map(e => e.name);
  const exitMap = {};
  for (const e of d.room.exits) exitMap[e.name] = e.playerCount;

  // Build SVG connection lines
  let lines = '';
  for (const [a, b] of CONNECTIONS) {
    const ra = ROOMS[a], rb = ROOMS[b];
    if (!ra || !rb) continue;
    let cls = '';
    if (a === currentRoom || b === currentRoom) {
      cls = exitNames.includes(a === currentRoom ? b : a) ? 'conn-current' : '';
    }
    if (!cls && (exitNames.includes(a) || exitNames.includes(b))) cls = 'conn-adjacent';
    lines += `<line x1="${ra.x}%" y1="${ra.y}%" x2="${rb.x}%" y2="${rb.y}%" class="${cls}"/>`;
  }
  svg.innerHTML = lines;

  // Build room nodes
  let nodesHtml = '';
  for (const [name, pos] of Object.entries(ROOMS)) {
    const isCurrent = name === currentRoom;
    const isAdj = exitNames.includes(name);
    let cls = 'room-node';
    if (isCurrent) cls += ' current';
    else if (isAdj) cls += ' adjacent';
    else cls += ' dimmed';

    // Player dots
    let dots = '';
    if (isCurrent) {
      dots += '<span class="player-dot is-you"></span>';
      for (let i = 0; i < d.room.playersHere.length; i++) dots += '<span class="player-dot"></span>';
    } else if (isAdj && exitMap[name]) {
      for (let i = 0; i < exitMap[name]; i++) dots += '<span class="player-dot"></span>';
    }

    // Task indicator
    let taskBadge = '';
    if (isCurrent && d.room.tasks.length > 0) {
      taskBadge = `<span class="task-indicator">${d.room.tasks.length}</span>`;
    }

    const onclick = isAdj ? `onclick="mapClickRoom('${esc(name)}')"` : '';
    nodesHtml += `
      <div class="${cls}" style="left:${pos.x}%;top:${pos.y}%" ${onclick}>
        ${taskBadge}
        <div class="room-label">${esc(name)}</div>
        <div class="room-dots">${dots}</div>
      </div>`;
  }
  nodes.innerHTML = nodesHtml;
}

function mapClickRoom(roomName) {
  // Find the MOVE action for this room
  if (!currentRoundData) return;
  const moveAction = currentRoundData.actions.find(a => a.kind === 'MOVE' && a.label.includes(roomName));
  if (moveAction) {
    pickAction(moveAction.kind, moveAction.targetId);
  }
}

// ═══════════════════════════════════════════════════════════
// TAB SYSTEM
// ═══════════════════════════════════════════════════════════
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  $(`tab-${name}`)?.classList.add('active');
}

// ═══════════════════════════════════════════════════════════
// NAME ENTRY
// ═══════════════════════════════════════════════════════════
$('input-name').addEventListener('keydown', e => { if (e.key === 'Enter') $('btn-name-ok').click(); });

$('btn-name-ok').onclick = () => {
  const name = $('input-name').value.trim();
  if (!name) return;
  myName = name;
  $('rooms-player-name').textContent = `Playing as ${name}`;
  showScreen('rooms');
  socket.emit('list-rooms');
};

// ═══════════════════════════════════════════════════════════
// ROOM BROWSER
// ═══════════════════════════════════════════════════════════
$('btn-create-room').onclick = () => socket.emit('create-room', { name: myName });

$('input-room-code').addEventListener('keydown', e => { if (e.key === 'Enter') $('btn-join-code').click(); });
$('btn-join-code').onclick = () => {
  const code = $('input-room-code').value.trim().toUpperCase();
  if (!code || code.length < 4) { toast('Enter a 4-character room code.'); return; }
  socket.emit('join-room', { code, name: myName });
};

function joinRoomFromList(code) { socket.emit('join-room', { code, name: myName }); }

socket.on('rooms-list', (rooms) => {
  if (currentScreen !== 'rooms') return;
  const container = $('rooms-list');
  const emptyMsg = $('rooms-empty-msg');
  const joinable = rooms.filter(r => r.phase === 'lobby');
  if (joinable.length === 0) {
    container.innerHTML = '';
    container.appendChild(emptyMsg);
    show(emptyMsg);
    return;
  }
  hide(emptyMsg);
  html(container, joinable.map(r => `
    <div class="glass-card room-card">
      <div class="room-card-info">
        <span class="room-code-label">${esc(r.code)}</span>
        <span class="room-host-label">Host: ${esc(r.hostName)}</span>
        <span class="room-count-label">${r.playerCount}/${r.maxPlayers} players</span>
      </div>
      <button class="gb primary compact" onclick="joinRoomFromList('${esc(r.code)}')">Join</button>
    </div>
  `).join(''));
});

// ═══════════════════════════════════════════════════════════
// GAME LOBBY
// ═══════════════════════════════════════════════════════════
socket.on('joined-room', (data) => {
  myName = data.name;
  isHost = data.isHost;
  roomCode = data.code;
  $('lobby-code').textContent = data.code;
  showScreen('lobby');
});

$('btn-leave-room').onclick = () => {
  socket.emit('leave-room');
  roomCode = '';
  showScreen('rooms');
  socket.emit('list-rooms');
};

$('btn-start').onclick = () => socket.emit('start');

socket.on('lobby', (data) => {
  if (data.code) { $('lobby-code').textContent = data.code; roomCode = data.code; }
  $('player-count').textContent = `(${data.players.length}/${data.min}–${data.max})`;
  html($('player-list'),
    data.players.map(p =>
      `<li>${esc(p.name)}${p.isHost ? '<span class="host-badge">HOST</span>' : ''}</li>`
    ).join('')
  );
  $('lobby-msg').textContent = data.canStart ? 'Ready to start!' : `Need at least ${data.min} players`;
  const meHost = data.players.find(p => p.name === myName)?.isHost;
  if (meHost && data.canStart) show($('btn-start'));
  else hide($('btn-start'));
});

socket.on('error-msg', (msg) => toast(msg));

// ═══════════════════════════════════════════════════════════
// ROLE REVEAL
// ═══════════════════════════════════════════════════════════
socket.on('role', (data) => {
  showScreen('role');
  const card = $('role-card');
  if (data.role === 'possessed') {
    $('role-icon').textContent = '☠️';
    $('role-title').textContent = 'You Are Possessed';
    $('role-title').className = 'role-title possessed';
    card.style.borderColor = 'rgba(248,113,113,0.4)';
    card.style.boxShadow = '0 0 30px rgba(248,113,113,0.15)';
    html($('role-body'), `
      <p>The ghost <strong>"${esc(data.ghostName)}"</strong> has taken hold of you.</p>
      <p style="color:var(--dim);margin-top:0.5rem">${esc(data.ghostMotive)}</p>
      <div style="margin-top:1rem">
        <p><strong>Your goal:</strong> Sabotage, deceive, and eliminate innocents.</p>
        <p style="margin-top:0.4rem">You can <strong>Kill</strong>, <strong>Sabotage</strong> rooms, and <strong>Pretend</strong> to do tasks.</p>
      </div>
      <p style="margin-top:0.75rem">Traits: ${data.traits.map(t => `<span class="tag">${esc(t)}</span>`).join(' ')}</p>
    `);
  } else {
    $('role-icon').textContent = '✨';
    $('role-title').textContent = 'You Are Innocent';
    $('role-title').className = 'role-title innocent';
    card.style.borderColor = 'rgba(74,222,128,0.4)';
    card.style.boxShadow = '0 0 30px rgba(74,222,128,0.15)';
    html($('role-body'), `
      <p>Something evil lurks among your group in this haunted house.</p>
      <p style="color:var(--dim);margin-top:0.5rem">${esc(data.ghostBackstory)}</p>
      <div style="margin-top:1rem">
        <p><strong>Your goal:</strong> Complete tasks to escape the house.</p>
        <p style="margin-top:0.4rem">Solve tasks to earn <strong>clues</strong> about who is possessed.</p>
        <p>Call meetings to <strong>vote</strong> out suspects.</p>
      </div>
      <p style="margin-top:0.75rem">Traits: ${data.traits.map(t => `<span class="tag">${esc(t)}</span>`).join(' ')}</p>
    `);
  }
  $('btn-role-ok').disabled = false;
  $('role-wait').textContent = '';
});

$('btn-role-ok').onclick = () => {
  socket.emit('ready');
  $('btn-role-ok').disabled = true;
  $('role-wait').textContent = 'Waiting for other players...';
};

// ═══════════════════════════════════════════════════════════
// WAITING UPDATES
// ═══════════════════════════════════════════════════════════
socket.on('waiting', (data) => {
  const msg = `Waiting... ${data.ready}/${data.total} ready`;
  for (const el of [$('role-wait'), $('results-wait'), $('meeting-wait'), $('vote-results-wait')]) {
    if (el) el.textContent = msg;
  }
});

// ═══════════════════════════════════════════════════════════
// GAME ROUND — MAIN SCREEN
// ═══════════════════════════════════════════════════════════
socket.on('round', (data) => {
  currentRoundData = data;
  showScreen('game');
  renderHUD(data);
  renderMap(data);
  renderActions(data);
  renderClues(data);
  renderLog(data);
  switchTab('actions');
});

function renderHUD(d) {
  const pct = d.progress.required > 0 ? Math.round((d.progress.completed / d.progress.required) * 100) : 0;
  const roleClass = d.you.role === 'possessed' ? 'possessed' : 'innocent';
  html($('game-hud'), `
    <div class="hud-item"><span class="hud-icon">⏳</span><span class="hud-val">R${d.round}/${d.maxRounds}</span></div>
    <div class="hud-item"><span class="hud-icon">📊</span><span class="hud-val">${d.progress.completed}/${d.progress.required}</span></div>
    <div class="hud-item"><span class="hud-icon">👥</span><span class="hud-val">${d.progress.alive}/${d.progress.total}</span></div>
    <span class="hud-role ${roleClass}">${d.you.role}</span>
  `);
}

function renderActions(d) {
  const panel = $('tab-actions');
  const nonMove = d.actions.filter(a => a.kind !== 'MOVE');
  const hasMoves = d.actions.some(a => a.kind === 'MOVE');

  let content = '';

  if (d.isFirstRound) {
    content += `<p style="text-align:center;margin-bottom:0.6rem;color:var(--dim)">The door slams shut. <strong style="color:var(--text)">Explore the house!</strong></p>`;
  }

  if (hasMoves) {
    content += `<p style="font-size:0.82rem;color:var(--dim);margin-bottom:0.5rem">📍 Tap a <span style="color:var(--blue)">blue room</span> on the map to move there</p>`;
  }

  for (const a of nonMove) {
    const icon = actionIcon(a.kind);
    content += `<button class="action-btn" onclick="pickAction('${esc(a.kind)}','${esc(a.targetId || '')}')"><span class="act-icon">${icon}</span>${esc(a.label)}</button>`;
  }

  html(panel, content);
}

function actionIcon(kind) {
  const icons = { DO_TASK: '🔧', FOLLOW: '👣', EMERGENCY_MEETING: '🔔', KILL: '🗡️', SABOTAGE: '💣', PRETEND_TASK: '🎭' };
  return icons[kind] || '▶️';
}

function renderClues(d) {
  const panel = $('tab-clues');
  if (d.clues.length === 0) {
    html(panel, '<p style="color:var(--dim);text-align:center;padding:1rem">No clues yet. Complete tasks to find clues!</p>');
    return;
  }
  html(panel, `
    <ul class="elist">${d.clues.slice(-8).map(c => `<li class="ev-clue">🔍 ${esc(c.text)}</li>`).join('')}</ul>
    ${d.clues.length > 8 ? `<p class="dim" style="margin-top:0.4rem">(${d.clues.length - 8} older clues)</p>` : ''}
  `);
}

function renderLog(d) {
  const panel = $('tab-log');
  let content = '';

  // Room info
  content += `<div style="margin-bottom:0.6rem">
    <p style="font-weight:600">📍 ${esc(d.room.name)}</p>
    <p style="color:var(--dim);font-size:0.85rem">${esc(d.room.description)}</p>
  </div>`;

  // Who's here
  if (d.room.playersHere.length > 0) {
    content += `<p style="font-size:0.88rem;margin-bottom:0.3rem">👥 With you: ${d.room.playersHere.map(esc).join(', ')}</p>`;
  } else {
    content += `<p style="font-size:0.88rem;color:var(--dim);margin-bottom:0.3rem">You are alone here.</p>`;
  }

  // Tasks
  if (d.room.tasks.length > 0) {
    content += `<p style="font-size:0.88rem;margin-bottom:0.3rem">🔧 Tasks: ${d.room.tasks.map(t => esc(t.name)).join(', ')}</p>`;
  }

  // Private messages
  if (d.privateMessages.length > 0) {
    content += `<div style="margin-top:0.6rem;padding-top:0.5rem;border-top:1px solid rgba(80,70,120,0.2)">
      <p style="font-weight:600;font-size:0.85rem;color:var(--purple);margin-bottom:0.3rem">🔒 Private</p>
      ${d.privateMessages.map(m => `<p style="font-size:0.85rem">${esc(m)}</p>`).join('')}
    </div>`;
  }

  // Recap
  if (d.recap && d.recap.events.length > 0) {
    content += `<div style="margin-top:0.6rem;padding-top:0.5rem;border-top:1px solid rgba(80,70,120,0.2)">
      <p style="font-weight:600;font-size:0.85rem;margin-bottom:0.3rem">📜 Last Round</p>
      <ul class="elist">${d.recap.events.map(e => `<li class="${evClass(e)}">${esc(e)}</li>`).join('')}</ul>
    </div>`;
  }

  html(panel, content);
}

function pickAction(kind, targetId) {
  socket.emit('action', { kind, targetId: targetId || undefined });
}

// ── Action ack / waiting ─────────────────────────────────
socket.on('action-ack', () => {
  html($('tab-actions'), `
    <div class="wait-box">
      <div class="spinner"></div>
      <p>Action submitted!</p>
      <p id="action-status-text" class="dim"></p>
    </div>
  `);
});

socket.on('action-status', (data) => {
  const el = $('action-status-text');
  if (el) el.textContent = `${data.submitted.length} submitted, ${data.pending.length} pending`;
});

// ═══════════════════════════════════════════════════════════
// TASK CHALLENGE
// ═══════════════════════════════════════════════════════════
socket.on('challenge', (data) => {
  switchTab('actions');
  html($('tab-actions'), `
    <div class="challenge-card">
      <p class="ch-title">📜 ${esc(data.taskName)}</p>
      <p class="ch-flavor">${esc(data.flavorText)}</p>
      <p class="ch-prompt">🧩 ${esc(data.prompt)}</p>
      <p class="ch-attempts">Attempt ${data.attempt} of ${data.maxAttempts}</p>
    </div>
    <div class="challenge-input-row">
      <input type="text" id="challenge-input" placeholder="Your answer..." autocomplete="off" class="gi">
      <button class="gb primary compact" onclick="submitAnswer()">Submit</button>
    </div>
  `);
  setTimeout(() => $('challenge-input')?.focus(), 100);
});

function submitAnswer() {
  const input = $('challenge-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  socket.emit('answer', text);
  input.value = '';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && $('challenge-input') === document.activeElement) submitAnswer();
});

socket.on('challenge-result', (data) => {
  if (data.success) {
    html($('tab-actions'), `
      <div class="challenge-card" style="border-color:var(--green)">
        <p style="font-size:1.1rem;text-align:center;color:var(--green)">✅ Correct!</p>
        <p class="dim" style="text-align:center">${esc(data.message)}</p>
      </div>
      <div class="wait-box">
        <div class="spinner"></div>
        <p>Waiting for others...</p>
        <p id="action-status-text" class="dim"></p>
      </div>
    `);
    return;
  }
  if (data.failed) { toast(data.message); return; }
  // Wrong but attempts remain
  const box = $('tab-actions')?.querySelector('.challenge-card');
  if (box) {
    const att = box.querySelector('.ch-attempts');
    if (att) att.textContent = `${data.attemptsLeft} attempt${data.attemptsLeft > 1 ? 's' : ''} left`;
    if (data.hint) {
      let h = box.querySelector('.ch-hint');
      if (h) h.textContent = '💡 ' + data.hint;
      else { h = document.createElement('p'); h.className = 'ch-hint'; h.textContent = '💡 ' + data.hint; box.appendChild(h); }
    }
  }
  toast('❌ Wrong answer. Try again!');
});

// ═══════════════════════════════════════════════════════════
// ROUND RESULTS
// ═══════════════════════════════════════════════════════════
socket.on('results', (data) => {
  showScreen('results');
  html($('results-events'), `<ul class="elist">${data.publicEvents.map(e => `<li class="${evClass(e)}">${esc(e)}</li>`).join('')}</ul>`);

  if (data.privateMessages.length > 0) {
    show($('results-private'));
    html($('results-private'), `<p style="font-weight:600;color:var(--purple);margin-bottom:0.3rem">🔒 For Your Eyes Only</p>${data.privateMessages.map(m => `<p>${esc(m)}</p>`).join('')}`);
  } else hide($('results-private'));

  const pct = data.progress.required > 0 ? Math.round((data.progress.completed / data.progress.required) * 100) : 0;
  html($('results-progress'), `
    <div class="progress-label">Escape: ${data.progress.completed}/${data.progress.required}</div>
    <div class="progress-track"><div class="progress-fill" style="width:${Math.min(pct, 100)}%"></div></div>
  `);
  $('btn-results-ok').disabled = false;
  $('results-wait').textContent = '';
});

$('btn-results-ok').onclick = () => {
  socket.emit('ready');
  $('btn-results-ok').disabled = true;
  $('results-wait').textContent = 'Waiting for other players...';
};

// ═══════════════════════════════════════════════════════════
// MEETING
// ═══════════════════════════════════════════════════════════
socket.on('meeting', (data) => {
  showScreen('meeting');
  const trigger = data.trigger === 'body-discovery'
    ? `💀 ${esc(data.callerName)} discovered a dead body!`
    : `${esc(data.callerName)} called an emergency meeting!`;
  html($('meeting-body'), `
    <p style="font-weight:600;margin-bottom:0.75rem">${trigger}</p>
    <p style="font-weight:600;font-size:0.9rem;margin-bottom:0.4rem">📍 Locations:</p>
    <ul class="elist">${data.locations.map(l => `<li>${esc(l.name)} — <span class="dim">${esc(l.room)}</span></li>`).join('')}</ul>
  `);
  $('btn-meeting-ok').disabled = false;
  $('meeting-wait').textContent = '';
});

$('btn-meeting-ok').onclick = () => {
  socket.emit('ready');
  $('btn-meeting-ok').disabled = true;
  $('meeting-wait').textContent = 'Waiting for others to be ready...';
};

// ═══════════════════════════════════════════════════════════
// VOTING
// ═══════════════════════════════════════════════════════════
socket.on('vote-request', (data) => {
  showScreen('vote');
  const initials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  html($('vote-options'),
    data.candidates.map(c =>
      `<button class="vote-btn" onclick="castVote('${esc(c.id)}')">
        <span class="vote-avatar">${initials(c.name)}</span>
        <span>${esc(c.name)}</span>
      </button>`
    ).join('') +
    `<button class="vote-btn skip-btn" onclick="castVote(null)">Skip Vote</button>`
  );
});

function castVote(targetId) {
  socket.emit('vote', targetId);
  html($('vote-options'), `<div class="wait-box"><div class="spinner"></div><p>Vote submitted. Waiting for results...</p></div>`);
}

// ═══════════════════════════════════════════════════════════
// VOTE RESULTS
// ═══════════════════════════════════════════════════════════
socket.on('vote-results', (data) => {
  showScreen('vote-results');
  html($('vote-results-body'), `<ul class="elist">${data.events.map(e => `<li>${esc(e)}</li>`).join('')}</ul>`);
  $('btn-vote-results-ok').disabled = false;
  $('vote-results-wait').textContent = '';
});

$('btn-vote-results-ok').onclick = () => {
  socket.emit('ready');
  $('btn-vote-results-ok').disabled = true;
  $('vote-results-wait').textContent = 'Waiting for other players...';
};

// ═══════════════════════════════════════════════════════════
// GAME OVER
// ═══════════════════════════════════════════════════════════
socket.on('game-over', (data) => {
  showScreen('end');
  const won = data.winner === 'innocents-escape' || data.winner === 'possessed-eliminated';
  $('end-icon').textContent = won ? '🎉' : '💀';

  const titles = {
    'innocents-escape':       'The Innocents Escaped!',
    'possessed-eliminated':   'The Possessed Was Found!',
    'timer-expired':          'The Ghost Wins',
    'survivors-insufficient': 'The Ghost Wins',
  };
  const subs = {
    'innocents-escape':       'All tasks were completed. Freedom at last!',
    'possessed-eliminated':   'Through careful deduction, the group prevailed.',
    'timer-expired':          'Time ran out. The house claimed everyone.',
    'survivors-insufficient': 'Too few innocents remain to escape.',
  };

  $('end-title').textContent = titles[data.winner] || 'Game Over';
  $('end-title').className = `end-title ${won ? 'win' : 'lose'}`;
  $('end-subtitle').textContent = subs[data.winner] || '';

  html($('end-body'), `
    <p><strong>The possessed player was:</strong> ${esc(data.possessedName)}</p>
    <p>Traits: ${data.possessedTraits.map(t => `<span class="tag">${esc(t)}</span>`).join(' ')}</p>
    <p style="margin-top:0.5rem"><strong>Ghost:</strong> ${esc(data.ghostName)}</p>
    <p style="color:var(--dim)">${esc(data.ghostMotive)}</p>
    <p>Ghost traits: ${data.ghostTraits.map(t => `<span class="tag">${esc(t)}</span>`).join(' ')}</p>
  `);

  html($('end-stats'), `
    <p style="font-weight:600;margin-bottom:0.4rem">📊 Game Stats</p>
    <p>Rounds played: ${data.stats.rounds}</p>
    <p>Escape progress: ${data.stats.escapeCompleted}/${data.stats.escapeRequired}</p>
    <p>Clues found: ${data.stats.cluesFound}</p>
    <p>Survivors: ${data.stats.survivors.join(', ') || 'none'}</p>
    <p>Eliminated: ${data.stats.eliminated.join(', ') || 'none'}</p>
  `);
});

$('btn-restart').onclick = () => {
  socket.emit('restart');
  showScreen('lobby');
  $('lobby-code').textContent = roomCode;
};
