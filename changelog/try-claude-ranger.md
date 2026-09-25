# try/claude-ranger

**Ägare:** Claude · **Status:** jämförelse med `try/gpt-ranger`, redo att provspelas
**Förhandsvisning:** https://drakvalvetastra-git-try-claude-ranger-broklyn777s-projects.vercel.app

## För spelaren

- Ny klass **Ranger**, byggd på **D&D 2024:s regler** i stället för spelets tidigare fasta värden. Björn beslutade 2026-09-25 att nya klasser följer reglernas skala.
  - HP = 10 + CON, AC = Studded Leather 12 + DEX, Attack = Proficiency 2 + DEX, skada = vapentärning + DEX. Människa med Skarp blick: 12 HP, AC 15, +6.
  - Grundvärden (Standard Array för Ranger): STR 12, DEX 15, CON 13, INT 8, WIS 14, CHA 10, plus folkets bonus.
  - Nästa nivå: +6 + CON (d10).
- **Longbow**: 1d8 + DEX Piercing, 150/600 ft, **Weapon Mastery Slow** (träffat mål rör sig 10 ft kortare till din nästa tur).
- **Shortsword**: dras automatiskt när en fiende står inom 5 ft. 1d6 + DEX Piercing, **Weapon Mastery Vex** (Advantage på ditt nästa anfall mot samma mål).
- **Hunter's Mark** via **Favored Enemy**: 2 gånger per Long Rest, Bonus Action, 90 ft. Träffar mot målet gör +1d6. Kostar inte turen. Faller målet kan du flytta märket gratis på din nästa tur.

## Tekniskt

- `classData.ranger.rules` = `{ hitDie, armorBase, proficiency, attackAbility }`; `createCharacter` räknar ut HP/AC/attack/skada från attributen när `rules` finns. Övriga klasser oförändrade. Folkets och talangens bonusar (t.ex. alvens +1 AC) läggs på som för alla klasser.
- `combat.ts`: `heroAttackProfile(p, distance)` med Longbow/Shortsword och mastery; `isRangedHero` ersätter `className === 'Magiker'`.
- Nya fält: `Character.hunterMarks` (valfritt), `Combat.marked`, `slowed`, `vexed` (Zod `default({})`, gamla sparningar laddas).
- Tärningsfönstret visar vapnets egen skada; Hunter's Mark-tärningen står i loggen och räknas in i skadan.
- Rörde inte `combat-panel.tsx`. Tester: `tests/ranger.test.ts` (9 st).

## Avvikelser från reglerna

- Hunter's Mark gör Piercing i stället för Force (spelet saknar Force).
- Ingen Concentration som kan brytas, och ingen Advantage på Perception/Survival för att spåra målet.
- Spelet har ingen Long Rest ännu, så de 2 användningarna räcker hela kapitlet.
- Vex gäller nästa anfall mot målet, utan gränsen "före slutet av din nästa tur".
- Spellcasting (2 förberedda besvärjelser) saknas; spelet har ingen magi.
- Knapptexten "Varje handling använder din tur" (i `combat-panel.tsx`) stämmer inte för Hunter's Mark.
- Hittar Rangern vaktsvärdet vid tornet byts Longbow ut (gäller alla klasser).

## Verifierat

- `npm test` 45/45 och `npm run typecheck` lokalt.
- Lokal webbläsare, `?scen=door&klass=ranger&folk=human&talang=keen`: 12 HP, Hunter's Mark visar "1 kvar före nästa Long Rest", ny förmågetext. Tidigare version: Anfall samma tur, attackfönster och Slow i loggen.
- Simulering av första striden, 1000 frön, talang Stålsinne, samma enkla taktik: Ranger 85,8 % (människa) / 86,1 % (alv); Krigare 75,4 / 82,1; Tjuv 73,5 / 79,7; Magiker 42,5 / 51,6.
