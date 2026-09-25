import { describe, it, expect } from 'vitest';
import { getCampaign } from '../packages/content/src';
import { createCharacter } from '../packages/engine/src/characters';
import { createGame, dispatch } from '../packages/engine/src/engine';
import { attackAvailability, canTarget, currentActor } from '../packages/engine/src/combat';
import { gainXp } from '../packages/engine/src/events';
import { parseSave } from '../packages/persistence/src/saves';
import { makeSave } from '../packages/protocol/src/schema';
import type { GameCommand, GameState } from '../packages/engine/src/types';

const campaign = getCampaign('watchtower');
const ranger = (id = 'ranger') =>
  createCharacter({ name: 'Ranger', race: 'human', class: 'ranger', talent: 'keen' }, id);
// Spread seeds: xorshift's first rolls from a tiny seed are always low.
const seedOf = (i: number) => Math.imul(i, 2654435761) >>> 0;

function act(s: GameState, command: GameCommand, actor = currentActor(s)?.id ?? s.players[0].id) {
  const result = dispatch(s, campaign, actor, command);
  if (!result.ok) throw new Error(result.error);
  return result.state;
}
/** Bandit fight at the inn door (real distances), on the ranger's first turn. */
function doorFight(seed: number) {
  let s = createGame(campaign, [ranger()], seed, 'test');
  s = act(s, { type: 'choose', next: 'inn' });
  return act(s, { type: 'choose', next: 'door' });
}
const bandit = (s: GameState, kind: 'melee' | 'ranged') =>
  s.combat!.enemies.find((e) => e.preferredAttack === kind)!;

