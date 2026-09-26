import { classData } from '../../content/src/characters';
import { die } from './random';
import type { Character, GameState } from './types';

/** D&D 2024 species traits and Origin Feats that have rules effects in this game. */
export const PROFICIENCY = 2;

export const isSpecies = (p: Character, id: Character['selection']['race']) =>
  p.selection.race === id;
export const hasFeat = (p: Character, id: Character['selection']['talent']) =>
  p.selection.talent === id;

export function hitDie(p: Character) {
  return classData[p.selection.class].hitDie;
}

/** Dwarven Toughness +1 and Tough +2, at level 1 and again every level. */
export function hpPerLevelBonus(p: Character) {
  return (isSpecies(p, 'dwarf') ? 1 : 0) + (hasFeat(p, 'iron') ? 2 : 0);
}

/** Alert: add Proficiency Bonus to Initiative. */
export function initiativeBonus(p: Character) {
  return hasFeat(p, 'keen') ? PROFICIENCY : 0;
}

/** Keen Senses: proficiency in Perception, Insight and Survival. */
export function skillBonus(p: Character, skill: string) {
  return isSpecies(p, 'elf') && ['Perception', 'Insight', 'Survival'].includes(skill)
    ? PROFICIENCY
    : 0;
}

/** A hero's d20 Test. Halfling Luck rerolls a natural 1 (the new roll must be used). */
export function heroD20(s: GameState, p: Character) {
  const first = die(s, 20);
  if (first !== 1 || !isSpecies(p, 'halfling')) return { roll: first, lucky: false };
  return { roll: die(s, 20), lucky: true };
}
