import { describe, it, expect } from 'vitest';
import { campaigns, getCampaign, pregenData } from '../packages/content/src';
import { createCharacter } from '../packages/engine/src/characters';
import { createGame, dispatch } from '../packages/engine/src/engine';
import { attackAvailability, currentActor } from '../packages/engine/src/combat';
import { parseTestParams } from '../packages/engine/src/testing';
import { parseSave } from '../packages/persistence/src/saves';
import { makeSave } from '../packages/protocol/src/schema';
import type { Character, GameCommand, GameState, PregenId } from '../packages/engine/src/types';

const campaign = getCampaign('watchtower');
const pregen = (id: PregenId, heroId: string = id) =>
  createCharacter(
    { name: '', race: 'human', class: 'warrior', talent: 'iron', pregen: id },
    heroId,
  );
const seedOf = (i: number) => Math.imul(i, 2654435761) >>> 0;
function act(s: GameState, command: GameCommand, actor = currentActor(s)!.id) {
  const r = dispatch(s, campaign, actor, command);
  if (!r.ok) throw new Error(r.error);
  return r.state;
}
/** The bandit fight at the inn door, on the first hero's turn (enemies may act first). */
function doorFight(heroes: Character[], seed: number) {
  let s = createGame(campaign, heroes, seed, 'g');
  s = act(s, { type: 'choose', next: 'inn' }, heroes[0].id);
  s = act(s, { type: 'choose', next: 'door' }, heroes[0].id);
  if (s.combat!.swapPending) s = act(s, { type: 'swapInitiative' });
  return s;
}
const bandit = (s: GameState, kind: 'melee' | 'ranged') =>
  s.combat!.enemies.find((e) => e.preferredAttack === kind)!;
/** First seed whose fight starts on `heroId`'s turn with everyone standing. */
function onTurnOf(
  heroes: () => Character[],
  heroId: string,
  setup: (s: GameState) => void = () => {},
) {
  for (let i = 1; i < 400; i++) {
    const s = doorFight(heroes(), seedOf(i));
    if (currentActor(s)?.id !== heroId || s.players.some((p) => p.hp < p.maxHp)) continue;
    setup(s);
    return s;
  }
  throw new Error('Inget frö gav rätt turordning.');
}

