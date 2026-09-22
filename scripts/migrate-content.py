"""One-time extraction of user-owned v021 content; no DOM or legacy runtime shipped."""
from pathlib import Path
source = Path('upload/Drakvalvet-v021.html').read_text()
catalog = source[source.index('const raceData ='):source.index('const scenes =')]
catalog = catalog.replace('const raceData =', 'export const raceData =').replace('const classData =', 'export const classData =').replace('const talentData =', 'export const talentData =')
catalog = catalog.replace('\n};', '\n} as const;')
Path('packages/content/src/characters.ts').write_text('// Character content preserved from Drakvalvet v021.\n' + catalog)
scenes = source[source.index('const scenes ='):source.index('\n\n\nfunction weaponDisplayName')]
scenes = scenes.replace('const scenes =', 'const scenes: Record<string, Scene> =')
scenes = scenes.replace('typeof mp!=="undefined" && mp.mode==="multi"', 'session.players.length > 1')
scenes = scenes.replace('let arr = [[', 'const arr: Choice[] = [[').replace('const a=[];', 'const a: Choice[]=[];').replace('const base=[', 'const base: Choice[]=[').replace('const c=[[', 'const c: Choice[]=[[')
# Evaluate dynamic branches each time scenes are resolved. These expressions were frozen at script load in v021.
# Party equipment unlocks shared choices; loot remains owned by the actor who found it.
scenes = scenes.replace('if(state.rope)', 'if(partyHas("rope"))').replace('if(state.sigil)', 'if(partyHas("sigil"))').replace('if(state.towerKey)', 'if(partyHas("towerKey"))')
scenes = scenes.replace('state.bossWeakened', 'partyHas("bossWeakened")')
scenes = scenes.replace('partyHas("bossWeakened")=true', 'state.bossWeakened=true')
# A sword is physical damage even if a mage finds it.
scenes = scenes.replace('state.damage=[1,8,3];', 'state.damage=[1,8,3];state.damageType="Hugg";')
xp = source[source.index('const STORY_XP ='):source.index('\nfunction mpAwardStoryXp')].replace('const STORY_XP', 'export const storyXp')
header = '''import type { Choice, Scene, GameState, Character } from '../../engine/src/types';

/** Pure content factory. Effects may only be executed by the engine on a cloned state. */
export function watchtowerScenes(session: GameState, actor: string): Record<string, Scene> {
  const state = session.players.find(p => p.id === actor) ?? session.players[0];
  const world = session.world;
  const partyHas = (prop: keyof Character) => session.players.some(p => Boolean(p[prop]));
'''
Path('packages/content/src/watchtower.ts').write_text(header + scenes + '\nreturn scenes;\n}\n\n' + xp)
print('Extracted character catalog and', scenes.count('title:'), 'scenes.')
