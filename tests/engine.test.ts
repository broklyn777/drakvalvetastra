import { describe, it, expect } from 'vitest';
import { campaigns, getCampaign, raceData, classData, talentData } from '../packages/content/src';
import { createCharacter, createLevel1PaladinPreset } from '../packages/engine/src/characters';
import { availableChoices, createGame, dispatch, sceneFor } from '../packages/engine/src/engine';
import { attackAvailability, attackHits, canTarget, currentActor, startCombat, typedDamage } from '../packages/engine/src/combat';
import { gainXp } from '../packages/engine/src/events';
import { parseSave } from '../packages/persistence/src/saves';
import { makeSave } from '../packages/protocol/src/schema';
import type { CharacterSelection, GameCommand, GameState } from '../packages/engine/src/types';
const campaign = getCampaign('watchtower');
const selection: CharacterSelection = {
  name: 'Astrid',
  race: 'dwarf',
  class: 'warrior',
  talent: 'iron',
};
function game(seed = 42, count = 1) {
  return createGame(
    campaign,
    Array.from({ length: count }, (_, i) =>
      createCharacter({ ...selection, name: `Hjälte ${i + 1}` }, `hero-${i}`),
    ),
    seed,
    'test',
  );
}
function action(s: GameState, command: GameCommand, actor?: string) {
  const result = dispatch(
    s,
    getCampaign(s.campaignId),
    actor ?? (s.combat && !s.combat.victory ? currentActor(s)?.id : undefined) ?? s.players[0].id,
    command,
  );
  if (!result.ok) throw new Error(result.error);
  return result.state;
}
function choose(s: GameState, next: string) {
  return action(s, { type: 'choose', next });
}
function battle(s: GameState) {
  for (let i = 0; i < 200 && s.combat && !s.combat.victory && s.status === 'active'; i++) {
    const p = s.players.find((p) => p.id === currentActor(s)?.id)!;
    const target = s.combat.enemies.find((e) => canTarget(s, p, e))!;
    const availability = attackAvailability(s, p, target);
    if (!availability.ok && s.combat.usesDistance) {
      if ((s.combat.movementRemaining[p.id] ?? 0) > 0)
        s = action(s, { type: 'move', target: target.id });
      else s = action(s, { type: 'dash', target: target.id });
    } else if (p.hp < p.maxHp * 0.6 && p.potions) s = action(s, { type: 'potion' });
    else if (!s.combat.used[p.id]) s = action(s, { type: 'ability', target: target.id });
    else s = action(s, { type: 'attack', target: target.id });
  }
  return s;
}
describe('kampanj och karaktärer', () => {
  it('preserves all 42 scenes and validates every destination in both campaigns', () => {
    for (const campaign of Object.values(campaigns)) {
      const s = createGame(campaign, [createCharacter(selection, 'hero')], 10, 'game');
      // Unlock every conditional branch to verify all edges as well as initial edges.
      for (const flags of [false, true]) {
        Object.assign(s.players[0], {
          sigil: flags,
          rope: flags,
          towerKey: flags,
          bossWeakened: flags,
        });
        Object.assign(s.world, {
          miraTrail: flags,
          edricTrust: flags ? 3 : 0,
          openedVault: flags,
          leftSealed: flags,
        });
        const scenes = campaign.scenes(s, 'hero');
        expect(Object.keys(scenes)).toHaveLength(42);
        for (const scene of Object.values(scenes)) {
          const choices =
            typeof scene.choices === 'function' ? scene.choices() : (scene.choices ?? []);
          for (const [, next] of choices)
            if (next !== 'restart') expect(scenes[next], next).toBeDefined();
          if (scene.combat) expect(scenes[scene.combat.onWin]).toBeDefined();
        }
      }
    }
  });
  it('builds all 48 valid combinations with the correct XP threshold', () => {
    for (const race of Object.keys(raceData))
      for (const cls of Object.keys(classData))
        for (const talent of Object.keys(talentData)) {
          const p = createCharacter(
            {
              ...selection,
              race: race as CharacterSelection['race'],
              class: cls as CharacterSelection['class'],
              talent: talent as CharacterSelection['talent'],
            },
            'hero',
          );
          expect(p.maxHp).toBeGreaterThan(0);
          expect(p.hp).toBe(p.maxHp);
          expect(p.nextXp).toBe(300);
        }
  });
  it('never mutates input and rejects unavailable scenes, actors and stale revisions', () => {
    const s = game(),
      before = JSON.stringify(s);
    for (const result of [
      dispatch(s, campaign, 'hero-0', { type: 'choose', next: 'vault' }),
      dispatch(s, campaign, 'intruder', { type: 'choose', next: 'inn' }),
      dispatch(s, campaign, 'hero-0', { type: 'choose', next: 'inn' }, 2),
    ])
      expect(result.ok).toBe(false);
    choose(s, 'inn');
    expect(JSON.stringify(s)).toBe(before);
  });
  it('evaluates warnings and sigils at scene entry instead of initial script load', () => {
    const s = game();
    s.scene = 'towerHall';
    s.players[0].bossWeakened = true;
    expect(campaign.scenes(s, 'hero-0').cryptBeast.combat!.enemies[0].hp).toBe(12);
    s.players[0].bossWeakened = false;
    expect(campaign.scenes(s, 'hero-0').cryptBeast.combat!.enemies[0].hp).toBe(16);
  });
  it('unlocks shared equipment routes and relationship consequences', () => {
    const s = game(1, 2);
    s.scene = 'towerExterior';
    s.players[1].rope = true;
    expect(availableChoices(s, campaign, 'hero-0').map((c) => c[1])).toContain('towerSneak');
    s.scene = 'wagonArrival';
    expect(availableChoices(s, campaign).map((c) => c[1])).toEqual(['wagonSearch']);
    s.world.miraTrail = true;
    s.world.edricTrust = 2;
    expect(availableChoices(s, campaign).map((c) => c[1])).toEqual([
      'wagonSearch',
      'wagonMira',
      'wagonEdric',
    ]);
  });
  it('awards story loot and XP at most once', () => {
    let s = choose(choose(game(), 'inn'), 'oldman');
    const xp = s.players[0].xp;
    s.scene = 'inn';
    s = choose(s, 'oldman');
    expect(s.players[0].xp).toBe(xp);
    s.scene = 'door';
    s.combat = null;
    s.scene = 'rest';
    s.visited.push('rest');
    s.players[0].rested = true;
    const before = s.players[0].hp;
    expect(sceneFor(s, campaign).text).toBeDefined();
    expect(s.players[0].hp).toBe(before);
  });
  it('levels correctly across multiple thresholds and caps at 20', () => {
    const s = game(),
      p = s.players[0],
      hp = p.maxHp;
    gainXp(s, p, 900);
    expect(p.level).toBe(3);
    expect(p.maxHp).toBeGreaterThan(hp);
    expect(p.nextXp).toBe(2700);
    gainXp(s, p, 400000);
    expect(p.level).toBe(20);
    expect(p.hp).toBeLessThanOrEqual(p.maxHp);
  });
});
describe('taktisk strid', () => {
  it('uses one D&D hit rule for AC, natural 1 and natural 20', () => {
    expect(attackHits(12, 3, 14)).toBe(true);
    expect(attackHits(10, 3, 14)).toBe(false);
    expect(attackHits(1, 99, 14)).toBe(false);
    expect(attackHits(20, -5, 30)).toBe(true);
  });
  it('builds the fixed level-1 D&D 2024 paladin preset without granting a level-2 Fighting Style', () => {
    const paladin = createLevel1PaladinPreset();
    expect(paladin.className).toBe('Paladin');
    expect(paladin.level).toBe(1);
    expect(paladin.ac).toBe(18);
    expect(paladin.shield).toBe(true);
    expect(paladin.weapon).toBe('Longsword');
    expect(paladin.armor).toBe('Chain Mail');
    expect(paladin.fightingStyles).toEqual([]);
  });
  it('is reproducible across engines and JSON snapshots', () => {
    const sequence = ['inn', 'window', 'ambush'];
    let a = game(73),
      b = game(73);
    for (const next of sequence) {
      a = choose(a, next);
      b = choose(b, next);
    }
    expect(a).toEqual(b);
    expect(battle(a)).toEqual(battle(JSON.parse(JSON.stringify(b))));
  });
  it('completes the full combat loop from encounter start to XP and story continuation', () => {
    let s = choose(choose(game(42), 'inn'), 'door');
    const xpBefore = s.players[0].xp;

    expect(s.combat).not.toBeNull();
    expect(s.combat!.victory).toBe(false);

    s = battle(s);

    expect(s.status).toBe('active');
    expect(s.combat!.victory).toBe(true);
    expect(s.combat!.enemies.every((enemy) => enemy.hp === 0)).toBe(true);
    expect(s.players[0].xp).toBeGreaterThan(xpBefore);
    expect(s.events.some((event) => event.text === 'Striden är vunnen.')).toBe(true);

    s = action(s, { type: 'continue' });

    expect(s.scene).toBe('afterBandits');
    expect(s.combat).toBeNull();
  });

  it('uses real distance for the first fight and rejects out-of-turn actions', () => {
    let s = choose(choose(game(42), 'inn'), 'door');
    const rangedBandit = s.combat!.enemies.find((e) => e.preferredAttack === 'ranged')!;
    expect(rangedBandit.distance).toBe(50);
    expect(attackAvailability(s, s.players[0], rangedBandit).ok).toBe(false);
    const before = JSON.stringify(s);
    expect(dispatch(s, campaign, 'hero-0', { type: 'attack', target: rangedBandit.id }).ok).toBe(false);
    expect(JSON.stringify(s)).toBe(before);
    s = game(10, 2);
    s = choose(choose(s, 'inn'), 'door');
    const other = s.players.find((p) => p.id !== currentActor(s)?.id)!;
    expect(dispatch(s, campaign, other.id, { type: 'defend' }).ok).toBe(false);
  });
  it('records the exact attack and damage dice used by the combat engine', () => {
    const s = game(42);
    startCombat(s, campaign.scenes(s, 'hero-0').door.combat!);
    s.combat!.initiative.sort((a, b) => (a.id === 'hero-0' ? -1 : b.id === 'hero-0' ? 1 : 0));
    s.combat!.turn = 0;
    const target = s.combat!.enemies.find((e) => e.preferredAttack === 'melee')!;
    s.combat!.distances['hero-0'] = 5;
    const result = action(s, { type: 'attack', target: target.id }, 'hero-0');
    const event = result.events.find(
      (entry) => entry.dice?.attackerId === 'hero-0' && entry.dice.targetId === target.id,
    );
    expect(event?.dice?.attack.rolls.length).toBeGreaterThanOrEqual(1);
    expect(event?.dice?.attack.chosen).toBeGreaterThanOrEqual(1);
    expect(event?.dice?.attack.chosen).toBeLessThanOrEqual(20);
    if (event?.dice?.attack.hit) {
      expect(event.dice.damage?.rolls.length).toBeGreaterThanOrEqual(1);
      expect(event.dice.damage?.total).toBeGreaterThan(0);
    }
  });

  it('handles resistance, weakness and critical-dice damage separately', () => {
    const s = game();
    s.scene = 'towerHall';
    const e = campaign.scenes(s, 'hero-0').cryptBeast.combat!;
    startCombat(s, e);
    const enemy = s.combat!.enemies[0];
    expect(typedDamage(enemy, 7, 'Stick')).toBe(3);
    expect(typedDamage(enemy, 7, 'Eld')).toBe(14);
    expect(typedDamage(enemy, 7, 'Hugg')).toBe(7);
  });
  it('limits class abilities and does not consume items at full HP', () => {
    const s = game();
    expect(dispatch(s, campaign, 'hero-0', { type: 'potion' }).ok).toBe(false);
    expect(s.players[0].potions).toBe(2);
    let b = choose(choose(game(42), 'inn'), 'door');
    const target = b.combat!.enemies.find((e) => canTarget(b, b.players[0], e))!;
    b = action(b, { type: 'ability', target: target.id });
    expect(b.combat!.used['hero-0']).toBe(true);
    expect(dispatch(b, campaign, 'hero-0', { type: 'ability', target: target.id }).ok).toBe(false);
  });
  it('scales encounters to 4 players and boss health to the party', () => {
    const s = game(2, 4);
    startCombat(s, campaign.scenes(s, 'hero-0').door.combat!);
    expect(s.combat!.enemies).toHaveLength(2);
    const boss = game(2, 4);
    startCombat(boss, campaign.scenes(boss, 'hero-0').cryptBeast.combat!);
    expect(boss.combat!.enemies[0].maxHp).toBe(40);
  });
  it('cleric can revive a fallen ally', () => {
    const s = game(42, 2);
    s.players[0] = createCharacter({ ...selection, class: 'cleric' }, 'hero-0');
    startCombat(s, campaign.scenes(s, 'hero-0').door.combat!);
    s.combat!.initiative.sort((a, b) =>
      a.id === 'hero-0' ? -1 : b.id === 'hero-0' ? 1 : a.id === 'hero-1' ? -1 : 1,
    );
    s.combat!.turn = 0;
    s.players[1].hp = 0;
    const result = action(s, { type: 'ability', target: 'hero-1' }, 'hero-0');
    expect(result.players[1].hp).toBeGreaterThan(0);
  });
  it('boss announces an attack and becomes enraged below half health', () => {
    const s = game(56);
    startCombat(s, campaign.scenes(s, 'hero-0').cryptBeast.combat!);
    const enemy = s.combat!.enemies[0];
    enemy.hp = Math.floor(enemy.maxHp / 2);
    const result = action(s, { type: 'defend' });
    expect(result.combat!.enemies[0].phase).toBe(2);
    expect(result.events.some((e) => e.text.includes('förbereder ett utfall'))).toBe(true);
  });
});
describe('sparningar och hela berättelsen', () => {
  it('round-trips mid-combat state without rerolling initiative', () => {
    const s = choose(choose(game(), 'inn'), 'door');
    const restored = parseSave(JSON.parse(JSON.stringify(makeSave(s, 'Test')))).state;
    expect(restored).toEqual(s);
    expect(battle(restored)).toEqual(battle(s));
  });
  it('rejects corrupt, unknown and future saves', () => {
    const save = makeSave(game(), 'Test');
    expect(() => parseSave({ ...save, version: 2 })).toThrow();
    expect(() => parseSave({ ...save, state: { ...save.state, scene: 'unknown' } })).toThrow();
    expect(() => parseSave({ ...save, state: { ...save.state, players: [] } })).toThrow();
    const fighting = makeSave(choose(choose(game(), 'inn'), 'door'), 'Fight');
    fighting.state.combat!.turn = 999;
    expect(() => parseSave(fighting)).toThrow();
  });
  it('plays a full campaign to the wagon, preserving trust and a sealed vault', () => {
    let s = choose(choose(choose(game(42), 'inn'), 'window'), 'ambush');
    s = battle(s);
    expect(s.status).toBe('active');
    expect(s.combat!.victory).toBe(true);
    s = action(s, { type: 'continue' });
    for (const id of [
      'rest',
      'forest',
      'camp',
      'towerExterior',
      'towerSneak',
      'towerHall',
      'cryptBeast',
    ])
      s = choose(s, id);
    s = battle(s);
    expect(s.combat!.victory).toBe(true);
    s = action(s, { type: 'continue' });
    for (const id of [
      'endingLeave',
      'skogsbyReturn',
      'miraMeet',
      'miraTruth',
      'smithMeet',
      'smithFavor',
      'edricMeet',
      'edricVault',
      'villageEvening',
      'villageRumors',
      'wagonArrival',
      'wagonMira',
      'ending',
    ])
      s = choose(s, id);
    expect(s.status).toBe('complete');
    expect(s.world.leftSealed).toBe(true);
    expect(s.world.miraTrust).toBe(2);
    expect(s.world.edricMap).toBe(true);
    expect(s.world.wagonClue).toBe('trail');
    expect(parseSave(makeSave(s, 'Complete')).state).toEqual(s);
  });
  it('offers a playable second campaign entry point', () => {
    const s = createGame(getCampaign('skogsby'), [createCharacter(selection, 'hero')], 4, 'second');
    expect(s.scene).toBe('skogsbyReturn');
    expect(availableChoices(s, getCampaign('skogsby'))).toHaveLength(1);
  });
});
