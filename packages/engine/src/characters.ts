import { classData, raceData, talentData } from '../../content/src/characters';
import type { Attributes, Character, CharacterSelection } from './types';
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
  const maxHp = cls.maxHp + race.hpBonus + talent.hpBonus;
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
    ac: cls.ac + race.acBonus + talent.acBonus,
    attackBonus: cls.attack + talent.attackBonus,
    damage: [...cls.damage],
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
  };
}
export const abilities = {
  warrior: { name: 'Kraftslag', description: '−3 anfall, +1T8 skada. En gång per strid.' },
  mage: {
    name: 'Brinnande händer',
    description: '1T6 + INT eldskada mot alla fiender. En gång per strid.',
  },
  thief: { name: 'Smygattack', description: '+1T6 vapenskada. En gång per strid.' },
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
