import type { Character, Combat, Encounter, Enemy, GameCommand, GameState } from './types';
import { die, modifier, rollDamage } from './random';
import { emit, gainXp } from './events';

export function currentActor(s: GameState) {
  return s.combat?.initiative[s.combat.turn];
}
export function canTarget(s: GameState, p: Character, e: Enemy) {
  if (s.combat?.usesDistance) return e.hp > 0;
  return (
    e.hp > 0 &&
    (p.className === 'Magiker' ||
      s.combat?.breached[p.id] ||
      e.position === 'fram' ||
      !s.combat?.enemies.some((x) => x.hp > 0 && x.position === 'fram'))
  );
}

function actorDistance(c: Combat, id: string) {
  const enemy = c.enemies.find((e) => e.id === id);
  return enemy ? enemy.distance : (c.distances[id] ?? 0);
}

function distanceBetween(c: Combat, a: string, b: string) {
  return Math.abs(actorDistance(c, a) - actorDistance(c, b));
}

function hasCreatureCover(s: GameState, attackerId: string, targetId: string) {
  const c = s.combat!;
  if (!c.usesDistance) return false;
  const from = actorDistance(c, attackerId);
  const to = actorDistance(c, targetId);
  const low = Math.min(from, to);
  const high = Math.max(from, to);
  const occupied = [
    ...s.players.filter((p) => p.hp > 0).map((p) => ({ id: p.id, at: actorDistance(c, p.id) })),
    ...c.enemies.filter((e) => e.hp > 0).map((e) => ({ id: e.id, at: e.distance })),
  ];
  return occupied.some((x) => x.id !== attackerId && x.id !== targetId && x.at > low && x.at < high);
}

function protectionDefender(s: GameState, target: Character) {
  const c = s.combat!;
  return s.players.find(
    (p) =>
      p.id !== target.id &&
      p.hp > 0 &&
      p.shield &&
      p.fightingStyles.includes('protection') &&
      !c.reactionUsed[p.id] &&
      distanceBetween(c, p.id, target.id) <= 5,
  );
}

function heroAttackProfile(p: Character) {
  if (p.className === 'Magiker')
    return { kind: 'ranged' as const, normalRange: 120, longRange: 120, reach: 0 };
  return { kind: 'melee' as const, normalRange: 0, longRange: 0, reach: 5 };
}

