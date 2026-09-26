/**
 * Writes docs/STORY.md: the whole story read straight from the campaign code — a flowchart of
 * every scene and choice, then each scene with its text, choices (and what unlocks them),
 * ability checks, fights, rewards and what it changes in the world.
 *
 *   npm run story
 */
import { writeFileSync } from 'node:fs';
import { campaigns } from '../packages/content/src';
import { createCharacter } from '../packages/engine/src/characters';
import { createGame } from '../packages/engine/src/engine';
import type { Campaign, Choice, GameState, Scene } from '../packages/engine/src/types';

const campaign = campaigns.watchtower;
const HERO = 'hero';

/** Story state that can change which choices or text a scene shows. */
const flags: { label: string; set: (s: GameState) => void }[] = [
  { label: 'sigillet', set: (s) => (s.players[0].sigil = true) },
  { label: 'repet', set: (s) => (s.players[0].rope = true) },
  { label: 'järnmyntet', set: (s) => (s.players[0].towerKey = true) },
  { label: 'jägarens varning', set: (s) => (s.players[0].bossWeakened = true) },
  { label: 'facklan', set: (s) => (s.players[0].torch = true) },
  { label: 'varnad', set: (s) => (s.players[0].warned = true) },
  { label: 'valvet öppnat', set: (s) => (s.world.openedVault = true) },
  { label: 'förseglingen bruten', set: (s) => (s.world.brokeSeal = true) },
  { label: 'valvet lämnat förseglat', set: (s) => (s.world.leftSealed = true) },
  { label: 'Miras spår', set: (s) => (s.world.miraTrail = true) },
  { label: 'Mira litar helt (2)', set: (s) => (s.world.miraTrust = 2) },
  { label: 'Runas tjänst', set: (s) => (s.world.smithFavor = true) },
  { label: 'Runas metalledtråd', set: (s) => (s.world.smithMetalClue = true) },
  { label: 'Edric litar (2)', set: (s) => (s.world.edricTrust = 2) },
  { label: 'Edric litar helt (3)', set: (s) => (s.world.edricTrust = 3) },
  { label: 'ryktena', set: (s) => (s.world.villageRumors = true) },
  { label: 'ledtråd: brevet', set: (s) => (s.world.wagonClue = 'letter') },
  { label: 'ledtråd: Miras spår', set: (s) => (s.world.wagonClue = 'trail') },
  { label: 'ledtråd: Väktarna', set: (s) => (s.world.wagonClue = 'keepers') },
];

function fresh(setup: (s: GameState) => void = () => {}) {
  const s = createGame(
    campaign,
    [createCharacter({ name: 'Hjälten', race: 'human', class: 'warrior', talent: 'iron' }, HERO)],
    1,
    'story',
  );
  setup(s);
  return s;
}
const scenesOf = (s: GameState) => campaign.scenes(s, HERO);
const textOf = (sc: Scene) => (typeof sc.text === 'function' ? sc.text() : sc.text);
const choicesOf = (sc: Scene): Choice[] =>
  (typeof sc.choices === 'function' ? sc.choices() : (sc.choices ?? [])).filter(
    ([, next]) => next !== 'restart',
  );
const md = (t: string) => t.replace(/<strong>(.*?)<\/strong>/g, '**$1**');
const plain = (t: string) => t.replace(/<[^>]+>/g, '');

const base = scenesOf(fresh());
const ids = Object.keys(base);

/** For each scene: every choice, with the flags needed to see it. */
function choicesWithConditions(id: string) {
  const found = new Map<string, { choice: Choice; needs: string[] }>();
  for (const choice of choicesOf(base[id])) found.set(choice[1], { choice, needs: [] });
  for (const flag of flags) {
    for (const choice of choicesOf(scenesOf(fresh(flag.set))[id]))
      if (!found.has(choice[1])) found.set(choice[1], { choice, needs: [flag.label] });
      else if (found.get(choice[1])!.needs.length) found.get(choice[1])!.needs.push(flag.label);
  }
  // Choices that need several flags at once.
  for (const choice of choicesOf(scenesOf(fresh((s) => flags.forEach((f) => f.set(s))))[id]))
    if (!found.has(choice[1])) found.set(choice[1], { choice, needs: ['flera villkor'] });
  return [...found.values()];
}

