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

/**
 * Classes following D&D 2024 level-1 rules (Hit Die, starting equipment A, Weapon Mastery and
 * features), with HP, AC and attacks derived from ability scores.
 */
export const classData = {
  warrior: {
    label: 'Fighter',
    desc: 'Lever på stål och envishet. Tål mest och slår hårdast.',
    bonus: 'Greatsword (2d6), Flail, 8 Javelins, Chain Mail · Hit Die d10 · Second Wind',
    // D&D 2024 Standard Array for the class, plus a background's +2/+1.
    base: { str: 15, dex: 14, con: 13, int: 8, wis: 10, cha: 12 },
    asi: { str: 2, con: 1 },
    hitDie: 10,
    rules: {
      armor: 'chainMail',
      shield: false,
      weapons: ['greatsword', 'flail', 'javelin'],
      masteries: ['greatsword', 'flail', 'javelin'],
      fightingStyle: 'greatWeaponFighting',
      secondWind: 2,
    },
    potions: 2,
    herbs: 0,
  },
  paladin: {
    label: 'Paladin',
    desc: 'Svär en helig ed och står i främsta ledet.',
    bonus: 'Longsword + Shield, Chain Mail, 6 Javelins · Hit Die d10 · Lay On Hands',
    base: { str: 15, dex: 10, con: 13, int: 8, wis: 12, cha: 14 },
    asi: { str: 2, con: 1 },
    hitDie: 10,
    rules: {
      armor: 'chainMail',
      shield: true,
      weapons: ['longsword', 'javelin'],
      masteries: ['longsword', 'javelin'],
      layOnHands: 5,
    },
    potions: 2,
    herbs: 0,
  },
  cleric: {
    label: 'Cleric',
    desc: 'Bär ett ljus som inte slocknar och helar sina vänner.',
    bonus: 'Mace + Shield, Chain Shirt · Hit Die d8 · Healing Word (2 Spell Slots)',
    base: { str: 14, dex: 8, con: 13, int: 10, wis: 15, cha: 12 },
    asi: { wis: 2, con: 1 },
    hitDie: 8,
    rules: {
      armor: 'chainShirt',
      shield: true,
      weapons: ['mace'],
      masteries: [],
      casting: 'wis',
      spellSlots: 2,
    },
    potions: 2,
    herbs: 1,
  },
  thief: {
    label: 'Rogue',
    desc: 'Slår till där ingen ser.',
    bonus: 'Shortsword + Shortbow, Leather Armor · Hit Die d8 · Sneak Attack 1d6',
    base: { str: 12, dex: 15, con: 13, int: 14, wis: 10, cha: 8 },
    asi: { dex: 2, con: 1 },
    hitDie: 8,
    rules: {
      armor: 'leather',
      shield: false,
      weapons: ['shortsword', 'shortbow'],
      masteries: ['shortsword', 'shortbow'],
      sneakAttack: 1,
    },
    potions: 2,
    herbs: 0,
  },
  ranger: {
    label: 'Ranger',
    desc: 'Spårar bytet genom Gråskogen och fäller det på avstånd.',
    bonus: "Longbow + Shortsword, Studded Leather · Hit Die d10 · Hunter's Mark",
    base: { str: 12, dex: 15, con: 13, int: 8, wis: 14, cha: 10 },
    asi: { dex: 2, con: 1 },
    hitDie: 10,
    rules: {
      armor: 'studdedLeather',
      shield: false,
      weapons: ['longbow', 'shortsword'],
      masteries: ['longbow', 'shortsword'],
      hunterMarks: 2,
    },
    potions: 2,
    herbs: 1,
  },
  mage: {
    label: 'Wizard',
    desc: 'Formar lågan med tanken.',
    bonus: 'Fire Bolt (1d10, 120 ft) · Hit Die d6 · Burning Hands (2 Spell Slots)',
    base: { str: 8, dex: 12, con: 13, int: 15, wis: 14, cha: 10 },
    asi: { int: 2, con: 1 },
    hitDie: 6,
    rules: {
      armor: 'none',
      shield: false,
      weapons: ['fireBolt'],
      masteries: [],
      casting: 'int',
      spellSlots: 2,
    },
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
    bonus:
      "Battle Medic: örterna är ditt Healer's Kit – läk dig själv eller en kamrat inom 5 ft med en Hit Point Die + 2 · Healing Rerolls: 1:or slås om · +1 ört",
  },
  savage: {
    label: 'Savage Attacker',
    desc: 'Dina hugg träffar där det gör ont.',
    bonus: 'Slå vapenskadan två gånger och behåll den högsta',
  },
} as const;