export function attackAvailability(s: GameState, p: Character, e: Enemy) {
  if (!canTarget(s, p, e)) return { ok: false, reason: 'Målet kan inte nås.' };
  const c = s.combat;
  if (!c?.usesDistance) return { ok: true, reason: '' };
  const profile = heroAttackProfile(p);
  const distance = distanceBetween(c, p.id, e.id);
  if (profile.kind === 'melee' && distance > profile.reach)
    return {
      ok: false,
      reason: `${distance} ft bort · ditt vapen når ${profile.reach} ft`,
    };
  if (profile.kind === 'ranged' && distance > profile.longRange)
    return {
      ok: false,
      reason: `${distance} ft bort · max range ${profile.longRange} ft`,
    };
  if (profile.kind === 'ranged' && distance > profile.normalRange)
    return { ok: true, reason: `${distance} ft · long range, nackdel` };
  if (profile.kind === 'ranged' && distance <= 5)
    return { ok: true, reason: `${distance} ft · fiende nära, nackdel` };
  return { ok: true, reason: `${distance} ft bort` };
}
export function typedDamage(e: Enemy, amount: number, type: Character['damageType']) {
  if (e.weaknesses?.includes(type)) return amount * 2;
  if (e.resistances?.includes(type)) return Math.floor(amount / 2);
  return amount;
}
export function startCombat(s: GameState, def: Encounter) {
  const size = s.players.length;
  const enemies: Enemy[] = def.enemies.map((e, i) => {
    const role = e.name.toLowerCase().includes('krypt')
      ? 'boss'
      : /båg|skytt/i.test(e.name)
        ? 'archer'
        : 'melee';
    const extra = role === 'boss' ? 8 * (size - 1) : 0;
    return {
      ...structuredClone(e),
      id: `enemy-${i}`,
      role,
      hp: e.hp + extra,
      maxHp: e.maxHp + extra,
      attack: e.attack + (role === 'boss' && size > 1 ? (size === 4 ? 2 : 1) : 0),
      dmg: role === 'boss' && size > 1 ? [1, 6, size === 4 ? 2 : 1] : [...e.dmg],
      position: e.position ?? (role === 'archer' ? 'bak' : 'fram'),
      phase: 1,
      intent: null,
      distance: e.startDistance ?? (role === 'archer' ? 50 : 10),
    };
  });
  if (!def.fixedEnemies && !enemies.some((e) => e.role === 'boss'))
    for (let i = 1; i < size; i++) {
      const base = enemies[(i - 1) % def.enemies.length];
      enemies.push({
        ...structuredClone(base),
        id: `enemy-${enemies.length}`,
        name: `${base.name} · förstärkning ${i}`,
      });
    }
  const initiative = [
    ...s.players.map((p) => ({
      id: p.id,
      name: p.name,
      kind: 'hero' as const,
      modifier: modifier(p.dex),
    })),
    ...enemies.map((e) => ({
      id: e.id,
      name: e.name,
      kind: 'enemy' as const,
      modifier: modifier(e.dex ?? 10),
    })),
  ]
    .map((entry) => {
      let roll = die(s, 20);
      if (def.surprise === (entry.kind === 'hero' ? 'players' : 'enemies'))
        roll = Math.min(roll, die(s, 20));
      return { ...entry, die: roll, total: roll + entry.modifier, tie: die(s, 20) };
    })
    .sort((a, b) => b.total - a.total || b.tie - a.tie);
  const c: Combat = {
    enemies,
    usesDistance: !!def.usesDistance,
    initiative,
    turn: 0,
    round: 1,
    onWin: def.onWin,
    reward: Math.round(def.xp * (1 + 0.25 * (size - 1))),
    victory: false,
    positions: {},
    dodging: {},
    advantage: {},
    used: {},
    protectedBy: {},
    reactionUsed: {},
    protectionActive: {},
    distances: {},
    movementRemaining: {},
    breached: {},
    stats: {},
  };
  for (const p of s.players) {
    c.positions[p.id] = p.className === 'Magiker' ? 'bak' : 'fram';
    c.distances[p.id] = 0;
    c.movementRemaining[p.id] = p.speed;
    c.reactionUsed[p.id] = false;
    c.stats[p.id] = { damage: 0, taken: 0, crits: 0, healing: 0 };
  }
  s.combat = c;
  emit(
    s,
    'warning',
    'Striden börjar. Slå initiativ.',
    initiative
      .map((e) => `${e.name}: ${e.die}${e.modifier >= 0 ? '+' : ''}${e.modifier} = ${e.total}`)
      .join(' · '),
  );
  prepareTurn(s);
}
function next(c: Combat) {
  c.turn++;
  if (c.turn >= c.initiative.length) {
    c.turn = 0;
    c.round++;
  }
}
function evaluate(s: GameState) {
  const c = s.combat!;
  if (s.players.every((p) => p.hp <= 0)) {
    s.status = 'defeat';
    emit(s, 'warning', 'Alla i sällskapet har fallit.');
    return true;
  }
  if (c.enemies.every((e) => e.hp <= 0)) {
    c.victory = true;
    const share = Math.floor(c.reward / s.players.length);
    for (const p of s.players) {
      gainXp(s, p, share);
      if (p.hp === 0) p.hp = 1;
    }
    emit(
      s,
      'success',
      'Striden är vunnen.',
      `+${share} XP per hjälte. Fallna kamrater återhämtar 1 liv.`,
    );
    return true;
  }
  return false;
}
function enemyTurn(s: GameState, e: Enemy) {
  const c = s.combat!;
  const living = s.players.filter((p) => p.hp > 0);
  const preferred = living.filter(
    (p) => c.positions[p.id] === (e.role === 'archer' ? 'bak' : 'fram'),
  );
  const pool = preferred.length ? preferred : living;
  if (!pool.length) return;

  if (!c.usesDistance || !e.attacks?.length) {
    if (e.role === 'boss' && e.hp <= Math.ceil(e.maxHp / 2) && e.phase === 1) {
      e.phase = 2;
      e.attack++;
      e.dmg[2]++;
      emit(s, 'warning', `${e.name} blir ursinnig.`, 'Anfall och skada ökar med 1.');
    }
    if (e.role === 'boss' && !e.intent) {
      const target = pool[die(s, pool.length) - 1];
      e.intent = target.id;
      emit(
        s,
        'warning',
        `${e.name} förbereder ett utfall mot ${target.name}.`,
        'Försvara dig inför anfallet.',
      );
      return;
    }
    const target = living.find((p) => p.id === e.intent) ?? pool[die(s, pool.length) - 1];
    e.intent = null;
    let roll = die(s, 20);
    let detail = `T20: ${roll}`;
    if (c.dodging[target.id]) {
      const second = die(s, 20);
      detail += `/${second} (nackdel)`;
      roll = Math.min(roll, second);
    }
    detail += ` + ${e.attack} mot försvar ${target.ac}.`;
    if (roll !== 1 && (roll === 20 || roll + e.attack >= target.ac)) {
      const amount = rollDamage(s, e.dmg, roll === 20);
      target.hp = Math.max(0, target.hp - amount);
      c.stats[target.id].taken += amount;
      emit(
        s,
        'damage',
        `${e.name} träffar ${target.name} för ${amount} skada${roll === 20 ? ' — kritisk träff' : ''}.`,
        detail,
      );
      if (!target.hp) emit(s, 'warning', `${target.name} faller.`);
    } else emit(s, 'roll', `${e.name} missar ${target.name}.`, detail);
    return;
  }

  const target = [...living].sort(
    (a, b) => distanceBetween(c, e.id, a.id) - distanceBetween(c, e.id, b.id),
  )[0];
  let attack =
    e.attacks.find((a) => a.kind === e.preferredAttack) ??
    e.attacks[0];
  let distance = distanceBetween(c, e.id, target.id);

  if (attack.kind === 'ranged' && distance <= 5) {
    attack = e.attacks.find((a) => a.kind === 'melee') ?? attack;
  }

  if (attack.kind === 'melee') {
    const reach = attack.reach ?? 5;
    if (distance > reach) {
      const move = Math.min(e.speed ?? 30, Math.max(0, distance - reach));
      e.distance += actorDistance(c, target.id) < e.distance ? -move : move;
      distance = distanceBetween(c, e.id, target.id);
      emit(s, 'story', `${e.name} rör sig ${move} ft mot ${target.name}.`);
    }
    if (distance > reach) {
      const dash = Math.min(e.speed ?? 30, Math.max(0, distance - reach));
      e.distance += actorDistance(c, target.id) < e.distance ? -dash : dash;
      emit(s, 'story', `${e.name} använder Dash och rör sig ytterligare ${dash} ft.`);
      return;
    }
  } else {
    const longRange = attack.longRange ?? attack.normalRange ?? 0;
    if (distance > longRange) {
      const move = Math.min(e.speed ?? 30, distance - longRange);
      e.distance += actorDistance(c, target.id) < e.distance ? -move : move;
      distance = distanceBetween(c, e.id, target.id);
      emit(s, 'story', `${e.name} rör sig ${move} ft för att komma inom räckvidd.`);
      if (distance > longRange) return;
    }
  }

  let disadvantage =
    c.dodging[target.id] ||
    (attack.kind === 'ranged' &&
      (distance <= 5 || distance > (attack.normalRange ?? attack.longRange ?? 0)));

  const activeProtection = Object.entries(c.protectionActive).find(
    ([protectedId, defenderId]) =>
      protectedId === target.id &&
      s.players.some(
        (p) =>
          p.id === defenderId &&
          p.hp > 0 &&
          distanceBetween(c, p.id, target.id) <= 5,
      ),
  );
  if (activeProtection) disadvantage = true;
  else {
    const defender = protectionDefender(s, target);
    if (defender) {
      c.reactionUsed[defender.id] = true;
      c.protectionActive[target.id] = defender.id;
      disadvantage = true;
      emit(
        s,
        'story',
        `${defender.name} använder Protection för att skydda ${target.name}.`,
        'Attacken får nackdel. Skyddet gäller medan de förblir inom 5 ft till försvararens nästa tur.',
      );
    }
  }

  const cover = attack.kind === 'ranged' && hasCreatureCover(s, e.id, target.id);
  const ac = target.ac + (cover ? 2 : 0);
  const attackRolls = [die(s, 20)];
  let roll = attackRolls[0];
  let detail = `${attack.name} · ${distance} ft · T20: ${roll}`;
  const mode: 'normal' | 'disadvantage' = disadvantage ? 'disadvantage' : 'normal';
  if (disadvantage) {
    const second = die(s, 20);
    attackRolls.push(second);
    detail += `/${second} (nackdel)`;
    roll = Math.min(roll, second);
  }
  if (cover) detail += ' · Half Cover +2 AC';
  detail += ` + ${attack.attack} mot försvar ${ac}.`;
  const hit = roll !== 1 && (roll === 20 || roll + attack.attack >= ac);
  const enemyDiceBase = {
    attackerId: e.id,
    targetId: target.id,
    attackName: attack.name,
    distance,
    ...(cover ? { coverBonus: 2 } : {}),
    damageType: attack.damageType,
    attack: {
      sides: 20 as const,
      rolls: attackRolls,
      chosen: roll,
      bonus: attack.attack,
      total: roll + attack.attack,
      ac,
      mode,
      critical: roll === 20,
      hit,
    },
  };

  if (hit) {
    const [count, sides, damageBonus] = attack.dmg;
    const critical = roll === 20;
    const damageRolls = Array.from({ length: count * (critical ? 2 : 1) }, () => die(s, sides));
    const amount = Math.max(0, damageBonus + damageRolls.reduce((sum, value) => sum + value, 0));
    target.hp = Math.max(0, target.hp - amount);
    c.stats[target.id].taken += amount;
    emit(
      s,
      'damage',
      `${e.name} träffar ${target.name} med ${attack.name} för ${amount} skada${critical ? ' — kritisk träff' : ''}.`,
      detail,
      {
        ...enemyDiceBase,
        damage: {
          sides,
          rolls: damageRolls,
          bonus: damageBonus,
          total: amount,
          critical,
        },
      },
    );
    if (!target.hp) emit(s, 'warning', `${target.name} faller.`);
  } else {
    emit(
      s,
      'roll',
      `${e.name} missar ${target.name} med ${attack.name}.`,
      detail,
      enemyDiceBase,
    );
  }
}
/** Iterative turn scheduler, no recursive enemy loops or UI timers. */
function prepareTurn(s: GameState) {
  const c = s.combat!;
  for (let guard = 0; guard < 200; guard++) {
    if (evaluate(s)) return;
    const entry = c.initiative[c.turn];
    if (entry.kind === 'hero') {
      const p = s.players.find((p) => p.id === entry.id)!;
      if (p.hp > 0) {
        c.dodging[p.id] = false;
        c.reactionUsed[p.id] = false;
        c.movementRemaining[p.id] = p.speed;
        for (const [target, protector] of Object.entries(c.protectedBy))
          if (protector === p.id) delete c.protectedBy[target];
        for (const [target, defender] of Object.entries(c.protectionActive))
          if (defender === p.id) delete c.protectionActive[target];
        return;
      }
    } else {
      const e = c.enemies.find((e) => e.id === entry.id)!;
      if (e.hp > 0) enemyTurn(s, e);
    }
    next(c);
  }
  throw new Error('Turordningen kunde inte lösas.');
}
export function healItem(s: GameState, p: Character, type: 'potion' | 'herbs') {
  const key = type === 'potion' ? 'potions' : 'herbs';
  if (p[key] <= 0 || p.hp >= p.maxHp || p.hp <= 0)
    throw new Error('Du kan inte använda detta föremål nu.');
  p[key]--;
  const amount = Math.min(p.maxHp - p.hp, type === 'potion' ? die(s, 8) + 6 : die(s, 4) + 3);
  p.hp += amount;
  if (s.combat) s.combat.stats[p.id].healing += amount;
  emit(
    s,
    'heal',
    `${p.name} återfår ${amount} liv.`,
    type === 'potion' ? 'Läkebrygd: 1T8 + 6.' : 'Läkande örter: 1T4 + 3.',
  );
}
function weaponAttack(s: GameState, p: Character, target: string | undefined, special: boolean) {
  const c = s.combat!,
    e = c.enemies.find((e) => e.id === target);
  if (!e || !canTarget(s, p, e))
    throw new Error('Målet kan inte nås. Bryt igenom framlinjen först.');
  const availability = attackAvailability(s, p, e);
  if (!availability.ok) throw new Error(availability.reason);

  const profile = heroAttackProfile(p);
  const distance = c.usesDistance ? distanceBetween(c, p.id, e.id) : 0;
  let disadvantage = false;
  let cover = false;
  if (c.usesDistance) {
    if (profile.kind === 'melee' && distance > profile.reach)
      throw new Error(
        `${e.name} är ${distance} ft bort. Ditt vapen når ${profile.reach} ft. Flytta närmare först.`,
      );
    if (profile.kind === 'ranged') {
      if (distance > profile.longRange)
        throw new Error(
          `${e.name} är ${distance} ft bort. Vapnets maximala räckvidd är ${profile.longRange} ft.`,
        );
      disadvantage = distance <= 5 || distance > profile.normalRange;
      cover = hasCreatureCover(s, p.id, e.id);
    }
  }

  const power = special && p.className === 'Krigare';
  const bonus = p.attackBonus - (power ? 3 : 0);
  const attackRolls = [die(s, 20)];
  let roll = attackRolls[0];
  let rollText = `${roll}`;
  const advantage = !!c.advantage[p.id];
  if (advantage) c.advantage[p.id] = false;
  const mode: 'normal' | 'advantage' | 'disadvantage' =
    advantage === disadvantage ? 'normal' : advantage ? 'advantage' : 'disadvantage';
  if (mode !== 'normal') {
    const second = die(s, 20);
    attackRolls.push(second);
    rollText += `/${second} (${mode === 'advantage' ? 'fördel' : 'nackdel'})`;
    roll = mode === 'advantage' ? Math.max(roll, second) : Math.min(roll, second);
  }
  const ac = e.ac + (cover ? 2 : 0);
  const rangeText = c.usesDistance ? ` · ${distance} ft` : '';
  const coverText = cover ? ' · Half Cover +2 AC' : '';
  const detail = `T20 ${rollText} + ${bonus} mot försvar ${ac}${rangeText}${coverText}.`;
  const hit = roll !== 1 && (roll === 20 || roll + bonus >= ac);
  const attackDice = {
    attackerId: p.id,
    targetId: e.id,
    attackName: p.weapon,
    ...(c.usesDistance ? { distance } : {}),
    ...(cover ? { coverBonus: 2 } : {}),
    damageType: p.damageType,
    attack: {
      sides: 20 as const,
      rolls: attackRolls,
      chosen: roll,
      bonus,
      total: roll + bonus,
      ac,
      mode,
      critical: roll === 20,
      hit,
    },
  };
  if (!hit) {
    emit(s, 'roll', `${p.name} missar ${e.name}.`, detail, special ? undefined : attackDice);
    return;
  }
  const critical = roll === 20;
  const [count, sides, damageBonus] = p.damage;
  const damageRolls = Array.from({ length: count * (critical ? 2 : 1) }, () => die(s, sides));
  let raw = Math.max(0, damageBonus + damageRolls.reduce((sum, value) => sum + value, 0));
  if (special) raw += rollDamage(s, [1, power ? 8 : 6, 0], critical);
  const amount = typedDamage(e, raw, p.damageType);
  e.hp = Math.max(0, e.hp - amount);
  c.stats[p.id].damage += amount;
  if (critical) c.stats[p.id].crits++;
  emit(
    s,
    'damage',
    `${p.name} träffar ${e.name} för ${amount} ${p.damageType.toLowerCase()}skada${critical ? ' — kritisk träff' : ''}.`,
    `${detail}${amount !== raw ? ` ${raw} grundskada; motstånd/sårbarhet tillämpas.` : ''}`,
    special
      ? undefined
      : {
          ...attackDice,
          damage: {
            sides,
            rolls: damageRolls,
            bonus: damageBonus,
            total: raw,
            critical,
          },
        },
  );
  if (!e.hp) emit(s, 'success', `${e.name} faller.`);
}
export function combatAction(s: GameState, p: Character, cmd: GameCommand) {
  const c = s.combat!;
  if (c.victory || currentActor(s)?.id !== p.id || p.hp <= 0)
    throw new Error('Det är inte din tur.');
  switch (cmd.type) {
    case 'attack':
      weaponAttack(s, p, cmd.target, false);
      break;
    case 'defend':
      c.dodging[p.id] = true;
      emit(
        s,
        'story',
        `${p.name} försvarar sig.`,
        'Fiendens anfall får nackdel till din nästa tur.',
      );
      break;
    case 'move': {
      if (c.usesDistance) {
        const target =
          c.enemies.find((e) => e.id === cmd.target && e.hp > 0) ??
          [...c.enemies]
            .filter((e) => e.hp > 0)
            .sort((a, b) => distanceBetween(c, p.id, a.id) - distanceBetween(c, p.id, b.id))[0];
        if (!target) throw new Error('Det finns inget mål att röra sig mot.');
        const remaining = c.movementRemaining[p.id] ?? p.speed;
        if (remaining <= 0) throw new Error('Du har ingen förflyttning kvar den här turen.');
        const from = c.distances[p.id] ?? 0;
        const desired = target.distance > from ? target.distance - 5 : target.distance + 5;
        const delta = desired - from;
        const move = Math.sign(delta) * Math.min(Math.abs(delta), remaining);
        c.distances[p.id] = from + move;
        c.movementRemaining[p.id] = remaining - Math.abs(move);
        emit(
          s,
          'story',
          `${p.name} rör sig ${Math.abs(move)} ft mot ${target.name}.`,
          `${distanceBetween(c, p.id, target.id)} ft återstår · ${c.movementRemaining[p.id]} ft movement kvar.`,
        );
        return;
      }
      c.positions[p.id] = c.positions[p.id] === 'fram' ? 'bak' : 'fram';
      emit(
        s,
        'story',
        `${p.name} flyttar till ${c.positions[p.id] === 'fram' ? 'framlinjen' : 'baklinjen'}.`,
      );
      break;
    }
    case 'dash': {
      if (!c.usesDistance) throw new Error('Dash används bara i strider med avstånd.');
      const target =
        c.enemies.find((e) => e.id === cmd.target && e.hp > 0) ??
        [...c.enemies]
          .filter((e) => e.hp > 0)
          .sort((a, b) => distanceBetween(c, p.id, a.id) - distanceBetween(c, p.id, b.id))[0];
      if (!target) throw new Error('Det finns inget mål att röra sig mot.');
      const from = c.distances[p.id] ?? 0;
      const available = (c.movementRemaining[p.id] ?? 0) + p.speed;
      const desired = target.distance > from ? target.distance - 5 : target.distance + 5;
      const delta = desired - from;
      const move = Math.sign(delta) * Math.min(Math.abs(delta), available);
      c.distances[p.id] = from + move;
      c.movementRemaining[p.id] = 0;
      emit(
        s,
        'story',
        `${p.name} använder Dash och rör sig ${Math.abs(move)} ft mot ${target.name}.`,
        `${distanceBetween(c, p.id, target.id)} ft återstår. Action används.`,
      );
      break;
    }
    case 'breakthrough': {
      const roll = die(s, 20),
        bonus = Math.max(modifier(p.str), modifier(p.dex));
      if (roll + bonus >= 12) {
        c.breached[p.id] = true;
        emit(
          s,
          'success',
          `${p.name} bryter igenom och kan nå baklinjen.`,
          `T20 ${roll} + ${bonus} mot 12.`,
        );
      } else
        emit(s, 'roll', `${p.name} lyckas inte bryta igenom.`, `T20 ${roll} + ${bonus} mot 12.`);
      break;
    }
    case 'potion':
    case 'herbs':
      healItem(s, p, cmd.type);
      break;
    case 'help': {
      const ally = s.players.find((q) => q.id === cmd.target && q.id !== p.id && q.hp > 0);
      if (!ally) throw new Error('Välj en levande kamrat.');
      c.advantage[ally.id] = true;
      emit(s, 'story', `${p.name} hjälper ${ally.name}.`, 'Nästa vapenattack får fördel.');
      break;
    }
    case 'ability': {
      if (c.used[p.id]) throw new Error('Klassförmågan har redan använts.');
      if (p.className === 'Magiker') {
        const raw = die(s, 6) + Math.max(0, modifier(p.int));
        for (const e of c.enemies.filter((e) => e.hp > 0)) {
          const damage = typedDamage(e, raw, 'Eld');
          e.hp = Math.max(0, e.hp - damage);
          c.stats[p.id].damage += damage;
          emit(s, 'damage', `Brinnande händer träffar ${e.name} för ${damage} eldskada.`);
        }
      } else if (p.className === 'Kleriker') {
        const ally = s.players.find((q) => q.id === (cmd.target ?? p.id));
        if (!ally || ally.hp >= ally.maxHp) throw new Error('Välj någon som behöver läkning.');
        const amount = Math.min(ally.maxHp - ally.hp, die(s, 6) + Math.max(0, modifier(p.wis)));
        ally.hp += amount;
        c.stats[p.id].healing += amount;
        emit(s, 'heal', `${p.name} läker ${ally.name} med Helande ord: +${amount} liv.`);
      } else weaponAttack(s, p, cmd.target, true);
      c.used[p.id] = true;
      break;
    }
    default:
      throw new Error('Det kommandot kan inte användas i strid.');
  }
  if (!evaluate(s)) {
    next(c);
    prepareTurn(s);
  }
}