/** Paragraphs that only appear with a given flag. */
function textVariants(id: string) {
  const baseline = new Set(textOf(base[id]));
  const variants: { label: string; lines: string[] }[] = [];
  for (const flag of flags) {
    const lines = textOf(scenesOf(fresh(flag.set))[id]).filter((l) => !baseline.has(l));
    if (lines.length) variants.push({ label: flag.label, lines });
  }
  return variants;
}

/** What running the scene's effect changes on the hero and in the world. */
function effectOf(id: string) {
  const s = fresh();
  const sc = scenesOf(s)[id];
  if (!sc.effect) return [];
  const before = structuredClone({ hero: s.players[0], world: s.world });
  sc.effect();
  const changes: string[] = [];
  for (const [label, a, b] of [
    ['hjälten', before.hero, s.players[0]],
    ['världen', before.world, s.world],
  ] as const)
    for (const key of Object.keys(b) as (keyof typeof b)[]) {
      const [x, y] = [JSON.stringify(a[key]), JSON.stringify(b[key])];
      if (x !== y && key !== 'xpAwards' && key !== 'xpNotice')
        changes.push(`${label}.${String(key)}: ${x} → ${y}`);
    }
  return changes;
}

// ── Reachability from both campaign starts ─────────────────────────────────
function edgesOf(id: string) {
  const out: { to: string; kind: 'choice' | 'fail' | 'win'; label: string; needs: string[] }[] = [];
  for (const { choice, needs } of choicesWithConditions(id)) {
    const [label, next, check] = choice;
    out.push({ to: next, kind: 'choice', label, needs });
    if (check)
      out.push({ to: check.fail, kind: 'fail', label: `misslyckat ${check.skill}`, needs });
  }
  const combat = base[id].combat;
  if (combat) out.push({ to: combat.onWin, kind: 'win', label: 'seger', needs: [] });
  return out;
}
const edges = Object.fromEntries(ids.map((id) => [id, edgesOf(id)]));
const starts = Object.values(campaigns as Record<string, Campaign>).map((c) => c.start);
const reached = new Set<string>();
const queue = [...starts];
while (queue.length) {
  const id = queue.shift()!;
  if (reached.has(id) || !base[id]) continue;
  reached.add(id);
  queue.push(...edges[id].map((e) => e.to));
}
const unreachable = ids.filter((id) => !reached.has(id));
const endings = ids.filter((id) => !base[id].combat && !edges[id].length);

