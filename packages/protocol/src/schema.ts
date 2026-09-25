import { z } from 'zod';
import type { GameState } from '../../engine/src/types';
const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/)
  .refine((value) => !['__proto__', 'prototype', 'constructor'].includes(value), 'Ogiltigt ID.');
const natural = z.number().int().min(0).max(10000000);
const stat = z.number().int().min(1).max(100);
const dice = z.tuple([
  z.number().int().min(1).max(20),
  z.number().int().min(2).max(100),
  z.number().int().min(0).max(100),
]);
const damage = z.enum(['Hugg', 'Stick', 'Kross', 'Eld', 'Riv']);
const position = z.enum(['fram', 'bak']);
export const selectionSchema = z
  .object({
    name: z.string().trim().min(1).max(24),
    race: z.enum(['human', 'elf', 'dwarf', 'halfling']),
    class: z.enum(['warrior', 'mage', 'thief', 'cleric', 'ranger']),
    talent: z.enum(['iron', 'keen', 'supply']),
  })
  .strict();
export const characterSchema = z
  .object({
    id,
    name: z.string().min(1).max(24),
    race: z.string().max(30),
    className: z.string().max(30),
    rulesClass: z.literal('paladin').optional(),
    talent: z.string().max(30),
    selection: selectionSchema,
    str: stat,
    dex: stat,
    con: stat,
    int: stat,
    wis: stat,
    cha: stat,
    hp: natural,
    maxHp: stat.or(z.number().int().min(1).max(10000)),
    ac: stat,
    attackBonus: natural,
    damage: dice,
    damageType: damage,
    gold: natural,
    level: z.number().int().min(1).max(20),
    xp: natural,
    nextXp: natural,
    weapon: z.string().max(100),
    armor: z.string().max(100),
    shield: z.boolean(),
    potions: natural,
    herbs: natural,
    sigil: z.boolean(),
    torch: z.boolean(),
    rope: z.boolean(),
    warned: z.boolean(),
    towerKey: z.boolean(),
    bossWeakened: z.boolean(),
    rested: z.boolean(),
    speed: z.number().int().min(0).max(500).default(30),
    fightingStyles: z.array(z.enum(['protection'])).max(10).default([]),
    hunterMarks: z.number().int().min(0).max(10).optional(),
  })
  .strict()
  .refine((p) => p.hp <= p.maxHp, 'Liv överstiger maxliv.');
const enemySchema = z
  .object({
    id,
    name: z.string().max(100),
    hp: natural,
    maxHp: z.number().int().min(1).max(100000),
    ac: stat,
    attack: natural,
    dmg: dice,
    weapon: z.string().max(100),
    damageType: damage,
    position,
    blocksBackline: z.boolean().optional(),
    resistances: z.array(damage).max(5).optional(),
    weaknesses: z.array(damage).max(5).optional(),
    dex: stat.optional(),
    speed: z.number().int().min(0).max(500).optional(),
    startDistance: z.number().int().min(0).max(10000).optional(),
    preferredAttack: z.enum(['melee', 'ranged']).optional(),
    attacks: z
      .array(
        z
          .object({
            name: z.string().max(100),
            kind: z.enum(['melee', 'ranged']),
            attack: z.number().int().min(-20).max(50),
            dmg: dice,
            damageType: damage,
            reach: z.number().int().min(0).max(100).optional(),
            normalRange: z.number().int().min(0).max(10000).optional(),
            longRange: z.number().int().min(0).max(10000).optional(),
          })
          .strict(),
      )
      .max(20)
      .optional(),
    role: z.enum(['melee', 'archer', 'boss']),
    phase: z.number().int().min(1).max(2),
    intent: id.nullable(),
    distance: z.number().int().min(-10000).max(10000).default(0),
  })
  .strict();
const recordBool = z.record(id, z.boolean());
const combatSchema = z
  .object({
    enemies: z.array(enemySchema).min(1).max(30),
    usesDistance: z.boolean().default(false),
    initiative: z
      .array(
        z
          .object({
            id,
            kind: z.enum(['hero', 'enemy']),
            name: z.string().max(100),
            die: stat,
            modifier: z.number().int().min(-10).max(50),
            total: z.number().int().min(-10).max(150),
            tie: stat,
          })
          .strict(),
      )
      .min(2)
      .max(34),
    turn: natural,
    round: z.number().int().min(1).max(100000),
    onWin: id,
    reward: natural,
    victory: z.boolean(),
    positions: z.record(id, position),
    dodging: recordBool,
    advantage: recordBool,
    used: recordBool,
    protectedBy: z.record(id, id),
    reactionUsed: recordBool.default({}),
    protectionActive: z.record(id, id).default({}),
    distances: z.record(id, z.number().int().min(-10000).max(10000)).default({}),
    movementRemaining: z.record(id, z.number().int().min(0).max(1000)).default({}),
    breached: recordBool,
    marked: z.record(id, id).default({}),
    slowed: z.record(id, id).default({}),
    vexed: z.record(id, id).default({}),
    stats: z.record(
      id,
      z.object({ damage: natural, taken: natural, crits: natural, healing: natural }).strict(),
    ),
  })
  .strict();