describe('Ranger', () => {
  it('uses D&D 2024 math: HP, AC, attack and damage come from the ability scores', () => {
    // Standard Array + background: DEX 17 (+3), CON 14 (+2), WIS 14. Species add no scores.
    const p = ranger();
    expect(p).toMatchObject({
      className: 'Ranger',
      weapon: 'Longbow (d8)',
      damageType: 'Stick',
      armor: 'Studded Leather',
      dex: 17,
      con: 14,
      wis: 14,
      maxHp: 12, // d10 max 10 + CON 2
      ac: 15, // Studded Leather 12 + DEX 3
      attackBonus: 5, // proficiency 2 + DEX 3
      damage: [1, 8, 3], // 1d8 + DEX
      hunterMarks: 2, // Favored Enemy
    });
    // Tough: +2 HP; elves get Keen Senses, not AC.
    const elf = createCharacter({ name: 'E', race: 'elf', class: 'ranger', talent: 'iron' }, 'e');
    expect(elf).toMatchObject({ maxHp: 14, ac: 15, attackBonus: 5 });
    const s = createGame(campaign, [p], 1, 'lvl');
    gainXp(s, s.players[0], 300);
    // d10 average 6 + CON 2.
    expect(s.players[0]).toMatchObject({ level: 2, maxHp: 20 });
  });

  it('shoots from the doorway without moving; long range gives Disadvantage', () => {
    const s = doorFight(seedOf(1));
    const p = s.players[0];
    expect(currentActor(s)?.id).toBe(p.id);
    expect(attackAvailability(s, p, bandit(s, 'ranged'))).toEqual({
      ok: true,
      reason: '50 ft bort',
    });
    const far = structuredClone(s);
    bandit(far, 'ranged').distance = 200;
    expect(attackAvailability(far, p, bandit(far, 'ranged')).reason).toContain('long range');
    bandit(far, 'ranged').distance = 700;
    expect(attackAvailability(far, p, bandit(far, 'ranged')).ok).toBe(false);
  });

  it('draws the Shortsword at 5 ft, and Vex gives Advantage on the next attack', () => {
    for (let i = 1; i < 300; i++) {
      let s = doorFight(seedOf(i));
      const melee = bandit(s, 'melee');
      Object.assign(
        s.combat!.enemies.find((e) => e.id === melee.id)!,
        { hp: 99, distance: 5 },
      );
      expect(attackAvailability(s, s.players[0], bandit(s, 'melee')).reason).toBe(
        '5 ft · Shortsword (d6)',
      );
      s = act(s, { type: 'attack', target: melee.id });
      const hit = s.events.find((e) => e.dice?.attackerId === 'ranger' && e.dice.attack.hit);
      if (!hit) continue;
      expect(hit.dice).toMatchObject({
        attackName: 'Shortsword (d6)',
        damage: { sides: 6, bonus: 3 },
      });
      expect(hit.dice!.attack.mode).toBe('normal');
      expect(s.events.some((e) => e.text.startsWith('Vex:'))).toBe(true);
      if (currentActor(s)?.id !== 'ranger' || s.combat!.victory) return;
      s = act(s, { type: 'attack', target: melee.id });
      const next = s.events.filter((e) => e.dice?.attackerId === 'ranger').at(-1)!;
      expect(next.dice!.attack.mode).toBe('advantage');
      return;
    }
    throw new Error('Ingen träff hittades.');
  });

  it("Hunter's Mark is a Bonus Action that keeps the turn and spends a Favored Enemy use", () => {
    let s = doorFight(seedOf(2));
    const p = s.players[0];
    const target = bandit(s, 'ranged');
    s = act(s, { type: 'ability', target: target.id });
    expect(s.combat!.marked[p.id]).toBe(target.id);
    expect(currentActor(s)?.id).toBe(p.id);
    expect(s.players[0].hunterMarks).toBe(1);
    expect(dispatch(s, campaign, p.id, { type: 'ability', target: target.id }).ok).toBe(false);
    s = act(s, { type: 'attack', target: target.id });
    // The attack after the mark was accepted in the same turn.
    expect(s.events.some((e) => e.dice?.attackerId === p.id && e.dice.targetId === target.id)).toBe(
      true,
    );
  });

  it('reaches 90 ft, runs out after two casts and moves for free when the quarry falls', () => {
    const far = doorFight(seedOf(4));
    bandit(far, 'ranged').distance = 95;
    const tooFar = dispatch(far, campaign, 'ranger', {
      type: 'ability',
      target: bandit(far, 'ranged').id,
    });
    expect(tooFar.ok || tooFar.error).toBe("Hunter's Mark når 90 ft.");
    const empty = doorFight(seedOf(4));
    empty.players[0].hunterMarks = 0;
    expect(
      dispatch(empty, campaign, 'ranger', { type: 'ability', target: bandit(empty, 'ranged').id })
        .ok,
    ).toBe(false);

    let s = doorFight(seedOf(5));
    const [first, second] = [bandit(s, 'melee'), bandit(s, 'ranged')];
    s = act(s, { type: 'ability', target: first.id });
    s.combat!.enemies.find((e) => e.id === first.id)!.hp = 0;
    s.combat!.enemies.find((e) => e.id === second.id)!.hp = 99;
    s = act(s, { type: 'defend' });
    if (s.combat!.victory || currentActor(s)?.id !== 'ranger') throw new Error('Rangern föll.');
    expect(s.combat!.used.ranger).toBe(false);
    s = act(s, { type: 'ability', target: second.id });
    expect(s.combat!.marked.ranger).toBe(second.id);
    expect(s.players[0].hunterMarks).toBe(1);
  });

  it('adds 1d6 to hits on the marked target', () => {
    for (let i = 1; i < 300; i++) {
      let s = doorFight(seedOf(i));
      const target = bandit(s, 'ranged');
      s.combat!.enemies.find((e) => e.id === target.id)!.hp = 99;
      s = act(s, { type: 'ability', target: target.id });
      s = act(s, { type: 'attack', target: target.id });
      const hit = s.events.find((e) => e.dice?.attack.hit && e.dice.targetId === target.id);
      if (!hit) continue;
      expect(hit.detail).toMatch(/Hunter's Mark \+[1-6]/);
      const d = hit.dice!.damage!;
      // Dice panel equation stays true to the weapon dice; the mark comes on top.
      expect(d.total).toBe(d.rolls.reduce((a, b) => a + b, 0) + d.bonus);
      const left = s.combat!.enemies.find((e) => e.id === target.id)!.hp;
      expect(99 - left).toBeGreaterThan(d.total);
      return;
    }
    throw new Error('Ingen träff hittades.');
  });

  it('Weapon Mastery Slow cuts an enemy’s movement by 10 ft until the ranger’s next turn', () => {
    for (let i = 1; i < 300; i++) {
      let s = doorFight(seedOf(i));
      const p = s.players[0];
      const melee = bandit(s, 'melee');
      Object.assign(
        s.combat!.enemies.find((e) => e.id === melee.id)!,
        { hp: 99, distance: 60 },
      );
      s = act(s, { type: 'attack', target: melee.id });
      if (!s.events.some((e) => e.text.startsWith('Slow:'))) continue;
      expect(s.events.some((e) => e.text.includes('rör sig 20 ft'))).toBe(true);
      if (currentActor(s)?.id === p.id) expect(s.combat!.slowed).toEqual({});
      return;
    }
    throw new Error('Ingen träff hittades.');
  });

  it('fights from the back line in fights without distances and reaches back-line enemies', () => {
    let s = createGame(
      campaign,
      [
        ranger(),
        createCharacter({ name: 'W', race: 'human', class: 'warrior', talent: 'iron' }, 'w'),
      ],
      5,
      'line',
    );
    s.scene = 'towerExterior';
    s = act(s, { type: 'choose', next: 'towerFight' }, 'ranger');
    const [front, back] = s.combat!.enemies;
    back.position = 'bak';
    expect(front.hp > 0 && s.combat!.positions.ranger).toBe('bak');
    expect(canTarget(s, s.players[0], back)).toBe(true);
    expect(canTarget(s, s.players[1], back)).toBe(false);
  });

  it('keeps marks and slows in saves, and loads older saves without them', () => {
    let s = doorFight(seedOf(3));
    s = act(s, { type: 'ability', target: bandit(s, 'ranged').id });
    expect(parseSave(makeSave(s, 'Mark')).state).toEqual(s);
    const old = makeSave(s, 'Old') as { state: { combat: Record<string, unknown> } };
    delete old.state.combat.marked;
    delete old.state.combat.slowed;
    delete old.state.combat.vexed;
    expect(parseSave(old).state.combat).toMatchObject({ marked: {}, slowed: {}, vexed: {} });
  });
});
