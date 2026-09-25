import { describe, it, expect } from 'vitest';
import { campaigns, getCampaign } from '../packages/content/src';
import {
  createTestGame,
  parseTestParams,
  testParams,
  testScenes,
  type TestStart,
} from '../packages/engine/src/testing';
import { parseSave } from '../packages/persistence/src/saves';
import { makeSave } from '../packages/protocol/src/schema';

const campaign = getCampaign('watchtower');
const start: TestStart = {
  campaignId: 'watchtower',
  scene: 'towerExterior',
  selection: { name: 'Testa', race: 'dwarf', class: 'warrior', talent: 'iron' },
  seed: 1013904226,
  items: ['rope', 'sigil'],
};

describe('testläge', () => {
  it('lists every scene of the campaign in content order', () => {
    const scenes = testScenes(campaign);
    expect(scenes[0]).toEqual({ id: 'roadIntro', title: 'Vägen mot Gråskogen' });
    expect(scenes.map((s) => s.id)).toContain('towerExterior');
    expect(scenes).toHaveLength(
      Object.keys(campaign.scenes(createTestGame(campaign, start, 'h', 'g'), 'h')).length,
    );
  });
  it('starts in the chosen scene with the chosen hero and items', () => {
    const s = createTestGame(campaign, start, 'hero', 'game');
    expect(s.scene).toBe('towerExterior');
    expect(s.seed).not.toBe(0);
    expect(s.players[0]).toMatchObject({
      className: 'Krigare',
      race: 'Dwarf',
      rope: true,
      sigil: true,
    });
    expect(s.players[0].torch).toBe(false);
    expect(s.visited).toContain('towerExterior');
    expect(parseSave(makeSave(s, 'Test')).state).toEqual(s);
  });
  it('enters scenes through the engine: effects run and combat starts', () => {
    const loot = createTestGame(campaign, { ...start, scene: 'afterBandits' }, 'hero', 'game');
    expect(loot.players[0]).toMatchObject({ shield: true, towerKey: true });
    const fight = createTestGame(campaign, { ...start, scene: 'door' }, 'hero', 'game');
    expect(fight.combat?.onWin).toBe('afterBandits');
    expect(() =>
      createTestGame(campaign, { ...start, scene: 'nowhere' }, 'hero', 'game'),
    ).toThrow();
  });
  it('is reproducible from its seed', () => {
    const fight = { ...start, scene: 'door' };
    expect(createTestGame(campaign, fight, 'hero', 'game')).toEqual(
      createTestGame(campaign, fight, 'hero', 'game'),
    );
  });
  it('round-trips through a link and rejects bad or hostile parameters', () => {
    expect(parseTestParams(testParams(start), campaigns)).toEqual(start);
    expect(parseTestParams(new URLSearchParams(''), campaigns)).toBeNull();
    expect(parseTestParams(new URLSearchParams('scen=nowhere'), campaigns)).toBeNull();
    const odd = parseTestParams(
      new URLSearchParams('scen=inn&klass=toString&folk=__proto__&seed=-4&har=rope,constructor,x'),
      campaigns,
    )!;
    expect(odd.selection).toMatchObject({ class: 'thief', race: 'halfling', talent: 'supply' });
    expect(odd.items).toEqual(['rope']);
    expect(odd.seed).toBeGreaterThan(0);
    expect(odd.campaignId).toBe('watchtower');
  });
});
