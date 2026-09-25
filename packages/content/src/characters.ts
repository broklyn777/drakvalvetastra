// Class content from Drakvalvet v021; species and Origin Feats follow D&D 2024.
/**
 * D&D 2024 species. Species give traits, not ability score increases; those come from the
 * background (see `asi` on each class).
 */
export const raceData = {
  human: {
    label: 'Human',
    desc: 'Anpassningsbar och envis. Hittar alltid en väg till.',
    bonus: 'Heroic Inspiration: slå om ett misslyckat Ability Check, en gång per Long Rest',
  },
  elf: {
    label: 'Elf',
    desc: 'Kvicktänkt och lättfotad, med skarpa sinnen.',
    bonus: 'Keen Senses: +2 på Perception, Insight och Survival · Darkvision',
  },
  dwarf: {
    label: 'Dwarf',
    desc: 'Härdad och stryktålig, van vid mörker och sten.',
    bonus: 'Dwarven Toughness: +1 HP per nivå · Darkvision',
  },
  halfling: {
    label: 'Halfling',
    desc: 'Liten, snabb och förvånansvärt modig.',
    bonus: 'Luck: slå om en naturlig 1:a på d20 · Brave',
  },
} as const;

export const classData = {
  warrior: {
    label: 'Krigare',
    desc: 'Lever på stål och envishet.',
    bonus: 'Vapen: Svärd (d8) · Livstärning d10 · Klassförmåga: Skydda',
    // D&D 2024 Standard Array for the class, plus a background's +2/+1.
    base: { str: 15, dex: 14, con: 13, int: 8, wis: 10, cha: 12 },
    asi: { str: 2, con: 1 },
    hitDie: 10,
    maxHp: 16,
    ac: 14,
    attack: 5,
    damage: [1, 8, 2],
    damageType: 'Hugg',
    weapon: 'Svärd (d8)',
    armor: 'Läderbrynja',
    shield: false,
    potions: 2,
    herbs: 0,
  },
  mage: {
    label: 'Magiker',
    desc: 'Formar lågan med tanken.',
    bonus: 'Vapen: Eldpil (d8) · Livstärning d6 · Klassförmåga: Brinnande händer',
    base: { str: 8, dex: 12, con: 13, int: 15, wis: 14, cha: 10 },
    asi: { int: 2, con: 1 },
    hitDie: 6,
    maxHp: 11,
    ac: 12,
    attack: 5,
    damage: [1, 8, 1],
    damageType: 'Eld',
    weapon: 'Eldpil (d8)',
    armor: 'Resekappa',
    shield: false,
    potions: 2,
    herbs: 1,
  },
  thief: {
    label: 'Tjuv',
    desc: 'Slår till där ingen ser.',
    bonus: 'Vapen: Dolk (d6) · Livstärning d8 · Klassförmåga: Smygattack',
    base: { str: 12, dex: 15, con: 13, int: 14, wis: 10, cha: 8 },
    asi: { dex: 2, con: 1 },
    hitDie: 8,
    maxHp: 13,
    ac: 15,
    attack: 5,
    damage: [1, 6, 2],
    damageType: 'Stick',
    weapon: 'Dolk (d6)',
    armor: 'Mjuk läderrustning',
    shield: false,
    potions: 2,
    herbs: 0,
  },
  cleric: {
    label: 'Kleriker',
    desc: 'Bär ett ljus som inte slocknar.',
    bonus: 'Vapen: Stridsklubba (d6) · Livstärning d8 · Klassförmåga: Helande ord',
    base: { str: 14, dex: 8, con: 13, int: 10, wis: 15, cha: 12 },
    asi: { wis: 2, con: 1 },
    hitDie: 8,
    maxHp: 14,
    ac: 14,
    attack: 4,
    damage: [1, 6, 2],
    damageType: 'Kross',
    weapon: 'Stridsklubba (d6)',
    armor: 'Brynja av ringläder',
    shield: true,
    potions: 2,
    herbs: 1,
  },
} as const;

/** D&D 2024 Origin Feats. Ids are kept from the old talents so saves and links still work. */
export const talentData = {
  iron: {
    label: 'Tough',
    desc: 'Du är svår att fälla.',
    bonus: '+2 HP per nivå',
  },
  keen: {
    label: 'Alert',
    desc: 'Du är alltid redo när striden bryter ut.',
    bonus: '+2 på Initiative',
  },
  supply: {
    label: 'Healer',
    desc: 'Du bär förband och vet hur de ska användas.',
    bonus: 'Örter läker Hit Die + 2 och slår om 1:or · +1 ört',
  },
  savage: {
    label: 'Savage Attacker',
    desc: 'Dina hugg träffar där det gör ont.',
    bonus: 'Slå vapenskadan två gånger och behåll den högsta',
  },
} as const;
