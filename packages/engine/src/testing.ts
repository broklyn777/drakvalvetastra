import { classData, raceData, talentData } from '../../content/src/characters';
import { pregenData } from '../../content/src/pregens';
import { createCharacter } from './characters';
import { createGame, enter } from './engine';
import type { Campaign, CharacterSelection, GameState, PregenId } from './types';

/** Story items a test start can hand the hero, so gated choices can be reached directly. */
export const testItems = {
  rope: 'Rep',
  sigil: 'Sigill',
  torch: 'Fackla',
  towerKey: 'Järnmynt',
  bossWeakened: 'Jägarens varning',
} as const;
export type TestItem = keyof typeof testItems;

export interface TestStart {
  campaignId: string;
  scene: string;
  selection: CharacterSelection;
  seed: number;
  items: TestItem[];
  /** More heroes for a party (the first one is `selection`). */
  party?: CharacterSelection[];
}

/** A ready-made hero as a character selection. */
export function pregenSelection(id: PregenId): CharacterSelection {
  const hero = pregenData[id];
  return { name: hero.name, race: hero.race, class: hero.class, talent: hero.talent, pregen: id };
}

export const defaultTestSelection: CharacterSelection = {
  name: 'Testa',
  race: 'halfling',
  class: 'thief',
  talent: 'supply',
};

/** Scene ids and titles in content order, for the test-mode scene picker. */
export function testScenes(campaign: Campaign) {
  const probe = createGame(campaign, [createCharacter(defaultTestSelection, 'probe')], 1, 'probe');
  return Object.entries(campaign.scenes(probe, 'probe')).map(([id, scene]) => ({
    id,
    title: scene.title,
  }));
}

/**
 * Preview/local test mode only: a normal new game that is then moved straight into `scene`.
 * The jump goes through the engine's own scene entry, so effects, story XP and combat start
 * exactly as if the scene had been reached by playing.
 */
export function createTestGame(
  campaign: Campaign,
  start: TestStart,
  heroId: string,
  gameId: string,
) {
  const heroes = [start.selection, ...(start.party ?? [])].map((selection, i) =>
    createCharacter(selection, i ? `${heroId}-${i + 1}` : heroId),
  );
  const s: GameState = createGame(campaign, heroes, start.seed, gameId);
  for (const p of s.players) for (const item of start.items) p[item] = true;
  if (!campaign.scenes(s, heroId)[start.scene]) throw new Error('Scenen finns inte i kampanjen.');
  if (start.scene !== s.scene) enter(s, campaign, start.scene, heroId);
  return s;
}

const pick = <T extends string>(
  value: string | null,
  allowed: Record<string, unknown>,
  fallback: T,
) => (value && Object.hasOwn(allowed, value) ? (value as T) : fallback);

/** Reads `?scen=…&kampanj=…&folk=…&klass=…&talang=…&seed=…&har=rope,sigil`, or `hjalte=<pregen>`. */
export function parseTestParams(
  params: URLSearchParams,
  campaigns: Record<string, Campaign>,
): TestStart | null {
  const scene = params.get('scen');
  if (!scene) return null;
  const campaignId = pick(params.get('kampanj'), campaigns, 'watchtower');
  if (!testScenes(campaigns[campaignId]).some((s) => s.id === scene)) return null;
  const seed = Number(params.get('seed'));
  // `hjalte=sigrun` or a party: `hjalte=sigrun,brodd,alma` (at most 4, no repeats).
  const heroes = [
    ...new Set(
      (params.get('hjalte') ?? '')
        .split(',')
        .filter((id): id is PregenId => Object.hasOwn(pregenData, id)),
    ),
  ].slice(0, 4);
  return {
    campaignId,
    scene,
    ...(heroes.length > 1 ? { party: heroes.slice(1).map(pregenSelection) } : {}),
    selection: heroes.length
      ? pregenSelection(heroes[0])
      : {
          name: params.get('namn')?.trim().slice(0, 24) || defaultTestSelection.name,
          race: pick(params.get('folk'), raceData, defaultTestSelection.race),
          class: pick(params.get('klass'), classData, defaultTestSelection.class),
          talent: pick(params.get('talang'), talentData, defaultTestSelection.talent),
        },
    seed: Number.isInteger(seed) && seed > 0 && seed <= 0xffffffff ? seed : randomSeed(),
    items: (params.get('har') ?? '')
      .split(',')
      .filter((item): item is TestItem => Object.hasOwn(testItems, item)),
  };
}

export function testParams(start: TestStart) {
  const params = new URLSearchParams({
    scen: start.scene,
    kampanj: start.campaignId,
    folk: start.selection.race,
    klass: start.selection.class,
    talang: start.selection.talent,
    seed: String(start.seed),
  });
  const pregens = [start.selection, ...(start.party ?? [])].map((s) => s.pregen).filter(Boolean);
  if (pregens.length) params.set('hjalte', pregens.join(','));
  if (start.items.length) params.set('har', start.items.join(','));
  return params;
}

export function randomSeed() {
  return Math.floor(Math.random() * 0xffffffff) >>> 0 || 1;
}
