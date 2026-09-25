import type {
  Campaign,
  Character,
  GameState,
  GameResult,
  GameCommand,
  Scene,
  World,
} from './types';
import { combatAction, healItem, startCombat } from './combat';
import { emit, gainXp } from './events';
import { rollCheck } from './checks';
export function emptyWorld(): World {
  return {
    miraTrust: 0,
    miraTrail: false,
    smithTrust: 0,
    smithMetalClue: false,
    smithFavor: false,
    edricTrust: 0,
    keeperLore: false,
    edricMap: false,
    openedVault: false,
    brokeSeal: false,
    leftSealed: false,
    villageRumors: false,
    wagonClue: null,
    xpAwards: {},
    xpNotice: null,
  };
}
export function sceneFor(s: GameState, campaign: Campaign, actor = s.players[0].id): Scene {
  const scene = campaign.scenes(s, actor)[s.scene];
  if (!scene) throw new Error('Scenen saknas i kampanjen.');
  return scene;
}
export function availableChoices(s: GameState, campaign: Campaign, actor?: string) {
  if (s.status !== 'active' || s.combat) return [];
  const def = sceneFor(s, campaign, actor).choices;
  return (typeof def === 'function' ? def() : (def ?? [])).filter(([, next]) => next !== 'restart');
}
export function enter(s: GameState, campaign: Campaign, id: string, actor: string) {
  s.scene = id;
  s.combat = null;
  s.world.xpNotice = null;
  let sc = sceneFor(s, campaign, actor);
  if (!s.visited.includes(id)) {
    sc.effect?.();
    s.visited.push(id);
    const award = campaign.storyXp[id];
    if (award && !s.world.xpAwards[id]) {
      s.world.xpAwards[id] = true;
      const share = Math.floor(award.xp / s.players.length);
      s.players.forEach((p) => gainXp(s, p, share));
      s.world.xpNotice = `${award.reason} +${share} XP per hjälte.`;
      emit(s, 'success', s.world.xpNotice);
    }
  }
  // Re-resolve after effects: derived narrative/encounters must reflect the current world.
  sc = sceneFor(s, campaign, actor);
  s.journal.push({ scene: id, title: sc.title, turn: s.revision });
  emit(s, 'story', sc.title);
  if (sc.combat) startCombat(s, sc.combat);
  if (
    !sc.combat &&
    (typeof sc.choices === 'function' ? sc.choices() : (sc.choices ?? [])).every(
      ([, next]) => next === 'restart',
    )
  )
    s.status = 'complete';
}
export function createGame(
  campaign: Campaign,
  players: Character[],
  seed: number,
  id: string,
): GameState {
  if (
    players.length < 1 ||
    players.length > 4 ||
    new Set(players.map((p) => p.id)).size !== players.length
  )
    throw new Error('Ett sällskap behöver 1–4 unika hjältar.');
  const state: GameState = {
    schemaVersion: 1,
    id,
    campaignId: campaign.id,
    campaignVersion: campaign.version,
    revision: 0,
    seed: seed >>> 0 || 1,
    status: 'active',
    scene: campaign.start,
    players: structuredClone(players),
    world: emptyWorld(),
    visited: [],
    journal: [],
    events: [],
    eventSeq: 0,
    combat: null,
  };
  enter(state, campaign, campaign.start, players[0].id);
  return state;
}
/** The only gameplay mutation boundary. Rejected commands never mutate the input, even RNG. */
export function dispatch(
  state: GameState,
  campaign: Campaign,
  actor: string,
  command: GameCommand,
  expectedRevision = state.revision,
): GameResult {
  if (state.campaignId !== campaign.id || state.campaignVersion !== campaign.version)
    return { ok: false, state, error: 'Kampanjversionen stämmer inte.' };
  if (expectedRevision !== state.revision)
    return { ok: false, state, error: 'Spelvärlden har ändrats. Försök igen.' };
  const s = structuredClone(state);
  try {
    const p = s.players.find((p) => p.id === actor);
    if (!p) throw new Error('Rollpersonen tillhör inte sällskapet.');
    if (s.status !== 'active') throw new Error('Äventyret är avslutat.');
    if (p.hp <= 0) throw new Error('Din rollperson har fallit.');
    if (command.type === 'choose') {
      const choice = availableChoices(s, campaign, actor).find(([, n]) => n === command.next);
      if (!choice) throw new Error('Det valet är inte tillgängligt.');
      const check = choice[2];
      enter(s, campaign, !check || rollCheck(s, p, check) ? choice[1] : check.fail, actor);
    } else if (command.type === 'continue') {
      if (!s.combat?.victory) throw new Error('Striden är inte över.');
      enter(s, campaign, s.combat.onWin, actor);
    } else if (s.combat) combatAction(s, p, command);
    else if (command.type === 'potion' || command.type === 'herbs') healItem(s, p, command.type);
    else throw new Error('Du är inte i strid.');
    s.revision++;
    return { ok: true, state: s };
  } catch (error) {
    return {
      ok: false,
      state,
      error: error instanceof Error ? error.message : 'Draget kunde inte utföras.',
    };
  }
}
