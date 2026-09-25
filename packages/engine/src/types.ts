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
export type TalentId = 'iron' | 'keen' | 'supply' | 'savage';
export type Dice = [number, number, number];
export type DamageType = 'Hugg' | 'Stick' | 'Kross' | 'Eld' | 'Riv';
export type Position = 'fram' | 'bak';
export type FightingStyle = 'protection';
export interface AttackProfile {
  name: string;
  kind: 'melee' | 'ranged';
  attack: number;
  dmg: Dice;
  damageType: DamageType;
  reach?: number;
  normalRange?: number;
  longRange?: number;
}
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
  rulesClass?: 'paladin';
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
  speed: number;
  fightingStyles: FightingStyle[];
  /** Human Resourceful: Heroic Inspiration, spent on a reroll until the next Long Rest. */
  inspiration?: boolean;
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
  speed?: number;
  startDistance?: number;
  preferredAttack?: 'melee' | 'ranged';
  attacks?: AttackProfile[];
}
export interface Enemy extends EnemyDefinition {
  id: string;
  position: Position;
  role: 'melee' | 'archer' | 'boss';
  phase: number;
  intent: string | null;
  distance: number;
}
export interface Encounter {
  enemies: EnemyDefinition[];
  onWin: string;
  xp: number;
  surprise?: 'players' | 'enemies';
  fixedEnemies?: boolean;
  usesDistance?: boolean;
}
export type AttributeKey = keyof Attributes;
/** Optional ability check on a story choice: success enters `next`, failure enters `fail`. */
export interface SkillCheck {
  skill: string;
  attributes: AttributeKey[];
  dc: number;
  fail: string;
}
export type Choice = [label: string, next: string, check?: SkillCheck];
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
  usesDistance: boolean;
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
  reactionUsed: Record<string, boolean>;
  protectionActive: Record<string, string>;
  distances: Record<string, number>;
  movementRemaining: Record<string, number>;
  breached: Record<string, boolean>;
  stats: Record<string, CombatStats>;
}
export interface JournalEntry {
  scene: string;
  title: string;
  turn: number;
}
export interface DiceRollEvent {
  attackerId: string;
  targetId: string;
  attackName?: string;
  distance?: number;
  coverBonus?: number;
  damageType?: DamageType;
  attack: {
    sides: 20;
    rolls: number[];
    chosen: number;
    bonus: number;
    total: number;
    ac: number;
    mode: 'normal' | 'advantage' | 'disadvantage';
    critical: boolean;
    hit: boolean;
  };
  damage?: {
    sides: number;
    rolls: number[];
    bonus: number;
    total: number;
    critical: boolean;
  };
}
export interface GameEvent {
  id: number;
  kind: 'story' | 'roll' | 'damage' | 'heal' | 'success' | 'warning';
  text: string;
  detail?: string;
  dice?: DiceRollEvent;
  check?: SkillCheckEvent;
}
export interface SkillCheckEvent {
  actorId: string;
  skill: string;
  attribute: AttributeKey;
  roll: number;
  modifier: number;
  total: number;
  dc: number;
  success: boolean;
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
    | { type: 'help'; target: string }
  | { type: 'move' | 'dash'; target?: string }
  | { type: 'defend' | 'breakthrough' | 'potion' | 'herbs' | 'continue' };
export interface CommandEnvelope {
  id: string;
  revision: number;
  command: GameCommand;
}
export type GameResult =
  { ok: true; state: GameState } | { ok: false; error: string; state: GameState };
