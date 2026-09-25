/**
 * D&D 2024 weapons and armor used by the rules-based classes.
 * Damage types use the game's Swedish names: Hugg = Slashing, Stick = Piercing,
 * Kross = Bludgeoning, Eld = Fire.
 */
export const weaponData = {
  longsword: { label: 'Longsword', dice: [1, 8], damageType: 'Hugg', kind: 'melee', mastery: 'sap' },
  javelin: {
    label: 'Javelin',
    dice: [1, 6],
    damageType: 'Stick',
    kind: 'ranged',
    thrown: true,
    normalRange: 30,
    longRange: 120,
    mastery: 'slow',
  },
  mace: { label: 'Mace', dice: [1, 6], damageType: 'Kross', kind: 'melee', mastery: 'sap' },
  shortsword: {
    label: 'Shortsword',
    dice: [1, 6],
    damageType: 'Stick',
    kind: 'melee',
    finesse: true,
    mastery: 'vex',
  },
  shortbow: {
    label: 'Shortbow',
    dice: [1, 6],
    damageType: 'Stick',
    kind: 'ranged',
    normalRange: 80,
    longRange: 320,
    mastery: 'vex',
  },
  longbow: {
    label: 'Longbow',
    dice: [1, 8],
    damageType: 'Stick',
    kind: 'ranged',
    normalRange: 150,
    longRange: 600,
    mastery: 'slow',
  },
  // Wizard cantrip: a ranged spell attack with the spellcasting ability, no modifier to damage.
  fireBolt: {
    label: 'Fire Bolt',
    dice: [1, 10],
    damageType: 'Eld',
    kind: 'ranged',
    spell: true,
    normalRange: 120,
    longRange: 120,
  },
} as const;
export type WeaponId = keyof typeof weaponData;

export const armorData = {
  none: { label: 'Robe', base: 10, dexMax: 99 },
  leather: { label: 'Leather Armor', base: 11, dexMax: 99 },
  studdedLeather: { label: 'Studded Leather', base: 12, dexMax: 99 },
  chainShirt: { label: 'Chain Shirt', base: 13, dexMax: 2 },
  chainMail: { label: 'Chain Mail', base: 16, dexMax: 0 },
} as const;
export type ArmorId = keyof typeof armorData;
