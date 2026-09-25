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
  it('is a D&D 2024-style ranger with a longbow and a d10 hit die', () => {
    const p = ranger();
    expect(p).toMatchObject({
      className: 'Ranger',
      weapon: 'Longbow (d8)',
      damage: [1, 8, 2],
      damageType: 'Stick',
      armor: 'Studded Leather',
      dex: 16,
      wis: 15,
      maxHp: 14,
      ac: 14,
      attackBonus: 6,
    });
    const s = createGame(campaign, [p], 1, 'lvl');
    gainXp(s, s.players[0], 300);
    // d10 average 6 + CON 14 (+2).
    expect(s.players[0]).toMatchObject({ level: 2, maxHp: 22 });
  });

  it('shoots from the doorway without moving; long range and point blank give Disadvantage', () => {
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
    bandit(far, 'melee').distance = 5;
    expect(attackAvailability(far, p, bandit(far, 'melee')).reason).toContain('nackdel');
  });

  it("Hunter's Mark is a once-per-fight Bonus Action that keeps the turn", () => {
    let s = doorFight(seedOf(2));
    const p = s.players[0];
    const target = bandit(s, 'ranged');
    s = act(s, { type: 'ability', target: target.id });
    expect(s.combat!.marked[p.id]).toBe(target.id);
    expect(currentActor(s)?.id).toBe(p.id);
    expect(dispatch(s, campaign, p.id, { type: 'ability', target: target.id }).ok).toBe(false);
    s = act(s, { type: 'attack', target: target.id });
    // The attack after the mark was accepted in the same turn.
    expect(s.events.some((e) => e.dice?.attackerId === p.id && e.dice.targetId === target.id)).toBe(
      true,
    );
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
    expect(parseSave(old).state.combat).toMatchObject({ marked: {}, slowed: {} });
  });
});
