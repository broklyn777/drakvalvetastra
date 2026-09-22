import type { GameState, Dice } from './types';
/** xorshift32: RNG state lives in the snapshot so a replay never calls Math.random(). */
export function die(state: GameState, sides: number): number {
  let x = state.seed || 0x9e3779b9;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  state.seed = x >>> 0;
  return 1 + Math.floor((state.seed / 4294967296) * sides);
}
export function rollDamage(
  state: GameState,
  [count, sides, bonus]: Dice,
  critical = false,
): number {
  let value = bonus;
  for (let i = 0; i < count * (critical ? 2 : 1); i++) value += die(state, sides);
  return Math.max(0, value);
}
export const modifier = (value: number) => Math.floor((value - 10) / 2);