export const gameStateSchema = z
  .object({
    schemaVersion: z.literal(1),
    id,
    campaignId: id,
    campaignVersion: z.number().int().min(1),
    revision: natural,
    seed: z.number().int().min(0).max(4294967295),
    status: z.enum(['active', 'defeat', 'complete']),
    scene: id,
    players: z.array(characterSchema).min(1).max(4),
    world: z
      .object({
        miraTrust: natural,
        miraTrail: z.boolean(),
        smithTrust: natural,
        smithMetalClue: z.boolean(),
        smithFavor: z.boolean(),
        edricTrust: natural,
        keeperLore: z.boolean(),
        edricMap: z.boolean(),
        openedVault: z.boolean(),
        brokeSeal: z.boolean(),
        leftSealed: z.boolean(),
        villageRumors: z.boolean(),
        wagonClue: z.string().max(100).nullable(),
        xpAwards: recordBool,
        xpNotice: z.string().max(1000).nullable(),
      })
      .strict(),
    visited: z.array(id).max(10000),
    journal: z
      .array(z.object({ scene: id, title: z.string().max(200), turn: natural }).strict())
      .max(10000),
    events: z
      .array(
        z
          .object({
            id: natural,
            kind: z.enum(['story', 'roll', 'damage', 'heal', 'success', 'warning']),
            text: z.string().max(2000),
            detail: z.string().max(5000).optional(),
            dice: z
              .object({
                attackerId: id,
                targetId: id,
                attackName: z.string().max(100).optional(),
                distance: z.number().int().min(0).max(10000).optional(),
                coverBonus: z.number().int().min(0).max(10).optional(),
                damageType: damage.optional(),
                attack: z
                  .object({
                    sides: z.literal(20),
                    rolls: z.array(z.number().int().min(1).max(20)).min(1).max(2),
                    chosen: z.number().int().min(1).max(20),
                    bonus: z.number().int().min(-20).max(100),
                    total: z.number().int().min(-20).max(200),
                    ac: z.number().int().min(0).max(200),
                    mode: z.enum(['normal', 'advantage', 'disadvantage']),
                    critical: z.boolean(),
                    hit: z.boolean(),
                  })
                  .strict(),
                damage: z
                  .object({
                    sides: z.number().int().min(2).max(100),
                    rolls: z.array(z.number().int().min(1).max(100)).min(1).max(40),
                    bonus: z.number().int().min(-100).max(100),
                    total: z.number().int().min(0).max(10000),
                    critical: z.boolean(),
                  })
                  .strict()
                  .optional(),
              })
              .strict()
              .optional(),
            check: z
              .object({
                actorId: id,
                skill: z.string().max(100),
                attribute: z.enum(['str', 'dex', 'con', 'int', 'wis', 'cha']),
                roll: z.number().int().min(1).max(20),
                modifier: z.number().int().min(-10).max(50),
                total: z.number().int().min(-10).max(100),
                dc: z.number().int().min(1).max(40),
                success: z.boolean(),
              })
              .strict()
              .optional(),
          })
          .strict(),
      )
      .max(150),
    eventSeq: natural,
    combat: combatSchema.nullable(),
  })
  .strict()
  .superRefine((s, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
    if (new Set(s.players.map((p) => p.id)).size !== s.players.length) fail('Duplicerade hjältar.');
    const c = s.combat;
    if (!c) return;
    if (c.turn >= c.initiative.length) fail('Ogiltig turordning.');
    const ids = [...s.players.map((p) => p.id), ...c.enemies.map((e) => e.id)];
    if (
      new Set(ids).size !== ids.length ||
      new Set(c.initiative.map((e) => e.id)).size !== ids.length ||
      c.initiative.length !== ids.length
    )
      fail('Ogiltiga stridsdeltagare.');
    for (const e of c.initiative)
      if (!(e.kind === 'hero' ? s.players : c.enemies).some((p) => p.id === e.id))
        fail('Okänd stridsdeltagare.');
    for (const p of s.players) if (!c.positions[p.id] || !c.stats[p.id]) fail('Stridsdata saknas.');
    for (const e of c.enemies)
      if (e.hp > e.maxHp || (e.intent && !s.players.some((p) => p.id === e.intent)))
        fail('Ogiltig fiende.');
    if (c.victory && c.enemies.some((e) => e.hp > 0)) fail('Striden är inte vunnen.');
  });
export const commandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('choose'), next: id }).strict(),
  z.object({ type: z.literal('attack'), target: id }).strict(),
  z.object({ type: z.literal('ability'), target: id.optional() }).strict(),
  z.object({ type: z.literal('help'), target: id }).strict(),
  z.object({ type: z.literal('move'), target: id.optional() }).strict(),
  z.object({ type: z.literal('dash'), target: id.optional() }).strict(),
  ...(['defend', 'breakthrough', 'potion', 'herbs', 'continue'] as const).map((type) =>
    z.object({ type: z.literal(type) }).strict(),
  ),
]);
export const envelopeSchema = z.object({ id, revision: natural, command: commandSchema }).strict();
export const saveSchema = z
  .object({
    format: z.literal('drakvalvet'),
    version: z.literal(1),
    savedAt: z.string().datetime(),
    label: z.string().max(80),
    state: gameStateSchema,
  })
  .strict();
export type SaveFile = z.infer<typeof saveSchema>;
export function makeSave(state: GameState, label: string): SaveFile {
  return saveSchema.parse({
    format: 'drakvalvet',
    version: 1,
    savedAt: new Date().toISOString(),
    label: label.slice(0, 80),
    state,
  });
}
export const credentialsSchema = z
  .object({
    email: z
      .string()
      .email()
      .max(254)
      .transform((s) => s.toLowerCase()),
    password: z.string().min(10).max(128),
  })
  .strict();
