# feature/rules-2024

**Ägare:** Claude · **Status:** steg 1 (species + Origin Feats) redo för granskning; steg 2 (klasser) efter Ranger-valet
**Förhandsvisning:** https://drakvalvetastra-git-feature-rules-2024-broklyn777s-projects.vercel.app

## För spelaren

**Species (D&D 2024).** Ger egenskaper i stället för attributbonusar:
- **Human** – Heroic Inspiration: första misslyckade Ability Check slås om, en gång per Long Rest.
- **Elf** – Keen Senses: +2 på Perception, Insight och Survival. Darkvision.
- **Dwarf** – Dwarven Toughness: +1 HP per nivå. Darkvision.
- **Halfling** – Luck: en naturlig 1:a på d20 (anfall, Ability Check, Initiative) slås om. Brave.

**Origin Feats** ersätter talangerna:
- **Tough** (förut Stålsinne) – +2 HP per nivå.
- **Alert** (förut Skarp blick) – +2 på Initiative.
- **Healer** (förut Packråtta) – örter fungerar som Healer's Kit: Hit Die + 2, 1:or slås om. +1 ört.
- **Savage Attacker** (ny) – vapenskadan slås två gånger, den högsta används.

**Attribut:** klassens Standard Array + en bakgrunds +2/+1 (huvudattribut +2, CON +1). Samma för alla species.

Karaktärsskaparen visar "Species" och "Origin Feat", och attributen som STR/DEX/CON/INT/WIS/CHA.

## Tekniskt

- `raceData`/`talentData` omskrivna; interna id:n (`human`, `iron`, `keen`, `supply`) behållna så gamla sparningar och testlänkar fungerar. Nytt id `savage`.
- `classData.*.base` = Standard Array, nya fält `asi` och `hitDie`.
- Nytt: `packages/engine/src/traits.ts` (`heroD20`, `hpPerLevelBonus`, `initiativeBonus`, `skillBonus`, `hitDie`).
- `Character.inspiration` (valfritt fält). Klassernas HP/AC/attack är fortfarande spelets gamla fasta värden – det är steg 2.
- Tester: `tests/rules-2024.test.ts` (11 st).

## Avvikelser från reglerna

- Human: Skillful och Versatile (ett extra Origin Feat) saknas. Heroic Inspiration används automatiskt, spelaren väljer inte när.
- Darkvision, Fey Ancestry, Trance, Brave, Dwarven Resilience och Stonecunning har ingen effekt ännu.
- Keen Senses märks först när berättelsen har Perception/Insight/Survival-slag (inga ännu).
- Alert saknar Initiative Swap. Healer saknar "Battle Medic" på andra.
- Standard Array-värdena är från mitt minne av 2024 års Player's Handbook, inte kontrollerade mot källan.

## Balans

Första striden, 1000 frön, Human + Tough, samma enkla taktik: Krigare 69,9 %, Tjuv 65,8 %, Magiker 32,9 % (lägre än förut: Tough ger +2 HP mot Stålsinnes +4, och species ger inte längre HP/AC). Tas om hand när klasserna räknas om i steg 2.

## Verifierat

- `npm test` 46/46, `npm run typecheck` och `npm run build` lokalt.
- Lokal webbläsare: karaktärsskaparen visar Species (4), Klass (4), Origin Feat (4) med nya texter; Human Krigare: 18 HP, AC 14, STR 17 DEX 14 CON 14 INT 8 WIS 10 CHA 12.
