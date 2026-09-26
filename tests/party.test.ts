import { describe, it, expect } from 'vitest';
import { campaigns, getCampaign } from '../packages/content/src';
import { createGame, dispatch } from '../packages/engine/src/engine';
import { createCharacter } from '../packages/engine/src/characters';
import { attackAvailability, currentActor } from '../packages/engine/src/combat';
import {
  createTestGame,
  parseTestParams,
  pregenSelection,
  testParams,
} from '../packages/engine/src/testing';
import type { GameCommand, GameState, PregenId } from '../packages/engine/src/types';

const campaign = getCampaign('watchtower');
const seedOf = (i: number) => Math.imul(i, 2654435761) >>> 0;
const party = (ids: PregenId[], seed: number) =>
  createGame(
    campaign,
    ids.map((id) => createCharacter(pregenSelection(id), id)),
    seed,
    'party',
  );

describe('sällskap', () => {
  it('reads a party from a test link, keeps order, drops repeats and caps at four', () => {
    const t = parseTestParams(
      new URLSearchParams('scen=door&hjalte=sigrun,brodd,sigrun,solveig,pip,liria,nobody'),
      campaigns,
    )!;
    expect(t.selection.pregen).toBe('sigrun');
    expect(t.party!.map((p) => p.pregen)).toEqual(['brodd', 'solveig', 'pip']);
    expect(parseTestParams(testParams(t), campaigns)!.party).toEqual(t.party);
  });

  it('starts a test party in the scene with unique ids and the items for everyone', () => {
    const t = parseTestParams(
      new URLSearchParams('scen=towerExterior&hjalte=sigrun,brodd&har=rope'),
      campaigns,
    )!;
    const s = createTestGame(campaign, t, 'h', 'g');
    expect(s.players.map((p) => [p.id, p.name, p.rope])).toEqual([
      ['h', 'Sigrun Ljusbärare', true],
      ['h-2', 'Brodd Stenhjärta', true],
    ]);
  });

  it('shares combat XP across the party', () => {
    const s = party(['sigrun', 'brodd', 'solveig'], 3);
    let g = dispatch(s, campaign, 'sigrun', { type: 'choose', next: 'inn' }).state;
    g = dispatch(g, campaign, 'sigrun', { type: 'choose', next: 'door' }).state;
    expect(g.combat!.reward).toBe(Math.round(50 * 1.5));
    expect(g.combat!.initiative.filter((e) => e.kind === 'hero')).toHaveLength(3);
  });

  it('a party of three ready-made heroes wins the first fight far more often than one hero', () => {
    const tryAct = (s: GameState, cmd: GameCommand) => {
      const r = dispatch(s, campaign, currentActor(s)!.id, cmd);
      return r.ok ? r.state : null;
    };
    const fight = (s: GameState) => {
      for (let i = 0; i < 400 && s.combat && !s.combat.victory && s.status === 'active'; i++) {
        if (s.combat.swapPending) {
          s = tryAct(s, { type: 'swapInitiative' })!;
          continue;
        }
        const p = s.players.find((q) => q.id === currentActor(s)!.id)!;
        const alive = s.combat.enemies.filter((e) => e.hp > 0);
        const target = alive.find((e) => attackAvailability(s, p, e).ok) ?? alive[0];
        const hurt = s.players.find((q) => q.hp < q.maxHp / 2);
        if (!s.combat.used[p.id] && hurt) {
          const n = tryAct(s, { type: 'ability', target: hurt.id });
          if (n) {
            s = n;
            continue;
          }
        }
        s =
          (attackAvailability(s, p, target).ok
            ? tryAct(s, { type: 'attack', target: target.id })
            : null) ??
          tryAct(s, { type: 'move', target: target.id }) ??
          tryAct(s, { type: 'dash', target: target.id }) ??
          tryAct(s, { type: 'defend' })!;
      }
      return s;
    };
    const winRate = (ids: PregenId[]) => {
      let wins = 0;
      for (let i = 1; i <= 200; i++) {
        let s = party(ids, seedOf(i));
        s = dispatch(s, campaign, ids[0], { type: 'choose', next: 'inn' }).state;
        s = dispatch(s, campaign, ids[0], { type: 'choose', next: 'door' }).state;
        if (fight(s).combat?.victory) wins++;
      }
      return wins / 200;
    };
    const solo = winRate(['solveig']);
    const group = winRate(['sigrun', 'brodd', 'solveig']);
    expect(group).toBeGreaterThan(0.9);
    expect(group).toBeGreaterThan(solo + 0.5);
  });
});
