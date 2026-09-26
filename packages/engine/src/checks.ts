import type { AttributeKey, Character, GameState, SkillCheck } from './types';
import { modifier } from './random';
import { heroD20, skillBonus } from './traits';
import { emit } from './events';

export const attributeLabels: Record<AttributeKey, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
};

/** The hero uses the best of the listed attributes, e.g. STR or DEX. */
export function checkAttribute(p: Character, check: SkillCheck) {
  return check.attributes.reduce((best, key) => (p[key] > p[best] ? key : best));
}

/** Lowest natural d20 roll that succeeds; ≤ 1 always succeeds, > 20 never does. */
export function checkTarget(p: Character, check: SkillCheck) {
  return check.dc - checkModifier(p, check);
}

/** Ability modifier plus Keen Senses proficiency where it applies. */
export function checkModifier(p: Character, check: SkillCheck) {
  return modifier(p[checkAttribute(p, check)]) + skillBonus(p, check.skill);
}

/** Chance of success for d20 + modifier ≥ DC. Ability checks have no automatic 1/20. */
export function checkChance(p: Character, check: SkillCheck) {
  const needed = checkTarget(p, check);
  let chance = Math.min(1, Math.max(0, (21 - needed) / 20));
  // Halfling Luck rerolls a natural 1; Heroic Inspiration rerolls one failure.
  if (needed > 1 && p.selection.race === 'halfling') chance += chance / 20;
  if (p.inspiration) chance += (1 - chance) * chance;
  return Math.min(1, chance);
}

export function rollCheck(s: GameState, p: Character, check: SkillCheck) {
  const attribute = checkAttribute(p, check);
  const mod = checkModifier(p, check);
  const first = heroD20(s, p);
  let roll = first.roll;
  const notes = first.lucky ? [' Luck: slog om en 1:a.'] : [];
  if (roll + mod < check.dc && p.inspiration) {
    // Human Heroic Inspiration: spent automatically on the first failed check.
    p.inspiration = false;
    notes.push(` Heroic Inspiration: ${roll} slogs om.`);
    roll = heroD20(s, p).roll;
  }
  const total = roll + mod;
  const success = total >= check.dc;
  emit(
    s,
    success ? 'success' : 'warning',
    `${p.name} ${success ? 'lyckas' : 'misslyckas'} med ${check.skill} check.`,
    `d20 ${roll} ${mod >= 0 ? '+' : '−'} ${Math.abs(mod)} (${attributeLabels[attribute]}${skillBonus(p, check.skill) ? ' + Keen Senses' : ''}) = ${total} mot DC ${check.dc}.${notes.join('')}`,
    undefined,
    {
      actorId: p.id,
      skill: check.skill,
      attribute,
      roll,
      modifier: mod,
      total,
      dc: check.dc,
      success,
    },
  );
  return success;
}
