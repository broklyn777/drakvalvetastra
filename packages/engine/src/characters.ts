import { classData, raceData, talentData } from '../../content/src/characters';
import { armorData, weaponData, type WeaponId } from '../../content/src/equipment';
import { pregenData } from '../../content/src/pregens';
import type { Attributes, Character, CharacterSelection, Dice } from './types';
import { modifier } from './random';
export const XP_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000,
  195000, 225000, 265000, 305000, 355000,
];
/** "Greatsword (2d6)", "Longbow (d8)". */
export function weaponName(id: WeaponId) {
  const [count, sides] = weaponData[id].dice;
  return `${weaponData[id].label} (${count > 1 ? count : ''}d${sides})`;
}

/** Proficiency Bonus at levels 1–4. */
const PROFICIENCY = 2;

/** Ability used for an attack with a weapon (D&D 2024): finesse = best of STR/DEX. */
export function weaponAbility(
  weapon: (typeof weaponData)[WeaponId],
  attrs: Attributes,
  casting?: keyof Attributes,
): keyof Attributes {
  if ('spell' in weapon) return casting ?? 'int';
  if ('finesse' in weapon) return attrs.dex > attrs.str ? 'dex' : 'str';
  if (weapon.kind === 'ranged' && !('thrown' in weapon)) return 'dex';
  return 'str';
}

/** Attack bonus and damage dice for a weapon: Proficiency + ability; cantrips add no modifier. */
export function weaponStats(
  id: WeaponId,
  attrs: Attributes,
  casting?: keyof Attributes,
): { attackBonus: number; damage: Dice } {
  const weapon = weaponData[id];
  const mod = modifier(attrs[weaponAbility(weapon, attrs, casting)]);
  return {
    attackBonus: PROFICIENCY + mod,
    damage: [weapon.dice[0], weapon.dice[1], 'spell' in weapon ? 0 : mod],
  };
}

