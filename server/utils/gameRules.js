function fisherYates(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function assignRoles(players) {
  const shuffled = fisherYates(players);

  // 1 killer, 1 investigator (if enough players), rest innocent
  return shuffled.map((p, i) => {
    let role;
    if (i === 0) role = 'killer';
    else if (i === 1 && shuffled.length >= 3) role = 'investigator';
    else role = 'innocent';
    return { ...p, role };
  });
}

export function checkWinCondition(players) {
  const alive = players.filter(p => p.status === 'alive');
  const killerAlive = alive.some(p => p.role === 'killer');
  const nonKillerAlive = alive.filter(p => p.role !== 'killer');

  if (!killerAlive) return { winner: 'innocents', reason: 'Killer eliminated by vote' };
  if (nonKillerAlive.length <= 1) return { winner: 'killer', reason: 'Killer outnumbered survivors' };
  return null;
}

export function tallyVotes(votes, candidates) {
  const counts = {};
  for (const c of candidates) counts[c.id] = 0;

  for (const targetId of Object.values(votes)) {
    if (targetId !== 'skip' && counts[targetId] !== undefined) {
      counts[targetId]++;
    }
  }

  const totalVoters = Object.keys(votes).length;
  const majority = Math.floor(totalVoters / 2) + 1;

  let maxVotes = 0;
  let topId = null;
  let tie = false;

  for (const [id, count] of Object.entries(counts)) {
    if (count > maxVotes) {
      maxVotes = count;
      topId = id;
      tie = false;
    } else if (count === maxVotes && maxVotes > 0) {
      tie = true;
    }
  }

  if (!tie && maxVotes >= majority) {
    return { eliminated: topId };
  }
  return { eliminated: null };
}
