import type { Character, Combat, Encounter, Enemy, GameCommand, GameState } from './types';
import { die, modifier, rollDamage } from './random';
import { emit, gainXp } from './events';

export function currentActor(s: GameState) {
  return s.combat?.initiative[s.combat.turn];
}
export function canTarget(s: GameState, p: Character, e: Enemy) {
  return (
    e.hp > 0 &&
    (p.className === 'Magiker' ||
      s.combat?.breached[p.id] ||
      e.position === 'fram' ||
      !s.combat?.enemies.some((x) => x.hp > 0 && x.position === 'fram'))
  );
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
    };
  });
  if (!enemies.some((e) => e.role === 'boss'))
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
    breached: {},
    stats: {},
  };
  for (const p of s.players) {
    c.positions[p.id] = p.className === 'Magiker' ? 'bak' : 'fram';
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
      'Försvara dig eller låt en krigare skydda dig.',
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
  const protector = c.protectedBy[target.id];
  const ac =
    target.ac + (protector && s.players.some((p) => p.id === protector && p.hp > 0) ? 2 : 0);
  detail += ` + ${e.attack} mot försvar ${ac}.`;
  if (roll !== 1 && (roll === 20 || roll + e.attack >= ac)) {
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
        for (const [target, protector] of Object.entries(c.protectedBy))
          if (protector === p.id) delete c.protectedBy[target];
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
  const power = special && p.className === 'Krigare';
  const bonus = p.attackBonus - (power ? 3 : 0);
  let roll = die(s, 20);
  let rollText = `${roll}`;
  if (c.advantage[p.id]) {
    const second = die(s, 20);
    rollText += `/${second} (fördel)`;
    roll = Math.max(roll, second);
    c.advantage[p.id] = false;
  }
  const detail = `T20 ${rollText} + ${bonus} mot försvar ${e.ac}.`;
  if (roll === 1 || (roll !== 20 && roll + bonus < e.ac)) {
    emit(s, 'roll', `${p.name} missar ${e.name}.`, detail);
    return;
  }
  const critical = roll === 20;
  let raw = rollDamage(s, p.damage, critical);
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
    case 'move':
      c.positions[p.id] = c.positions[p.id] === 'fram' ? 'bak' : 'fram';
      emit(
        s,
        'story',
        `${p.name} flyttar till ${c.positions[p.id] === 'fram' ? 'framlinjen' : 'baklinjen'}.`,
      );
      break;
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
    case 'protect': {
      const ally = s.players.find((q) => q.id === cmd.target && q.hp > 0);
      if (p.className !== 'Krigare' || c.used[p.id] || !ally)
        throw new Error('Skydda är inte tillgänglig.');
      c.used[p.id] = true;
      c.protectedBy[ally.id] = p.id;
      emit(
        s,
        'story',
        `${p.name} skyddar ${ally.name}.`,
        '+2 försvar till krigarens nästa tur. Delar användning med Kraftslag.',
      );
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
