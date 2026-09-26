'use client';
import {
  classData,
  pregenData,
  raceData,
  talentData,
  weaponData,
} from '../../packages/content/src';
import type { WeaponId } from '../../packages/content/src/equipment';
import { abilities, weaponName, weaponStats } from '../../packages/engine/src/characters';
import { modifier } from '../../packages/engine/src/random';
import { hitDie, initiativeBonus, PROFICIENCY } from '../../packages/engine/src/traits';
import type { Character } from '../../packages/engine/src/types';

const masteryText = {
  sap: 'Sap: träffat mål får Disadvantage på sitt nästa anfall',
  vex: 'Vex: Advantage på ditt nästa anfall mot samma mål',
  slow: 'Slow: träffat mål rör sig 10 ft kortare',
  graze: 'Graze: en miss gör ändå skada lika med modifieraren',
} as const;

const signed = (n: number) => `${n >= 0 ? '+' : ''}${n}`;

/** D&D 2024 rules summary: background, traits, class feature, resources and weapons. */
export function RulesSheet({ hero }: { hero: Character }) {
  const cls = classData[hero.selection.class];
  const rules = 'rules' in cls ? cls.rules : undefined;
  const casting = rules && 'casting' in rules ? rules.casting : undefined;
  const pregen = hero.selection.pregen ? pregenData[hero.selection.pregen] : undefined;
  const ability = abilities[hero.selection.class];
  const masteries: readonly string[] = rules?.masteries ?? [];
  const weapons = (rules?.weapons ?? []) as readonly WeaponId[];
  const mainIsClassWeapon = weapons.some((id) => hero.weapon.startsWith(weaponData[id].label));
  const hitDiceLeft = hero.level - (hero.hitDiceUsed ?? 0);

  const resources: [string, string][] = [];
  if (hero.secondWind !== undefined) resources.push(['Second Wind', `${hero.secondWind} / 2`]);
  if (hero.layOnHands !== undefined) resources.push(['Lay On Hands', `${hero.layOnHands} / 5 HP`]);
  if (hero.hunterMarks !== undefined) resources.push(["Hunter's Mark", `${hero.hunterMarks} / 2`]);
  if (hero.spellSlots !== undefined)
    resources.push(['Spell Slots (nivå 1)', `${hero.spellSlots} / 2`]);
  if (hero.inspiration !== undefined)
    resources.push(['Heroic Inspiration', hero.inspiration ? 'redo' : 'använd']);
  resources.push([`Hit Point Dice (d${hitDie(hero)})`, `${hitDiceLeft} / ${hero.level}`]);

  return (
    <div className="rules-sheet">
      <h3>Regler & förmågor</h3>
      <dl className="rules-facts">
        <div>
          <dt>Proficiency</dt>
          <dd>+{PROFICIENCY}</dd>
        </div>
        <div>
          <dt>Initiative</dt>
          <dd>{signed(modifier(hero.dex) + initiativeBonus(hero))}</dd>
        </div>
        <div>
          <dt>Speed</dt>
          <dd>{hero.speed} ft</dd>
        </div>
        {casting && (
          <div>
            <dt>Spell Save DC</dt>
            <dd>{8 + PROFICIENCY + modifier(hero[casting])}</dd>
          </div>
        )}
      </dl>
      <ul className="rules-traits">
        {pregen && (
          <li>
            <strong>Background: {pregen.background}</strong>
            <span>{pregen.desc}</span>
          </li>
        )}
        <li>
          <strong>{raceData[hero.selection.race].label}</strong>
          <span>{raceData[hero.selection.race].bonus}</span>
        </li>
        <li>
          <strong>Origin Feat: {talentData[hero.selection.talent].label}</strong>
          <span>{talentData[hero.selection.talent].bonus}</span>
        </li>
        <li>
          <strong>{ability.name}</strong>
          <span>{ability.description}</span>
        </li>
        {hero.fightingStyles.includes('greatWeaponFighting') && (
          <li>
            <strong>Fighting Style: Great Weapon Fighting</strong>
            <span>1:or och 2:or på skadetärningarna för tvåhandsvapen räknas som 3.</span>
          </li>
        )}
      </ul>
      <h3>Resurser till nästa Long Rest</h3>
      <dl className="rules-resources">
        {resources.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <h3>Vapen</h3>
      <ul className="rules-weapons">
        {!mainIsClassWeapon && (
          <li>
            <strong>{hero.weapon}</strong>
            <span>
              {signed(hero.attackBonus)} · {hero.damage[0]}d{hero.damage[1]}
              {hero.damage[2] ? signed(hero.damage[2]) : ''}
            </span>
          </li>
        )}
        {weapons.map((id) => {
          const w = weaponData[id];
          const { attackBonus, damage } = weaponStats(id, hero, casting);
          const range = 'longRange' in w ? ` · ${w.normalRange}/${w.longRange} ft` : ' · 5 ft';
          const mastery =
            'mastery' in w && masteries.includes(id) ? masteryText[w.mastery] : undefined;
          return (
            <li key={id}>
              <strong>{weaponName(id)}</strong>
              <span>
                {signed(attackBonus)} · {damage[0]}d{damage[1]}
                {damage[2] ? signed(damage[2]) : ''}
                {range}
              </span>
              {mastery && <small>{mastery}</small>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
