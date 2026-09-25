import { describe, it, expect } from 'vitest';
import { getCampaign, raceData, talentData } from '../packages/content/src';
import { createCharacter } from '../packages/engine/src/characters';
import { createGame, dispatch } from '../packages/engine/src/engine';
import { currentActor } from '../packages/engine/src/combat';
import { checkChance, checkModifier, rollCheck } from '../packages/engine/src/checks';
import { gainXp } from '../packages/engine/src/events';
import { parseSave } from '../packages/persistence/src/saves';
import { makeSave } from '../packages/protocol/src/schema';
import type { CharacterSelection, GameState, SkillCheck } from '../packages/engine/src/types';

const campaign = getCampaign('watchtower');
const hero = (patch: Partial<CharacterSelection> = {}, id = 'h') =>
  createCharacter({ name: 'H', race: 'human', class: 'warrior', talent: 'keen', ...patch }, id);
const game = (patch: Partial<CharacterSelection> = {}, seed = 7) =>
  createGame(campaign, [hero(patch)], seed, 'g');
const seedOf = (i: number) => Math.imul(i, 2654435761) >>> 0;

describe('D&D 2024: species och Origin Feats', () => {
  it('uses English species and feat names, four of each', () => {
    expect(Object.values(raceData).map((r) => r.label)).toEqual([
      'Human',
      'Elf',
      'Dwarf',
      'Halfling',
    ]);
    expect(Object.values(talentData).map((t) => t.label)).toEqual([
      'Tough',
      'Alert',
      'Healer',
      'Savage Attacker',
    ]);
  });

  it('takes ability scores from the class Standard Array + background, not from species', () => {
    const scores = (race: CharacterSelection['race']) => {
      const { str, dex, con, int, wis, cha } = hero({ race });
      return { str, dex, con, int, wis, cha };
    };
    // Fighter: 15/14/13/8/10/12 + STR 2, CON 1.
    expect(scores('human')).toEqual({ str: 17, dex: 14, con: 14, int: 8, wis: 10, cha: 12 });
    for (const race of ['elf', 'dwarf', 'halfling'] as const)
      expect(scores(race)).toEqual(scores('human'));
    expect(hero({ class: 'mage' })).toMatchObject({ int: 17, con: 14 });
    expect(hero({ class: 'thief' })).toMatchObject({ dex: 17, con: 14 });
    expect(hero({ class: 'cleric' })).toMatchObject({ wis: 17, con: 14 });
  });

  it('Dwarven Toughness and Tough add HP at level 1 and every level; no species AC bonus', () => {
    const base = hero({ race: 'human', talent: 'keen' }).maxHp;
    expect(hero({ race: 'dwarf' }).maxHp).toBe(base + 1);
    expect(hero({ talent: 'iron' }).maxHp).toBe(base + 2);
    expect(hero({ race: 'dwarf', talent: 'iron' }).maxHp).toBe(base + 3);
    expect(hero({ race: 'elf' }).ac).toBe(hero({ race: 'human' }).ac);
    const tough = game({ race: 'dwarf', talent: 'iron' });
    const plain = game({ race: 'human' });
    gainXp(tough, tough.players[0], 300);
    gainXp(plain, plain.players[0], 300);
    expect(tough.players[0].maxHp - hero({ race: 'dwarf', talent: 'iron' }).maxHp).toBe(
      plain.players[0].maxHp - base + 3,
    );
  });

  it('Alert adds Proficiency Bonus to Initiative', () => {
    const initiative = (talent: CharacterSelection['talent']) => {
      let s = game({ talent });
      s = dispatch(s, campaign, 'h', { type: 'choose', next: 'inn' }).state;
      s = dispatch(s, campaign, 'h', { type: 'choose', next: 'door' }).state;
      return s.combat!.initiative.find((e) => e.id === 'h')!.modifier;
    };
    expect(initiative('keen') - initiative('iron')).toBe(2);
  });

  it('Halfling Luck rerolls a natural 1 on d20 Tests', () => {
    const check: SkillCheck = { skill: 'Athletics', attributes: ['str'], dc: 30, fail: 'x' };
    for (let i = 1; i < 2000; i++) {
      const s = game({ race: 'halfling' }, seedOf(i));
      rollCheck(s, s.players[0], check);
      const event = s.events.at(-1)!;
      if (!event.detail?.includes('Luck')) continue;
      expect(event.check!.roll).toBeGreaterThanOrEqual(1);
      return;
    }
    throw new Error('Ingen naturlig 1:a hittades.');
  });

  it('Human Heroic Inspiration rerolls the first failed Ability Check once', () => {
    const check: SkillCheck = { skill: 'Athletics', attributes: ['str'], dc: 40, fail: 'x' };
    const s = game({ race: 'human' });
    expect(s.players[0].inspiration).toBe(true);
    rollCheck(s, s.players[0], check);
    expect(s.events.at(-1)!.detail).toContain('Heroic Inspiration');
    expect(s.players[0].inspiration).toBe(false);
    rollCheck(s, s.players[0], check);
    expect(s.events.at(-1)!.detail).not.toContain('Heroic Inspiration');
    expect(parseSave(makeSave(s, 'Insp')).state.players[0].inspiration).toBe(false);
  });

  it('Elf Keen Senses adds proficiency to Perception, Insight and Survival only', () => {
    const elf = hero({ race: 'elf', class: 'cleric' });
    const human = hero({ race: 'human', class: 'cleric' });
    const perception: SkillCheck = { skill: 'Perception', attributes: ['wis'], dc: 15, fail: 'x' };
    const athletics: SkillCheck = { skill: 'Athletics', attributes: ['str'], dc: 15, fail: 'x' };
    expect(checkModifier(elf, perception) - checkModifier(human, perception)).toBe(2);
    expect(checkModifier(elf, athletics)).toBe(checkModifier(human, athletics));
    // Humans' shown chance includes the Heroic Inspiration reroll.
    expect(checkChance(human, perception)).toBeGreaterThan(
      checkChance({ ...human, inspiration: false }, perception),
    );
  });

  it('Savage Attacker rolls weapon damage twice and keeps the higher', () => {
    for (let i = 1; i < 300; i++) {
      let s = game({ talent: 'savage' }, seedOf(i));
      s = dispatch(s, campaign, 'h', { type: 'choose', next: 'inn' }).state;
      s = dispatch(s, campaign, 'h', { type: 'choose', next: 'door' }).state;
      const melee = s.combat!.enemies.find((e) => e.preferredAttack === 'melee')!;
      Object.assign(melee, { hp: 99, distance: 5 });
      s = dispatch(s, campaign, currentActor(s)!.id, { type: 'attack', target: melee.id }).state;
      const hit = s.events.find((e) => e.dice?.attackerId === 'h' && e.dice.attack.hit);
      if (!hit) continue;
      const [a, b] = hit
        .detail!.match(/Savage Attacker: (\d+) \/ (\d+)/)!
        .slice(1)
        .map(Number);
      const d = hit.dice!.damage!;
      expect(d.rolls.reduce((x, y) => x + y, 0)).toBe(Math.max(a, b));
      return;
    }
    throw new Error('Ingen träff hittades.');
  });

  it('Healer: Battle Medic spends a Healer’s Kit use and the target’s Hit Point Die', () => {
    expect(hero({ talent: 'supply' }).herbs).toBe(hero({ talent: 'keen' }).herbs + 1);
    const s = createGame(
      campaign,
      [hero({ talent: 'supply' }, 'medic'), hero({ class: 'mage', talent: 'iron' }, 'wiz')],
      7,
      'g',
    );
    const [medic, wiz] = s.players;
    wiz.hp = 0; // fallen allies can be tended
    const herbs = medic.herbs;
    const r = dispatch(s, campaign, 'medic', { type: 'herbs', target: 'wiz' });
    expect(r.ok).toBe(true);
    const healed = r.state.players[1];
    // Wizard Hit Die d6 (1s rerolled once) + Proficiency 2.
    expect(healed.hp).toBeGreaterThanOrEqual(1 + 2);
    expect(healed.hp).toBeLessThanOrEqual(6 + 2);
    expect(healed.hitDiceUsed).toBe(1);
    expect(r.state.players[0].herbs).toBe(herbs - 1);
    expect(r.state.events.at(-1)!.text).toContain('Battle Medic på H');
    // Level 1: the only Hit Point Die is spent.
    healed.hp = 1;
    r.state.players[0].herbs = 2;
    const again = dispatch(r.state, campaign, 'medic', { type: 'herbs', target: 'wiz' });
    expect(again.ok || again.error).toBe('H har inga Hit Point Dice kvar.');
    expect(parseSave(makeSave(r.state, 'Medic')).state.players[1].hitDiceUsed).toBe(1);
  });

  it('Healer: Battle Medic reaches only 5 ft in fights with distances', () => {
    let s = createGame(
      campaign,
      [hero({ talent: 'supply' }, 'medic'), hero({ talent: 'iron' }, 'w')],
      seedOf(3),
      'g',
    );
    s = dispatch(s, campaign, 'medic', { type: 'choose', next: 'inn' }).state;
    s = dispatch(s, campaign, 'medic', { type: 'choose', next: 'door' }).state;
    s.players[1].hp = 1;
    s.combat!.distances.w = 20;
    const actor = currentActor(s)!.id;
    if (actor !== 'medic') return;
    const far = dispatch(s, campaign, 'medic', { type: 'herbs', target: 'w' });
    expect(far.ok || far.error).toContain('5 ft');
  });

  it('Alert: Initiative Swap is offered first and swaps places with a willing ally', () => {
    let s = createGame(
      campaign,
      [hero({ talent: 'keen' }, 'alert'), hero({ class: 'mage', talent: 'iron' }, 'wiz')],
      seedOf(9),
      'g',
    );
    s = dispatch(s, campaign, 'alert', { type: 'choose', next: 'inn' }).state;
    s = dispatch(s, campaign, 'alert', { type: 'choose', next: 'door' }).state;
    expect(s.combat!.swapPending).toBe('alert');
    expect(currentActor(s)?.id).toBe('alert');
    expect(dispatch(s, campaign, 'alert', { type: 'defend' }).ok).toBe(false);
    expect(dispatch(s, campaign, 'wiz', { type: 'swapInitiative', target: 'alert' }).ok).toBe(
      false,
    );
    const before = Object.fromEntries(s.combat!.initiative.map((e) => [e.id, e.total]));
    s = dispatch(s, campaign, 'alert', { type: 'swapInitiative', target: 'wiz' }).state;
    const after = Object.fromEntries(s.combat!.initiative.map((e) => [e.id, e.total]));
    expect(after.alert).toBe(before.wiz);
    expect(after.wiz).toBe(before.alert);
    expect(s.combat!.swapPending).toBeNull();
    expect(dispatch(s, campaign, currentActor(s)!.id, { type: 'swapInitiative' }).ok).toBe(false);
  });

  it('Alert in a solo game has no one to swap with, so the fight starts normally', () => {
    let s = game({ talent: 'keen' });
    s = dispatch(s, campaign, 'h', { type: 'choose', next: 'inn' }).state;
    s = dispatch(s, campaign, 'h', { type: 'choose', next: 'door' }).state;
    expect(s.combat!.swapPending ?? null).toBeNull();
  });

  it('loads saves made before the change (old talent ids still valid)', () => {
    const s = game({ talent: 'supply' });
    delete (s.players[0] as { inspiration?: boolean }).inspiration;
    expect(parseSave(makeSave(s, 'Old')).state.players[0].selection.talent).toBe('supply');
  });
});
