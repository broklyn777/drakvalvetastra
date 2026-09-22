/** JSON-only state: shared unchanged by browser, authoritative server and saves. */
export type Attributes = {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
};
export type RaceId = 'human' | 'elf' | 'dwarf' | 'halfling';
export type ClassId = 'warrior' | 'mage' | 'thief' | 'cleric';
export type TalentId = 'iron' | 'keen' | 'supply';
export type Dice = [number, number, number];
export type DamageType = 'Hugg' | 'Stick' | 'Kross' | 'Eld' | 'Riv';
export type Position = 'fram' | 'bak';
export interface CharacterSelection {
  name: string;
  race: RaceId;
  class: ClassId;
  talent: TalentId;
}
export interface Character extends Attributes {
  id: string;
  name: string;
  race: string;
  className: string;
  talent: string;
  selection: CharacterSelection;
  hp: number;
  maxHp: number;
  ac: number;
  attackBonus: number;
  damage: Dice;
  damageType: DamageType;
  gold: number;
  level: number;
  xp: number;
  nextXp: number;
  weapon: string;
  armor: string;
  shield: boolean;
  potions: number;
  herbs: number;
  sigil: boolean;
  torch: boolean;
  rope: boolean;
  warned: boolean;
  towerKey: boolean;
  bossWeakened: boolean;
  rested: boolean;
}
export interface World {
  miraTrust: number;
  miraTrail: boolean;
  smithTrust: number;
  smithMetalClue: boolean;
  smithFavor: boolean;
  edricTrust: number;
  keeperLore: boolean;
  edricMap: boolean;
  openedVault: boolean;
  brokeSeal: boolean;
  leftSealed: boolean;
  villageRumors: boolean;
  wagonClue: string | null;
  xpAwards: Record<string, boolean>;
  xpNotice: string | null;
}
export interface EnemyDefinition {
  name: string;
  hp: number;
  maxHp: number;
  ac: number;
  attack: number;
  dmg: Dice;
  weapon: string;
  damageType: DamageType;
  position?: Position;
  blocksBackline?: boolean;
  resistances?: DamageType[];
  weaknesses?: DamageType[];
  dex?: number;
}
export interface Enemy extends EnemyDefinition {
  id: string;
  position: Position;
  role: 'melee' | 'archer' | 'boss';
  phase: number;
  intent: string | null;
}
export interface Encounter {
  enemies: EnemyDefinition[];
  onWin: string;
  xp: number;
  surprise?: 'players' | 'enemies';
}
export type Choice = [label: string, next: string];
export interface Scene {
  title: string;
  text: string[] | (() => string[]);
  effect?: () => void;
  choices?: Choice[] | (() => Choice[]);
  combat?: Encounter;
}
export interface Campaign {
  id: string;
  version: number;
  title: string;
  subtitle: string;
  description: string;
  start: string;
  scenes: (session: GameState, actor: string) => Record<string, Scene>;
  storyXp: Record<string, { xp: number; reason: string }>;
}
export interface Initiative {
  id: string;
  kind: 'hero' | 'enemy';
  name: string;
  die: number;
  modifier: number;
  total: number;
  tie: number;
}
export interface CombatStats {
  damage: number;
  taken: number;
  crits: number;
  healing: number;
}
export interface Combat {
  enemies: Enemy[];
  initiative: Initiative[];
  turn: number;
  round: number;
  onWin: string;
  reward: number;
  victory: boolean;
  positions: Record<string, Position>;
  dodging: Record<string, boolean>;
  advantage: Record<string, boolean>;
  used: Record<string, boolean>;
  protectedBy: Record<string, string>;
  breached: Record<string, boolean>;
  stats: Record<string, CombatStats>;
}
export interface JournalEntry {
  scene: string;
  title: string;
  turn: number;
}
export interface GameEvent {
  id: number;
  kind: 'story' | 'roll' | 'damage' | 'heal' | 'success' | 'warning';
  text: string;
  detail?: string;
}
export interface GameState {
  schemaVersion: 1;
  id: string;
  campaignId: string;
  campaignVersion: number;
  revision: number;
  seed: number;
  status: 'active' | 'defeat' | 'complete';
  scene: string;
  players: Character[];
  world: World;
  visited: string[];
  journal: JournalEntry[];
  events: GameEvent[];
  eventSeq: number;
  combat: Combat | null;
}
export type GameCommand =
  | { type: 'choose'; next: string }
  | { type: 'attack'; target: string }
  | { type: 'ability'; target?: string }
  | { type: 'protect'; target: string }
  | { type: 'help'; target: string }
  | { type: 'defend' | 'move' | 'breakthrough' | 'potion' | 'herbs' | 'continue' };
export interface CommandEnvelope {
  id: string;
  revision: number;
  command: GameCommand;
}
export type GameResult =
  { ok: true; state: GameState } | { ok: false; error: string; state: GameState };