export function createCharacter(selection: CharacterSelection, id: string): Character {
  const pregen = selection.pregen ? pregenData[selection.pregen] : undefined;
  const name = selection.name.trim().slice(0, 24) || pregen?.name || 'Äventyrare';
  // A ready-made hero always keeps its own species, class and feat.
  const chosen: CharacterSelection = pregen
    ? {
        name,
        race: pregen.race,
        class: pregen.class,
        talent: pregen.talent,
        pregen: selection.pregen,
      }
    : { ...selection, name };
  const race = raceData[chosen.race],
    cls = classData[chosen.class],
    talent = talentData[chosen.talent];
  if (!race || !cls || !talent) throw new Error('Ogiltig rollperson.');
  // Standard Array + background +2/+1; D&D 2024 species add no ability scores.
  const attrs = pregen
    ? ({ ...pregen.scores } as Attributes)
    : (Object.fromEntries(
        Object.entries(cls.base).map(([key, value]) => [
          key,
          value + ((cls.asi as Partial<Attributes>)[key as keyof Attributes] ?? 0),
        ]),
      ) as Attributes);
  // Dwarven Toughness +1 and Tough +2 per level (see traits.ts).
  const traitHp = (chosen.race === 'dwarf' ? 1 : 0) + (chosen.talent === 'iron' ? 2 : 0);
  const base = {
    ...attrs,
    id,
    selection: chosen,
    name,
    race: race.label,
    className: cls.label,
    talent: talent.label,
    gold: 10,
    level: 1,
    xp: 0,
    nextXp: 300,
    potions: cls.potions,
    herbs: cls.herbs + (chosen.talent === 'supply' ? 1 : 0),
    sigil: false,
    torch: false,
    rope: false,
    warned: false,
    towerKey: false,
    bossWeakened: false,
    rested: false,
    speed: 30,
    fightingStyles: [] as Character['fightingStyles'],
    ...(chosen.race === 'human' ? { inspiration: true } : {}),
  };
  const rules = cls.rules;
  const casting = 'casting' in rules ? rules.casting : undefined;
  const armor = armorData[rules.armor];
  const primary = rules.weapons[0];
  const { attackBonus, damage } = weaponStats(primary, attrs, casting);
  const maxHp = cls.hitDie + modifier(attrs.con) + traitHp;
  return {
    ...base,
    hp: maxHp,
    maxHp,
    ac: armor.base + Math.min(armor.dexMax, modifier(attrs.dex)) + (rules.shield ? 2 : 0),
    attackBonus,
    damage,
    damageType: weaponData[primary].damageType,
    weapon: weaponName(primary),
    armor: armor.label,
    shield: rules.shield,
    ...('hunterMarks' in rules ? { hunterMarks: rules.hunterMarks } : {}),
    ...('spellSlots' in rules ? { spellSlots: rules.spellSlots } : {}),
    ...('layOnHands' in rules ? { layOnHands: rules.layOnHands } : {}),
    ...('secondWind' in rules ? { secondWind: rules.secondWind } : {}),
    fightingStyles: 'fightingStyle' in rules ? [rules.fightingStyle] : [],
  };
}
/** Class features on the ability button. `timing` decides whether it ends the turn. */
export const abilities = {
  warrior: {
    name: 'Second Wind',
    timing: 'bonus',
    description:
      'Bonus Action: återfå 1d10 + din Fighter-nivå i HP. Kostar inte din tur. 2 gånger per Long Rest.',
  },
  paladin: {
    name: 'Lay On Hands',
    timing: 'bonus',
    description:
      'Bonus Action: läk dig själv eller en kamrat inom 5 ft ur en pott på 5 HP per Long Rest. Kostar inte din tur.',
  },
  cleric: {
    name: 'Healing Word',
    timing: 'bonus',
    description:
      'Bonus Action, 1 Spell Slot: 2d4 + WIS till en kamrat inom 60 ft, även en fallen. Kostar inte din tur. 2 Spell Slots per Long Rest.',
  },
  thief: {
    name: 'Sneak Attack',
    timing: 'passive',
    description:
      '+1d6 en gång per tur när du har Advantage, eller när en kamrat står inom 5 ft från målet. Sker automatiskt.',
  },
  ranger: {
    name: "Hunter's Mark",
    timing: 'bonus',
    description:
      'Bonus Action, 90 ft: dina träffar mot målet gör +1d6 skada. Faller målet kan du flytta märket gratis. Kostar inte din tur. 2 gånger per Long Rest.',
  },
  mage: {
    name: 'Burning Hands',
    timing: 'action',
    description:
      'Action, 1 Spell Slot: 3d6 eld i en 15 ft kon. DEX Saving Throw mot din Spell Save DC halverar. 2 Spell Slots per Long Rest.',
  },
} as const;


/** Fixed D&D 2024 level-1 Paladin used for combat-rule testing only.
 * Not exposed by the character creator.
 */
export function createLevel1PaladinPreset(id = 'paladin-test', name = 'Paladin'): Character {
  return {
    id,
    name,
    rulesClass: 'paladin',
    selection: {
      name,
      race: 'human',
      class: 'warrior',
      talent: 'keen',
    },
    race: 'Human',
    className: 'Paladin',
    talent: 'D&D 2024 test preset',
    str: 16,
    dex: 10,
    con: 14,
    int: 8,
    wis: 12,
    cha: 15,
    hp: 12,
    maxHp: 12,
    ac: 18,
    attackBonus: 5,
    damage: [1, 8, 3],
    damageType: 'Hugg',
    gold: 9,
    level: 1,
    xp: 0,
    nextXp: 300,
    weapon: 'Longsword',
    armor: 'Chain Mail',
    shield: true,
    potions: 0,
    herbs: 0,
    sigil: false,
    torch: false,
    rope: false,
    warned: false,
    towerKey: false,
    bossWeakened: false,
    rested: false,
    speed: 30,
    fightingStyles: [],
  };
}
