import type { AttributeKey, Character, GameState, SkillCheck } from './types';
import { die, modifier } from './random';
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

/** Chance of success for d20 + modifier ≥ DC. Ability checks have no automatic 1/20. */
export function checkChance(p: Character, check: SkillCheck) {
  const needed = check.dc - modifier(p[checkAttribute(p, check)]);
  return Math.min(1, Math.max(0, (21 - needed) / 20));
}

export function rollCheck(s: GameState, p: Character, check: SkillCheck) {
  const attribute = checkAttribute(p, check);
  const roll = die(s, 20);
  const mod = modifier(p[attribute]);
  const total = roll + mod;
  const success = total >= check.dc;
  emit(
    s,
    success ? 'success' : 'warning',
    `${p.name} ${success ? 'lyckas' : 'misslyckas'} med ${check.skill} check.`,
    `d20 ${roll} ${mod >= 0 ? '+' : '−'} ${Math.abs(mod)} (${attributeLabels[attribute]}) = ${total} mot DC ${check.dc}.`,
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