describe('färdiga hjältar enligt D&D 2024, nivå 1', () => {
  it('has five named heroes built with the Standard Array plus a background', () => {
    const array = [15, 14, 13, 12, 10, 8];
    for (const [id, hero] of Object.entries(pregenData)) {
      const bonus = { Soldier: 3, Hermit: 3, Criminal: 3 }[hero.background];
      const scores = Object.values(hero.scores);
      expect(
        scores.reduce((a, b) => a + b, 0),
        id,
      ).toBe(array.reduce((a, b) => a + b, 0) + bonus);
      expect(pregen(id as PregenId).name).toBe(hero.name);
    }
    expect(Object.keys(pregenData)).toHaveLength(5);
  });

  it('Sigrun, Human Paladin: Chain Mail + Shield, Longsword, Lay On Hands 5', () => {
    expect(pregen('sigrun')).toMatchObject({
      className: 'Paladin',
      race: 'Human',
      talent: 'Savage Attacker',
      str: 17,
      con: 14,
      maxHp: 12,
      ac: 18,
      attackBonus: 5,
      damage: [1, 8, 3],
      weapon: 'Longsword (d8)',
      armor: 'Chain Mail',
      shield: true,
      layOnHands: 5,
    });
  });
  it('Brodd, Dwarf Cleric: Chain Shirt + Shield, Mace, 2 Spell Slots, Healer', () => {
    expect(pregen('brodd')).toMatchObject({
      className: 'Cleric',
      race: 'Dwarf',
      talent: 'Healer',
      wis: 17,
      con: 15,
      maxHp: 11,
      ac: 15,
      attackBonus: 3,
      damage: [1, 6, 1],
      weapon: 'Mace (d6)',
      armor: 'Chain Shirt',
      shield: true,
      spellSlots: 2,
      herbs: 2,
    });
  });
  it('Pip, Halfling Rogue: Leather Armor, Shortsword (finesse, DEX)', () => {
    expect(pregen('pip')).toMatchObject({
      className: 'Rogue',
      race: 'Halfling',
      talent: 'Alert',
      dex: 17,
      maxHp: 10,
      ac: 14,
      attackBonus: 5,
      damage: [1, 6, 3],
      weapon: 'Shortsword (d6)',
      armor: 'Leather Armor',
    });
  });
  it('Liria, Elf Ranger: Studded Leather, Longbow, Hunter’s Mark ×2', () => {
    expect(pregen('liria')).toMatchObject({
      className: 'Ranger',
      race: 'Elf',
      dex: 17,
      maxHp: 12,
      ac: 15,
      attackBonus: 5,
      damage: [1, 8, 3],
      weapon: 'Longbow (d8)',
      armor: 'Studded Leather',
      hunterMarks: 2,
    });
  });
  it('Alma, Human Wizard: no armor, Fire Bolt 1d10 (INT, no damage modifier), 2 Spell Slots', () => {
    expect(pregen('alma')).toMatchObject({
      className: 'Wizard',
      int: 17,
      maxHp: 8,
      ac: 11,
      attackBonus: 5,
      damage: [1, 10, 0],
      damageType: 'Eld',
      weapon: 'Fire Bolt (d10)',
      armor: 'Robe',
      spellSlots: 2,
    });
  });

  it('Paladin throws a Javelin at range, draws the Longsword at 5 ft, and Sap weakens the next enemy attack', () => {
    const s = onTurnOf(() => [pregen('sigrun', 'p')], 'p');
    const p = s.players[0];
    expect(attackAvailability(s, p, bandit(s, 'ranged')).reason).toBe(
      '50 ft · Javelin (d6) · long range, nackdel',
    );
    bandit(s, 'ranged').distance = 30;
    expect(attackAvailability(s, p, bandit(s, 'ranged')).reason).toBe('30 ft · Javelin (d6)');
    bandit(s, 'melee').distance = 5;
    expect(attackAvailability(s, p, bandit(s, 'melee')).reason).toBe(
      '5 ft bort' /* main weapon: Longsword */,
    );
    for (let i = 1; i < 400; i++) {
      const t = onTurnOf(
        () => [pregen('sigrun', 'p')],
        'p',
        (x) => {
          Object.assign(bandit(x, 'melee'), { distance: 5, hp: 99 });
        },
      );
      t.seed = seedOf(i);
      const after = act(t, { type: 'attack', target: bandit(t, 'melee').id });
      if (!after.events.some((e) => e.text.startsWith('Sap:'))) continue;
      const reply = after.events.find(
        (e) => e.dice?.attackerId === bandit(after, 'melee').id && e.id > t.eventSeq,
      );
      if (reply) expect(reply.dice!.attack.mode).toBe('disadvantage');
      return;
    }
    throw new Error('Ingen träff hittades.');
  });

  it('Lay On Hands is a Bonus Action that heals from the pool and keeps the turn', () => {
    let s = onTurnOf(() => [pregen('sigrun', 'p')], 'p');
    s.players[0].hp = 4;
    s = act(s, { type: 'ability', target: 'p' });
    expect(s.players[0]).toMatchObject({ hp: 9, layOnHands: 0 });
    expect(currentActor(s)?.id).toBe('p');
    expect(s.combat!.used.p).toBe(true);
    s = act(s, { type: 'attack', target: bandit(s, 'ranged').id });
  });

  it('Healing Word: Bonus Action, 2d4 + WIS on an ally (even a fallen one), one slot, one per turn', () => {
    let s = onTurnOf(() => [pregen('brodd', 'c'), pregen('sigrun', 'p')], 'c');
    s.players[1].hp = 0;
    s = act(s, { type: 'ability', target: 'p' });
    const healed = s.players[1].hp;
    expect(healed).toBeGreaterThanOrEqual(2 + 3);
    expect(healed).toBeLessThanOrEqual(8 + 3);
    expect(s.players[0].spellSlots).toBe(1);
    expect(currentActor(s)?.id).toBe('c');
    expect(dispatch(s, campaign, 'c', { type: 'ability', target: 'p' }).ok).toBe(false);
  });

  it('Rogue Sneak Attack needs Advantage or an ally within 5 ft of the target', () => {
    const find = (withAlly: boolean) => {
      for (let i = 1; i < 400; i++) {
        const heroes = () =>
          withAlly ? [pregen('pip', 'r'), pregen('sigrun', 'p')] : [pregen('pip', 'r')];
        const s = onTurnOf(heroes, 'r', (x) =>
          Object.assign(bandit(x, 'melee'), { distance: 5, hp: 99 }),
        );
        s.seed = seedOf(i);
        const after = act(s, { type: 'attack', target: bandit(s, 'melee').id });
        const hit = after.events.find(
          (e) => e.dice?.attackerId === 'r' && e.dice.attack.hit && e.dice.attack.mode === 'normal',
        );
        if (hit) return hit.detail!;
      }
      throw new Error('Ingen träff hittades.');
    };
    expect(find(true)).toContain('Sneak Attack +');
    expect(find(false)).not.toContain('Sneak Attack');
  });

  it('Burning Hands: a slot, enemies within 15 ft, DEX save against DC 13 halves', () => {
    let s = onTurnOf(
      () => [pregen('alma', 'w')],
      'w',
      (x) => {
        Object.assign(bandit(x, 'melee'), { distance: 10, hp: 99 });
        Object.assign(bandit(x, 'ranged'), { distance: 50, hp: 99 });
      },
    );
    s = act(s, { type: 'ability' });
    const hits = s.events.filter((e) => e.text.startsWith('Burning Hands träffar'));
    expect(hits).toHaveLength(1);
    expect(hits[0].detail).toMatch(/DEX Save \d+ mot DC 13/);
    expect(s.players[0].spellSlots).toBe(1);
  });

  it('works in test-mode links and survives a save round-trip', () => {
    const test = parseTestParams(new URLSearchParams('scen=door&hjalte=brodd'), campaigns)!;
    expect(test.selection).toMatchObject({ pregen: 'brodd', class: 'cleric', race: 'dwarf' });
    const s = createGame(campaign, [pregen('brodd')], 3, 'g');
    expect(parseSave(makeSave(s, 'Pregen')).state).toEqual(s);
  });

  describe('Fighter', () => {
    const fighter = (id = 'f') =>
      createCharacter({ name: 'F', race: 'human', class: 'warrior', talent: 'iron' }, id);
    it('Chain Mail, Greatsword, Great Weapon Fighting and two Second Winds', () => {
      expect(fighter()).toMatchObject({
        className: 'Fighter',
        str: 17,
        con: 14,
        maxHp: 14, // d10 + CON 2 + Tough 2
        ac: 16,
        attackBonus: 5,
        damage: [2, 6, 3],
        weapon: 'Greatsword (2d6)',
        armor: 'Chain Mail',
        fightingStyles: ['greatWeaponFighting'],
        secondWind: 2,
      });
    });
    it('Great Weapon Fighting turns 1s and 2s into 3s; Graze still hurts on a miss', () => {
      let sawHit = false;
      let sawGraze = false;
      for (let i = 1; i < 400 && !(sawHit && sawGraze); i++) {
        const t = onTurnOf(
          () => [fighter()],
          'f',
          (x) => Object.assign(bandit(x, 'melee'), { distance: 5, hp: 99 }),
        );
        t.seed = seedOf(i);
        const after = act(t, { type: 'attack', target: bandit(t, 'melee').id });
        const swing = after.events.find((e) => e.dice?.attackerId === 'f' && e.id > t.eventSeq)!;
        if (swing.dice!.attack.hit) {
          sawHit = true;
          expect(Math.min(...swing.dice!.damage!.rolls)).toBeGreaterThanOrEqual(3);
        } else if (after.events.some((e) => e.text.startsWith('Graze:'))) {
          sawGraze = true;
          expect(after.combat!.enemies.find((e) => e.preferredAttack === 'melee')!.hp).toBe(96);
        }
      }
      expect(sawHit && sawGraze).toBe(true);
    });
    it('Second Wind heals 1d10 + level as a Bonus Action and keeps the turn', () => {
      let s = onTurnOf(() => [fighter()], 'f');
      s.players[0].hp = 1;
      s = act(s, { type: 'ability' });
      expect(s.players[0].hp).toBeGreaterThanOrEqual(1 + 2);
      expect(s.players[0].hp).toBeLessThanOrEqual(1 + 11);
      expect(currentActor(s)?.id).toBe('f');
    });
  });
});
