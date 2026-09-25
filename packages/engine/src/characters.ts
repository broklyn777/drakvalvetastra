import { classData, raceData, talentData } from '../../content/src/characters';
import type { Attributes, Character, CharacterSelection } from './types';
import { modifier } from './random';
export const XP_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000,
  195000, 225000, 265000, 305000, 355000,
];
export function createCharacter(selection: CharacterSelection, id: string): Character {
  const race = raceData[selection.race],
    cls = classData[selection.class],
    talent = talentData[selection.talent];
  if (!race || !cls || !talent) throw new Error('Ogiltig rollperson.');
  const attrs = Object.fromEntries(
    Object.entries(cls.base).map(([key, value]) => [
      key,
      value + race.mods[key as keyof Attributes],
    ]),
  ) as Attributes;
  // Classes with `rules` follow D&D 2024 math; the others keep the original game's fixed values.
  const rules = 'rules' in cls ? cls.rules : undefined;
  const maxHp =
    (rules ? rules.hitDie + modifier(attrs.con) : cls.maxHp) + race.hpBonus + talent.hpBonus;
  const abilityMod = rules ? modifier(attrs[rules.attackAbility]) : 0;
  return {
    ...attrs,
    id,
    selection: { ...selection },
    name: selection.name.trim().slice(0, 24) || 'Äventyrare',
    race: race.label,
    className: cls.label,
    talent: talent.label,
    hp: maxHp,
    maxHp,
    ac: (rules ? rules.armorBase + modifier(attrs.dex) : cls.ac) + race.acBonus + talent.acBonus,
    attackBonus: (rules ? rules.proficiency + abilityMod : cls.attack) + talent.attackBonus,
    damage: rules ? [cls.damage[0], cls.damage[1], abilityMod] : [...cls.damage],
    damageType: cls.damageType,
    weapon: cls.weapon,
    armor: cls.armor,
    shield: cls.shield,
    gold: 10,
    level: 1,
    xp: 0,
    nextXp: 300,
    potions: cls.potions + talent.potions,
    herbs: cls.herbs + talent.herbs,
    sigil: false,
    torch: false,
    rope: false,
    warned: false,
    towerKey: false,
    bossWeakened: false,
    rested: false,
    speed: 30,
    fightingStyles: [],
    // Favored Enemy: two Hunter's Mark casts per Long Rest.
    ...(selection.class === 'ranger' ? { hunterMarks: 2 } : {}),
  };
}
export const abilities = {
  warrior: { name: 'Kraftslag', description: '−3 anfall, +1T8 skada. En gång per strid.' },
  mage: {
    name: 'Brinnande händer',
    description: '1T6 + INT eldskada mot alla fiender. En gång per strid.',
  },
  thief: { name: 'Smygattack', description: '+1T6 vapenskada. En gång per strid.' },
  ranger: {
    name: "Hunter's Mark",
    description:
      'Bonus Action, 90 ft: dina träffar mot målet gör +1d6 skada. Faller målet kan du flytta märket gratis. Kostar inte din tur. 2 gånger per Long Rest.',
  },
  cleric: {
    name: 'Helande ord',
    description: 'Återställ 1T6 + VIS liv, även på en fallen vän. En gång per strid.',
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