// ── Mermaid flowchart ──────────────────────────────────────────────────────
const safe = (t: string) =>
  plain(t)
    .replace(/"/g, "'")
    .replace(/[[\]{}|]/g, ' ');
const short = (t: string, n = 38) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
const chapter2 = ids.indexOf('skogsbyReturn');
const node = (id: string) => {
  const sc = base[id];
  const title = safe(sc.title);
  if (sc.combat) return `${id}{{"⚔ ${title}"}}`;
  if (endings.includes(id)) return `${id}(["${title}"])`;
  return `${id}["${title}"]`;
};
const mermaid = [
  'flowchart TD',
  '  subgraph P["Prolog: Tre Lyktor och vakttornet"]',
  ...ids.slice(0, chapter2).map((id) => `    ${node(id)}`),
  '  end',
  '  subgraph K["Kapitel 1: Skogsby"]',
  ...ids.slice(chapter2).map((id) => `    ${node(id)}`),
  '  end',
  ...ids.flatMap((id) =>
    edges[id].map((e) => {
      const label = safe(
        short(e.label) + (e.needs.length ? ` (kräver ${e.needs.join(' / ')})` : ''),
      );
      const arrow = e.kind === 'fail' ? '-.->' : e.kind === 'win' ? '==>' : '-->';
      return `  ${id} ${arrow}|"${label}"| ${e.to}`;
    }),
  ),
].join('\n');

// ── Document ───────────────────────────────────────────────────────────────
const lines: string[] = [];
const push = (...l: string[]) => lines.push(...l);
push(
  '# Drakvalvet – hela berättelsen',
  '',
  '> Genererad från `packages/content/src/watchtower.ts` med `npm run story`. Redigera inte för hand; kör skriptet igen efter ändringar i berättelsen.',
  '',
  `**${ids.length} scener** · starter: ${Object.values(campaigns as Record<string, Campaign>)
    .map((c) => `${c.title} → \`${c.start}\``)
    .join(', ')} · slut: ${endings.map((e) => `\`${e}\``).join(', ')}`,
  '',
  unreachable.length
    ? `⚠️ **Scener som inte går att nå:** ${unreachable.map((e) => `\`${e}\``).join(', ')}`
    : '✅ Alla scener går att nå från någon start.',
  '',
  '## Karta',
  '',
  'Pilar: `-->` val · `-.->` misslyckat färdighetsslag · `==>` vunnen strid. ⚔ = strid, rundad ruta = slut.',
  '',
  '```mermaid',
  mermaid,
  '```',
  '',
  '## Scener',
  '',
);
for (const [index, id] of ids.entries()) {
  const sc = base[id];
  if (index === chapter2) push('---', '', '# Kapitel 1: Skogsby', '');
  push(`### ${md(sc.title)}`, '', `\`${id}\``, '');
  for (const p of textOf(sc)) push(`> ${md(p)}`, '>');
  lines.pop();
  push('');
  for (const v of textVariants(id)) {
    push(`*Om ${v.label}:*`, '');
    for (const p of v.lines) push(`> ${md(p)}`, '>');
    lines.pop();
    push('');
  }
  const effect = effectOf(id);
  if (effect.length) push(`**Ändrar:** ${effect.map((e) => `\`${e}\``).join(', ')}`, '');
  const xp = campaign.storyXp[id];
  if (xp) push(`**Berättelse-XP:** ${xp.xp} – ${xp.reason}`, '');
  if (sc.combat) {
    const c = sc.combat;
    push(
      `**Strid** (${c.xp} XP${c.surprise ? `, ${c.surprise === 'players' ? 'hjältarna överraskas' : 'fienden överraskas'}` : ''}${c.usesDistance ? ', riktiga avstånd' : ''}) → vid seger: \`${c.onWin}\``,
      '',
      ...c.enemies.map(
        (e) =>
          `- ${e.name}: ${e.hp} HP, AC ${e.ac}, +${e.attack}, ${e.weapon} ${e.dmg[0]}d${e.dmg[1]}${e.dmg[2] ? `+${e.dmg[2]}` : ''}${e.weaknesses?.length ? `, sårbar: ${e.weaknesses.join('/')}` : ''}${e.resistances?.length ? `, tålig: ${e.resistances.join('/')}` : ''}`,
      ),
      '',
    );
    // Fights that change with earlier choices (e.g. the hunter's warning weakens the beast).
    const describe = (sc2: Scene) =>
      sc2.combat!.enemies.map((e) => `${e.name} ${e.hp} HP`).join(', ');
    for (const flag of flags) {
      const variant = scenesOf(fresh(flag.set))[id];
      if (variant.combat && describe(variant) !== describe(sc))
        push(`*Om ${flag.label}:* ${describe(variant)}`, '');
    }
  }
  const choices = choicesWithConditions(id);
  if (choices.length) {
    push('**Val:**', '');
    for (const { choice, needs } of choices) {
      const [label, next, check] = choice;
      const parts = [`→ \`${next}\``];
      if (check)
        parts.push(
          `${check.skill} (${check.attributes.map((a) => a.toUpperCase()).join('/')}) DC ${check.dc}, misslyckat → \`${check.fail}\``,
        );
      if (needs.length) parts.push(`kräver ${needs.join(' eller ')}`);
      push(`- ${plain(label)} · ${parts.join(' · ')}`);
    }
    push('');
  } else if (!sc.combat) push('*Slut på berättelsen.*', '');
}
writeFileSync(new URL('../docs/STORY.md', import.meta.url), lines.join('\n'));
console.log(`docs/STORY.md: ${ids.length} scener, ${unreachable.length} onåbara.`);
