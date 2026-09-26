import type {
  Character,
  Combat,
  DamageType,
  Dice,
  Encounter,
  Enemy,
  GameCommand,
  GameState,
} from './types';
import { die, modifier, rollDamage } from './random';
import { emit, gainXp } from './events';
import { hasFeat, heroD20, hitDie, initiativeBonus, PROFICIENCY } from './traits';
import { weaponName, weaponStats } from './characters';
import { classData } from '../../content/src/characters';
import { weaponData, type WeaponId } from '../../content/src/equipment';

export function currentActor(s: GameState) {
  const c = s.combat;
  // Alert's Initiative Swap is decided before anyone acts.
  if (c?.swapPending) return c.initiative.find((e) => e.id === c.swapPending);
  return c?.initiative[c.turn];
}

export function attackHits(roll: number, bonus: number, ac: number) {
  if (roll === 1) return false;
  if (roll === 20) return true;
  return roll + bonus >= ac;
}
export function canTarget(s: GameState, p: Character, e: Enemy) {
  if (s.combat?.usesDistance) return e.hp > 0;
  return (
    e.hp > 0 &&
    (isRangedHero(p) ||
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

interface HeroAttack {
  kind: 'melee' | 'ranged';
  normalRange: number;
  longRange: number;
  reach: number;
  mastery?: 'slow' | 'vex' | 'sap' | 'graze';
  twoHanded?: boolean;
  /** Finesse or ranged weapons qualify for Sneak Attack. */
  finesse?: boolean;
  /** Overrides for a second weapon; otherwise the character's own weapon is used. */
  name?: string;
  attackBonus?: number;
  damage?: Dice;
  damageType?: DamageType;
}

function weaponProfile(id: WeaponId, masteries: readonly string[]): HeroAttack {
  const w = weaponData[id];
  const ranged = w.kind === 'ranged';
  return {
    kind: w.kind,
    normalRange: 'normalRange' in w ? w.normalRange : 0,
    longRange: 'longRange' in w ? w.longRange : 0,
    reach: ranged ? 0 : 5,
    ...('mastery' in w && masteries.includes(id) ? { mastery: w.mastery } : {}),
    finesse: 'finesse' in w || (ranged && !('spell' in w)),
    twoHanded: 'twoHanded' in w,
  };
}

/** The weapon currently carried as the hero's main weapon (it can be swapped by story loot). */
function primaryWeapon(p: Character): WeaponId | undefined {
  return (Object.keys(weaponData) as WeaponId[]).find((id) =>
    p.weapon.startsWith(weaponData[id].label),
  );
}

/**
 * Picks the hero's weapon for an attack. `distance` is only known in fights with real distances:
 * within 5 ft a melee weapon is drawn, farther away a ranged weapon that reaches.
 */
function heroAttackProfile(p: Character, distance = Infinity): HeroAttack {
  const cls = classData[p.selection.class];
  const rules = 'rules' in cls ? cls.rules : undefined;
  const masteries: readonly string[] = rules?.masteries ?? [];
  const mainId = primaryWeapon(p);
  const main: HeroAttack = mainId
    ? weaponProfile(mainId, masteries)
    : p.weapon.startsWith('Eldpil')
      ? { kind: 'ranged', normalRange: 120, longRange: 120, reach: 0 }
      : // The original game's dagger is a finesse weapon.
        { kind: 'melee', normalRange: 0, longRange: 0, reach: 5, finesse: p.weapon.startsWith('Dolk') };
  if (!rules || distance === Infinity) return main;
  const casting = 'casting' in rules ? rules.casting : undefined;
  const others = (rules.weapons as readonly WeaponId[])
    .filter((id) => id !== mainId)
    .map((id) => {
      const w = weaponData[id];
      const { attackBonus, damage } = weaponStats(id, p, casting);
      return {
        ...weaponProfile(id, masteries),
        name: weaponName(id),
        attackBonus,
        damage,
        damageType: w.damageType,
      };
    });
  const all = [main, ...others];
  if (distance <= 5) return all.find((w) => w.kind === 'melee') ?? main;
  return all.find((w) => w.kind === 'ranged' && distance <= w.longRange) ?? main;
}

export function isRangedHero(p: Character) {
  return heroAttackProfile(p).kind === 'ranged';
}

function enemySpeed(c: Combat, e: Enemy) {
  return Math.max(0, (e.speed ?? 30) - (c.slowed[e.id] ? 10 : 0));
}

export function attackAvailability(s: GameState, p: Character, e: Enemy) {
  if (!canTarget(s, p, e)) return { ok: false, reason: 'Målet kan inte nås.' };
  const c = s.combat;
  if (!c?.usesDistance) return { ok: true, reason: '' };
  const distance = distanceBetween(c, p.id, e.id);
  const profile = heroAttackProfile(p, distance);
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
  const weapon = profile.name ? ` · ${profile.name}` : '';
  if (profile.kind === 'ranged' && distance > profile.normalRange)
    return { ok: true, reason: `${distance} ft${weapon} · long range, nackdel` };
  if (profile.kind === 'ranged' && distance <= 5)
    return { ok: true, reason: `${distance} ft${weapon} · fiende nära, nackdel` };
  if (profile.name) return { ok: true, reason: `${distance} ft${weapon}` };
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
      modifier: modifier(p.dex) + initiativeBonus(p),
    })),
    ...enemies.map((e) => ({
      id: e.id,
      name: e.name,
      kind: 'enemy' as const,
      modifier: modifier(e.dex ?? 10),
    })),
  ]
    .map((entry) => {
      const hero = s.players.find((p) => p.id === entry.id);
      const d20 = () => (hero ? heroD20(s, hero).roll : die(s, 20));
      let roll = d20();
      if (def.surprise === (entry.kind === 'hero' ? 'players' : 'enemies'))
        roll = Math.min(roll, d20());
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
    marked: {},
    slowed: {},
    vexed: {},
    sapped: {},
    bonusUsed: {},
    stats: {},
  };
  for (const p of s.players) {
    c.positions[p.id] = isRangedHero(p) ? 'bak' : 'fram';
    c.distances[p.id] = 0;
    c.movementRemaining[p.id] = p.speed;
    c.reactionUsed[p.id] = false;
    c.stats[p.id] = { damage: 0, taken: 0, crits: 0, healing: 0 };
    // Heroes saved before these rules get their level-1 resources.
    if ((p.selection.class === 'mage' || p.selection.class === 'cleric') && p.spellSlots === undefined)
      p.spellSlots = 2;
    if (p.selection.class === 'paladin' && p.layOnHands === undefined) p.layOnHands = 5;
    if (p.selection.class === 'warrior' && p.secondWind === undefined) p.secondWind = 2;
    refreshAbility(c, p);
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
  // Alert: Initiative Swap right after rolling, if the hero has a living ally to swap with.
  const alert = s.players.find((p) => p.hp > 0 && hasFeat(p, 'keen'));
  if (alert && s.players.some((p) => p.id !== alert.id && p.hp > 0)) {
    c.swapPending = alert.id;
    emit(s, 'story', `Alert: ${alert.name} kan byta initiativ med en kamrat.`);
    return;
  }
  prepareTurn(s);
}

function swapInitiative(s: GameState, p: Character, targetId?: string) {
  const c = s.combat!;
  if (c.swapPending !== p.id) throw new Error('Initiative Swap går bara att välja när striden börjar.');
  c.swapPending = null;
  if (targetId) {
    const ally = s.players.find((q) => q.id === targetId && q.id !== p.id && q.hp > 0);
    if (!ally) throw new Error('Välj en levande kamrat.');
    const a = c.initiative.findIndex((e) => e.id === p.id);
    const b = c.initiative.findIndex((e) => e.id === ally.id);
    const [ea, eb] = [c.initiative[a], c.initiative[b]];
    c.initiative[a] = { ...eb, die: ea.die, modifier: ea.modifier, total: ea.total, tie: ea.tie };
    c.initiative[b] = { ...ea, die: eb.die, modifier: eb.modifier, total: eb.total, tie: eb.tie };
    emit(s, 'story', `${p.name} byter initiativ med ${ally.name}.`, `${ally.name} agerar nu på ${ea.total}, ${p.name} på ${eb.total}.`);
  } else emit(s, 'story', `${p.name} behåller sitt initiativ.`);
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
    const sapped = !!c.sapped[e.id];
    delete c.sapped[e.id];
    if (c.dodging[target.id] || sapped) {
      const second = die(s, 20);
      detail += `/${second} (nackdel)`;
      roll = Math.min(roll, second);
    }
    detail += ` + ${e.attack} = ${roll + e.attack} vs AC ${target.ac}.`;
    if (attackHits(roll, e.attack, target.ac)) {
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
      const move = Math.min(enemySpeed(c, e), Math.max(0, distance - reach));
      e.distance += actorDistance(c, target.id) < e.distance ? -move : move;
      distance = distanceBetween(c, e.id, target.id);
      emit(s, 'story', `${e.name} rör sig ${move} ft mot ${target.name}.`);
    }
    if (distance > reach) {
      const dash = Math.min(enemySpeed(c, e), Math.max(0, distance - reach));
      e.distance += actorDistance(c, target.id) < e.distance ? -dash : dash;
      emit(s, 'story', `${e.name} använder Dash och rör sig ytterligare ${dash} ft.`);
      return;
    }
  } else {
    const longRange = attack.longRange ?? attack.normalRange ?? 0;
    if (distance > longRange) {
      const move = Math.min(enemySpeed(c, e), distance - longRange);
      e.distance += actorDistance(c, target.id) < e.distance ? -move : move;
      distance = distanceBetween(c, e.id, target.id);
      emit(s, 'story', `${e.name} rör sig ${move} ft för att komma inom räckvidd.`);
      if (distance > longRange) return;
    }
  }

  const sapped = !!c.sapped[e.id];
  delete c.sapped[e.id];
  let disadvantage =
    sapped ||
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
  detail += ` + ${attack.attack} = ${roll + attack.attack} vs AC ${ac}.`;
  const hit = attackHits(roll, attack.attack, ac);
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
        for (const [enemy, slower] of Object.entries(c.slowed))
          if (slower === p.id) delete c.slowed[enemy];
        for (const [enemy, sapper] of Object.entries(c.sapped))
          if (sapper === p.id) delete c.sapped[enemy];
        c.bonusUsed[p.id] = false;
        refreshAbility(c, p);
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
/** Healing Rerolls (Healer): a 1 on a healing die is rerolled once. */
function healingDie(s: GameState, healer: Character, sides: number) {
  const roll = die(s, sides);
  return roll === 1 && hasFeat(healer, 'supply') ? die(s, sides) : roll;
}

export function healItem(
  s: GameState,
  p: Character,
  type: 'potion' | 'herbs',
  targetId?: string,
) {
  if (type === 'herbs' && hasFeat(p, 'supply')) return battleMedic(s, p, targetId ?? p.id);
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

/**
 * Healer's Battle Medic: spend a use of the Healer's Kit (herbs) on a creature within 5 ft.
 * That creature spends one of its Hit Point Dice; it regains the roll + the healer's Proficiency.
 */
function battleMedic(s: GameState, p: Character, targetId: string) {
  const target = s.players.find((q) => q.id === targetId);
  if (!target) throw new Error('Välj en kamrat.');
  if (p.herbs <= 0) throw new Error("Ditt Healer's Kit är slut.");
  if (target.hp >= target.maxHp) throw new Error(`${target.name} behöver ingen läkning.`);
  const c = s.combat;
  if (c?.usesDistance && distanceBetween(c, p.id, target.id) > 5)
    throw new Error(`${target.name} är för långt bort. Battle Medic når 5 ft.`);
  const used = target.hitDiceUsed ?? 0;
  if (used >= target.level) throw new Error(`${target.name} har inga Hit Point Dice kvar.`);
  p.herbs--;
  target.hitDiceUsed = used + 1;
  const sides = hitDie(target);
  const roll = healingDie(s, p, sides);
  const amount = Math.min(target.maxHp - target.hp, roll + PROFICIENCY);
  target.hp += amount;
  if (c) c.stats[p.id].healing += amount;
  emit(
    s,
    'heal',
    `${p.name} använder Battle Medic på ${target.id === p.id ? 'sig själv' : target.name}: +${amount} liv.`,
    `Hit Point Die 1d${sides} (${roll}) + Proficiency ${PROFICIENCY}. Healing Rerolls slår om 1:or. ${target.level - target.hitDiceUsed} Hit Point Dice kvar.`,
  );
}
function weaponAttack(s: GameState, p: Character, target: string | undefined) {
  const c = s.combat!,
    e = c.enemies.find((e) => e.id === target);
  if (!e || !canTarget(s, p, e))
    throw new Error('Målet kan inte nås. Bryt igenom framlinjen först.');
  const availability = attackAvailability(s, p, e);
  if (!availability.ok) throw new Error(availability.reason);

  const distance = c.usesDistance ? distanceBetween(c, p.id, e.id) : Infinity;
  const profile = heroAttackProfile(p, distance);
  const weapon = profile.name ?? p.weapon;
  const damageType = profile.damageType ?? p.damageType;
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

  const bonus = profile.attackBonus ?? p.attackBonus;
  const first = heroD20(s, p);
  const attackRolls = [first.roll];
  let luck = first.lucky;
  let roll = attackRolls[0];
  let rollText = `${roll}`;
  const vex = c.vexed[p.id] === e.id;
  delete c.vexed[p.id];
  const advantage = !!c.advantage[p.id] || vex;
  if (c.advantage[p.id]) c.advantage[p.id] = false;
  const mode: 'normal' | 'advantage' | 'disadvantage' =
    advantage === disadvantage ? 'normal' : advantage ? 'advantage' : 'disadvantage';
  if (mode !== 'normal') {
    const extra = heroD20(s, p);
    const second = extra.roll;
    luck ||= extra.lucky;
    attackRolls.push(second);
    rollText += `/${second} (${mode === 'advantage' ? 'fördel' : 'nackdel'})`;
    roll = mode === 'advantage' ? Math.max(roll, second) : Math.min(roll, second);
  }
  if (luck) rollText += ' (Luck: slog om en 1:a)';
  const ac = e.ac + (cover ? 2 : 0);
  const rangeText = c.usesDistance ? ` · ${distance} ft` : '';
  const coverText = cover ? ' · Half Cover +2 AC' : '';
  const detail = `D20 ${rollText} + ${bonus} = ${roll + bonus} vs AC ${ac}${rangeText}${coverText}.`;
  const hit = attackHits(roll, bonus, ac);
  const attackDice = {
    attackerId: p.id,
    targetId: e.id,
    attackName: weapon,
    ...(c.usesDistance ? { distance } : {}),
    ...(cover ? { coverBonus: 2 } : {}),
    damageType,
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
    emit(s, 'roll', `${p.name} missar ${e.name}.`, detail, attackDice);
    // Weapon Mastery Graze: a miss still deals damage equal to the attack's ability modifier.
    const graze = (profile.damage ?? p.damage)[2];
    if (profile.mastery === 'graze' && graze > 0) {
      const amount = typedDamage(e, graze, damageType);
      e.hp = Math.max(0, e.hp - amount);
      c.stats[p.id].damage += amount;
      emit(s, 'damage', `Graze: ${e.name} tar ändå ${amount} skada.`);
      if (!e.hp) emit(s, 'success', `${e.name} faller.`);
    }
    return;
  }
  const critical = roll === 20;
  const [count, sides, damageBonus] = profile.damage ?? p.damage;
  // Great Weapon Fighting: with a two-handed melee weapon, a 1 or 2 on a damage die counts as 3.
  const gwf = !!profile.twoHanded && p.fightingStyles.includes('greatWeaponFighting');
  const rollWeapon = () =>
    Array.from({ length: count * (critical ? 2 : 1) }, () => {
      const roll = die(s, sides);
      return gwf ? Math.max(3, roll) : roll;
    });
  const sum = (rolls: number[]) => rolls.reduce((total, value) => total + value, 0);
  let damageRolls = rollWeapon();
  let savageText = '';
  // Savage Attacker: roll the weapon's damage dice twice and use either roll.
  if (hasFeat(p, 'savage')) {
    const other = rollWeapon();
    savageText = ` Savage Attacker: ${sum(damageRolls)} / ${sum(other)}.`;
    if (sum(other) > sum(damageRolls)) damageRolls = other;
  }
  let raw = Math.max(0, damageBonus + sum(damageRolls));
  // The dice panel shows the weapon roll; Hunter's Mark is reported in the log text.
  const weaponRaw = raw;
  let markText = '';
  if (c.marked[p.id] === e.id) {
    const mark = rollDamage(s, [1, 6, 0], critical);
    raw += mark;
    markText = ` Hunter's Mark +${mark}.`;
  }
  if (sneakAttackApplies(s, p, e, profile, mode)) {
    const sneak = rollDamage(s, [1, 6, 0], critical);
    raw += sneak;
    markText += ` Sneak Attack +${sneak}.`;
  }
  const amount = typedDamage(e, raw, damageType);
  e.hp = Math.max(0, e.hp - amount);
  c.stats[p.id].damage += amount;
  if (critical) c.stats[p.id].crits++;
  emit(
    s,
    'damage',
    `${p.name} träffar ${e.name} för ${amount} ${damageType.toLowerCase()}skada${profile.name ? ` med ${profile.name}` : ''}${critical ? ' — kritisk träff' : ''}.`,
    `${detail}${savageText}${markText}${amount !== raw ? ` ${raw} grundskada; motstånd/sårbarhet tillämpas.` : ''}`,
    {
      ...attackDice,
      damage: {
        sides,
        rolls: damageRolls,
        bonus: damageBonus,
        total: weaponRaw,
        critical,
      },
    },
  );
  if (!e.hp) emit(s, 'success', `${e.name} faller.`);
  else if (profile.mastery === 'slow' && amount > 0) {
    c.slowed[e.id] = p.id;
    if (c.usesDistance)
      emit(s, 'story', `Slow: ${e.name} rör sig 10 ft kortare till ${p.name}s nästa tur.`);
  } else if (profile.mastery === 'vex' && amount > 0) {
    c.vexed[p.id] = e.id;
    emit(s, 'story', `Vex: ${p.name} får Advantage på nästa anfall mot ${e.name}.`);
  } else if (profile.mastery === 'sap') {
    c.sapped[e.id] = p.id;
    emit(s, 'story', `Sap: ${e.name} får Disadvantage på sitt nästa anfall.`);
  }
}

/**
 * Rogue Sneak Attack (1d6 at level 1), once per turn: a Finesse or Ranged weapon, no
 * Disadvantage, and either Advantage or another hero within 5 ft of the target.
 */
function sneakAttackApplies(
  s: GameState,
  p: Character,
  e: Enemy,
  profile: HeroAttack,
  mode: 'normal' | 'advantage' | 'disadvantage',
) {
  if (p.selection.class !== 'thief' || !profile.finesse || mode === 'disadvantage') return false;
  if (mode === 'advantage') return true;
  const c = s.combat!;
  return s.players.some(
    (q) =>
      q.id !== p.id &&
      q.hp > 0 &&
      (c.usesDistance
        ? distanceBetween(c, q.id, e.id) <= 5
        : c.positions[q.id] === 'fram' && e.position === 'fram'),
  );
}
/** Spell Save DC = 8 + Proficiency Bonus + spellcasting ability modifier. */
function spellSaveDc(p: Character, ability: 'int' | 'wis' | 'cha') {
  return 8 + PROFICIENCY + modifier(p[ability]);
}

function spendSlot(p: Character) {
  if (!p.spellSlots) throw new Error('Inga Spell Slots kvar före nästa Long Rest.');
  p.spellSlots--;
}

/** Runs a Bonus Action: the turn continues, and no other Bonus Action this turn. */
function bonusAction(s: GameState, p: Character, run: () => void) {
  const c = s.combat!;
  if (c.bonusUsed[p.id]) throw new Error('Du har redan använt din Bonus Action den här turen.');
  run();
  c.bonusUsed[p.id] = true;
  refreshAbility(c, p);
}

/** Whether the ability button can be used right now (stored in `used` for the UI). */
function refreshAbility(c: Combat, p: Character) {
  const bonusFree = !c.bonusUsed[p.id];
  switch (p.selection.class) {
    case 'warrior':
      c.used[p.id] = !bonusFree || !p.secondWind || p.hp >= p.maxHp;
      return;
    case 'thief':
      c.used[p.id] = true; // Sneak Attack is passive.
      return;
    case 'ranger': {
      const quarry = c.enemies.find((e) => e.id === c.marked[p.id]);
      const canMove = !!quarry && quarry.hp <= 0;
      c.used[p.id] = !bonusFree || !(canMove || (p.hunterMarks ?? 0) > 0);
      return;
    }
    case 'cleric':
      c.used[p.id] = !bonusFree || !p.spellSlots;
      return;
    case 'paladin':
      c.used[p.id] = !bonusFree || !p.layOnHands;
      return;
    case 'mage':
      c.used[p.id] = !p.spellSlots;
  }
}

function huntersMark(s: GameState, p: Character, targetId?: string) {
  const c = s.combat!;
  const e = c.enemies.find((e) => e.id === targetId && e.hp > 0);
  if (!e || !canTarget(s, p, e)) throw new Error('Välj ett mål du kan se.');
  if (c.usesDistance && distanceBetween(c, p.id, e.id) > 90)
    throw new Error("Hunter's Mark når 90 ft.");
  // Moving the mark from a fallen quarry is free; a new cast spends a Favored Enemy use.
  const quarry = c.enemies.find((q) => q.id === c.marked[p.id]);
  const moving = !!quarry && quarry.hp <= 0;
  if (!moving) {
    if (!p.hunterMarks) throw new Error("Inga Hunter's Mark kvar före nästa Long Rest.");
    p.hunterMarks--;
  }
  c.marked[p.id] = e.id;
  emit(
    s,
    'story',
    moving
      ? `${p.name} flyttar Hunter's Mark till ${e.name}.`
      : `${p.name} markerar ${e.name} med Hunter's Mark.`,
    `Bonus Action: träffar mot målet gör +1d6 skada. Du kan fortfarande anfalla den här turen.${moving ? '' : ` ${p.hunterMarks} kvar före nästa Long Rest.`}`,
  );
}

/** Fighter Second Wind: regain 1d10 + Fighter level HP. */
function secondWind(s: GameState, p: Character) {
  if (!p.secondWind) throw new Error('Second Wind är slut före nästa Long Rest.');
  if (p.hp >= p.maxHp) throw new Error('Du har redan fullt HP.');
  p.secondWind--;
  const roll = die(s, 10);
  const amount = Math.min(p.maxHp - p.hp, roll + p.level);
  p.hp += amount;
  s.combat!.stats[p.id].healing += amount;
  emit(
    s,
    'heal',
    `${p.name} använder Second Wind: +${amount} liv.`,
    `1d10 (${roll}) + nivå ${p.level}. Bonus Action. ${p.secondWind} kvar före nästa Long Rest.`,
  );
}

/** Healing Word (level 1): 60 ft, 2d4 + WIS, can bring a fallen ally back. */
function healingWord(s: GameState, p: Character, targetId: string) {
  const c = s.combat!;
  const ally = s.players.find((q) => q.id === targetId);
  if (!ally || ally.hp >= ally.maxHp) throw new Error('Välj någon som behöver läkning.');
  if (c.usesDistance && distanceBetween(c, p.id, ally.id) > 60)
    throw new Error('Healing Word når 60 ft.');
  spendSlot(p);
  const rolls = [healingDie(s, p, 4), healingDie(s, p, 4)];
  const wis = modifier(p.wis);
  const amount = Math.min(ally.maxHp - ally.hp, Math.max(0, rolls[0] + rolls[1] + wis));
  ally.hp += amount;
  c.stats[p.id].healing += amount;
  emit(
    s,
    'heal',
    `${p.name} läker ${ally.id === p.id ? 'sig själv' : ally.name} med Healing Word: +${amount} liv.`,
    `2d4 (${rolls.join(' + ')}) + WIS ${wis}. Bonus Action. ${p.spellSlots} Spell Slots kvar.`,
  );
}

/** Lay On Hands: Bonus Action, touch (5 ft), heal from a pool of 5 HP per Paladin level. */
function layOnHands(s: GameState, p: Character, targetId: string) {
  const c = s.combat!;
  const ally = s.players.find((q) => q.id === targetId);
  if (!ally || ally.hp >= ally.maxHp) throw new Error('Välj någon som behöver läkning.');
  if (c.usesDistance && distanceBetween(c, p.id, ally.id) > 5)
    throw new Error('Lay On Hands kräver beröring (5 ft).');
  if (!p.layOnHands) throw new Error('Lay On Hands-potten är tom före nästa Long Rest.');
  const amount = Math.min(p.layOnHands, ally.maxHp - ally.hp);
  p.layOnHands -= amount;
  ally.hp += amount;
  c.stats[p.id].healing += amount;
  emit(
    s,
    'heal',
    `${p.name} använder Lay On Hands på ${ally.id === p.id ? 'sig själv' : ally.name}: +${amount} liv.`,
    `Bonus Action. ${p.layOnHands} HP kvar i potten.`,
  );
}

/** Burning Hands (level 1): 15 ft cone, 3d6 Fire, DEX save for half. */
function burningHands(s: GameState, p: Character) {
  const c = s.combat!;
  const targets = c.enemies.filter(
    (e) =>
      e.hp > 0 &&
      (c.usesDistance
        ? distanceBetween(c, p.id, e.id) <= 15
        : e.position === 'fram' || !c.enemies.some((x) => x.hp > 0 && x.position === 'fram')),
  );
  if (!targets.length) throw new Error('Ingen fiende står inom 15 ft.');
  spendSlot(p);
  const dc = spellSaveDc(p, 'int');
  const rolls = [die(s, 6), die(s, 6), die(s, 6)];
  const full = rolls[0] + rolls[1] + rolls[2];
  emit(s, 'story', `${p.name} kastar Burning Hands.`, `3d6 (${rolls.join(' + ')}) = ${full} eld · DEX Save DC ${dc} halverar. ${p.spellSlots} Spell Slots kvar.`);
  for (const e of targets) {
    const save = die(s, 20) + modifier(e.dex ?? 10);
    const saved = save >= dc;
    const damage = typedDamage(e, saved ? Math.floor(full / 2) : full, 'Eld');
    e.hp = Math.max(0, e.hp - damage);
    c.stats[p.id].damage += damage;
    emit(
      s,
      'damage',
      `Burning Hands träffar ${e.name} för ${damage} eldskada${saved ? ' (halverad)' : ''}.`,
      `DEX Save ${save} mot DC ${dc}: ${saved ? 'lyckas' : 'misslyckas'}.`,
    );
    if (!e.hp) emit(s, 'success', `${e.name} faller.`);
  }
}

export function combatAction(s: GameState, p: Character, cmd: GameCommand) {
  const c = s.combat!;
  if (c.victory || currentActor(s)?.id !== p.id || p.hp <= 0)
    throw new Error('Det är inte din tur.');
  if (cmd.type === 'swapInitiative') return swapInitiative(s, p, cmd.target);
  if (c.swapPending) throw new Error('Välj först om du vill byta initiativ.');
  switch (cmd.type) {
    case 'attack':
      weaponAttack(s, p, cmd.target);
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
      const roll = heroD20(s, p).roll,
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
      healItem(s, p, cmd.type);
      break;
    case 'herbs':
      healItem(s, p, cmd.type, cmd.target);
      break;
    case 'help': {
      const ally = s.players.find((q) => q.id === cmd.target && q.id !== p.id && q.hp > 0);
      if (!ally) throw new Error('Välj en levande kamrat.');
      c.advantage[ally.id] = true;
      emit(s, 'story', `${p.name} hjälper ${ally.name}.`, 'Nästa vapenattack får fördel.');
      break;
    }
    case 'ability': {
      refreshAbility(c, p);
      if (c.used[p.id]) throw new Error('Klassförmågan kan inte användas nu.');
      switch (p.selection.class) {
        case 'ranger':
          return bonusAction(s, p, () => huntersMark(s, p, cmd.target));
        case 'cleric':
          return bonusAction(s, p, () => healingWord(s, p, cmd.target ?? p.id));
        case 'paladin':
          return bonusAction(s, p, () => layOnHands(s, p, cmd.target ?? p.id));
        case 'mage':
          burningHands(s, p);
          break;
        case 'thief':
          throw new Error('Sneak Attack sker automatiskt när du anfaller.');
        default:
          return bonusAction(s, p, () => secondWind(s, p));
      }
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
