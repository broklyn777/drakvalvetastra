import type { GameState, GameEvent, Character } from './types';
import { modifier } from './random';
import { XP_THRESHOLDS } from './characters';
export function emit(
  s: GameState,
  kind: GameEvent['kind'],
  text: string,
  detail?: string,
  dice?: GameEvent['dice'],
  check?: GameEvent['check'],
) {
  s.events.push({
    id: ++s.eventSeq,
    kind,
    text,
    ...(detail ? { detail } : {}),
    ...(dice ? { dice } : {}),
    ...(check ? { check } : {}),
  });
  if (s.events.length > 150) s.events.splice(0, s.events.length - 150);
}
export function gainXp(s: GameState, p: Character, xp: number) {
  p.xp += xp;
  while (p.level < 20 && p.xp >= XP_THRESHOLDS[p.level]) {
    p.level++;
    const gain = Math.max(
      1,
      (p.className === 'Krigare' || p.className === 'Ranger' ? 6 : p.className === 'Magiker' ? 4 : 5) + modifier(p.con),
    );
    p.maxHp += gain;
    p.hp = Math.min(p.maxHp, p.hp + gain);
    emit(s, 'success', `${p.name} når nivå ${p.level}.`, `+${gain} maximalt liv.`);
  }
  p.nextXp = XP_THRESHOLDS[Math.min(p.level, 19)];
}
