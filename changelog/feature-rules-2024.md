# feature/rules-2024

**Ägare:** Claude · **Status:** steg 1 (species + Origin Feats) och färdiga hjältar redo för granskning
**Förhandsvisning:** https://drakvalvetastra-git-feature-rules-2024-broklyn777s-projects.vercel.app

## För spelaren

**Species (D&D 2024).** Ger egenskaper i stället för attributbonusar:
- **Human** – Heroic Inspiration: första misslyckade Ability Check slås om, en gång per Long Rest.
- **Elf** – Keen Senses: +2 på Perception, Insight och Survival. Darkvision.
- **Dwarf** – Dwarven Toughness: +1 HP per nivå. Darkvision.
- **Halfling** – Luck: en naturlig 1:a på d20 (anfall, Ability Check, Initiative) slås om. Brave.

**Origin Feats** ersätter talangerna:
- **Tough** (förut Stålsinne) – +2 HP per nivå.
- **Alert** (förut Skarp blick) – +2 på Initiative, och **Initiative Swap**: när striden börjar kan Alert-hjälten byta initiativ med en kamrat (bara i gruppspel).
- **Healer** (förut Packråtta) – **Battle Medic**: örterna är ditt Healer's Kit. Använd en på dig själv eller en kamrat inom 5 ft (även en fallen); kamraten spenderar en Hit Point Die och får tärningen + 2 i HP. **Healing Rerolls**: 1:or slås om på Battle Medic och klerikerns Helande ord. +1 ört.
- **Savage Attacker** (ny) – vapenskadan slås två gånger, den högsta används.

**Attribut:** klassens Standard Array + en bakgrunds +2/+1 (huvudattribut +2, CON +1). Samma för alla species.

Karaktärsskaparen visar "Species" och "Origin Feat", och attributen som STR/DEX/CON/INT/WIS/CHA.

**Klasser enligt D&D 2024, nivå 1** (kontrollerat mot D&D Beyond: Hit Die, startutrustning A, nivå 1-förmågor):

| Klass | Utrustning | Förmåga |
|---|---|---|
| **Fighter** | Chain Mail, Greatsword (Graze), Flail (Sap), 8 Javelins (Slow) | **Second Wind**: Bonus Action, 1d10 + nivå, 2 gånger · Fighting Style: **Great Weapon Fighting** (1:or och 2:or blir 3:or) |
| **Paladin** (ny) | Chain Mail + Shield, Longsword (Sap), 6 Javelins (Slow) | **Lay On Hands**: Bonus Action, 5 HP-pott |
| **Cleric** | Chain Shirt + Shield, Mace | **Healing Word**: Bonus Action, 2d4 + WIS, 60 ft, 2 Spell Slots |
| **Rogue** | Leather Armor, Shortsword (Vex), Shortbow (Vex) | **Sneak Attack** 1d6, automatiskt |
| **Ranger** | Studded Leather, Longbow (Slow), Shortsword (Vex) | **Hunter's Mark** (Favored Enemy ×2) |
| **Wizard** | Robe, Fire Bolt (1d10, 120 ft) | **Burning Hands**: 3d6 eld, 15 ft, DEX Save DC 8 + 2 + INT, 2 Spell Slots |

- HP = Hit Die + CON, AC = rustning + DEX (Chain Shirt max +2, Chain Mail 0) + Shield, Attack = Proficiency 2 + STR/DEX (Finesse = bästa), cantrips utan skademodifierare.
- Vapnet väljs efter avstånd: närstridsvapen inom 5 ft, annars ett avståndsvapen som når. Weapon Mastery bara för klassens vapen: Sap ger fienden Disadvantage på nästa anfall.
- **Bonus Action**: Hunter's Mark, Healing Word och Lay On Hands kostar inte turen, men bara en Bonus Action per tur.
- Alla sex klasser följer nu 2024. Kraftslag (inte en regel) är borttaget.
- **Graze**: en miss med Greatsword gör ändå skada lika med STR-modifieraren.

**Färdiga hjältar** (Standard Array + bakgrundens +2/+1 och Origin Feat):
- **Sigrun Ljusbärare** – Human Paladin, Soldier, Savage Attacker. 12 HP, AC 18, Longsword +5.
- **Brodd Stenhjärta** – Dwarf Cleric, Hermit, Healer. 11 HP, AC 15, Healing Word 2d4 + 3.
- **Pip Snabbfot** – Halfling Rogue, Criminal, Alert. 10 HP, AC 14, Shortsword +5.
- **Liria Vindspår** – Elf Ranger, Soldier, Savage Attacker. 12 HP, AC 15, Longbow +5.
- **Alma Glödsten** – Human Wizard, Criminal, Alert. 8 HP, AC 11, Fire Bolt +5.

Väljs överst i karaktärsskaparen, i testrutan eller med `?scen=door&hjalte=brodd`.

## Tekniskt

- `raceData`/`talentData` omskrivna; interna id:n (`human`, `iron`, `keen`, `supply`) behållna så gamla sparningar och testlänkar fungerar. Nytt id `savage`.
- `classData.*.base` = Standard Array, nya fält `asi` och `hitDie`.
- Nytt: `packages/engine/src/traits.ts` (`heroD20`, `hpPerLevelBonus`, `initiativeBonus`, `skillBonus`, `hitDie`).
- `Character.inspiration` och `Character.hitDiceUsed` (valfria fält), `Combat.swapPending`, kommandot `swapInitiative` och `herbs` med valfritt `target`.
- Initiative Swap-valet visas i `game-view.tsx` i stället för stridspanelen; `combat-panel.tsx` fick bara en ny Battle Medic-knapp. Klassernas HP/AC/attack är fortfarande spelets gamla fasta värden – det är steg 2.
- Tester: `tests/rules-2024.test.ts` (14 st), `tests/pregens.test.ts` (12 st).
- Nytt: `packages/content/src/equipment.ts` (vapen, rustningar), `packages/content/src/pregens.ts`. `className`-jämförelser i motor och UI ersatta med `selection.class`.
- Nya fält: `CharacterSelection.pregen`, `Character.spellSlots`, `Character.layOnHands`, `Combat.sapped`, `Combat.bonusUsed` (alla valfria/default, gamla sparningar laddas; äldre Wizard/Cleric får 2 Spell Slots vid nästa strid).
- `combat-panel.tsx`: förmågeknappen använder klass-id, döljs för Sneak Attack och visar Bonus Action-text.

## Avvikelser från reglerna

- Human: Skillful och Versatile (ett extra Origin Feat) saknas. Heroic Inspiration används automatiskt, spelaren väljer inte när.
- Darkvision, Fey Ancestry, Trance, Brave, Dwarven Resilience och Stonecunning har ingen effekt ännu.
- Keen Senses märks först när berättelsen har Perception/Insight/Survival-slag (inga ännu).
- Hit Point Dice fylls inte på, eftersom spelet saknar Long Rest.
- **Inte kontrollerat mot källan** (ligger bakom betalvägg): vilka attribut Hermit höjer (antaget CON/WIS/CHA) och Paladinens Spell Slots på nivå 1. Soldier (STR/DEX/CON, Savage Attacker) och Criminal (DEX/CON/INT, Alert) är kontrollerade.
- Inga besvärjelser utöver Healing Word, Burning Hands och Fire Bolt; Paladinens och Clericens övriga spells, cantrips och Divine Order saknas. Wizard saknar Quarterstaff/Dagger i närstrid (skjuter Fire Bolt med Disadvantage inom 5 ft).
- Rogue: Expertise och Thieves' Cant saknar effekt. Javelins räknas inte ned. Ingen regel om "en spell slot per tur".

## Balans

Första striden, 1000 frön, Human + Tough, samma enkla taktik: Krigare 69,9 %, Tjuv 65,8 %, Magiker 32,9 % (lägre än förut: Tough ger +2 HP mot Stålsinnes +4, och species ger inte längre HP/AC). Tas om hand när klasserna räknas om i steg 2.

## Balans med färdiga hjältar

Första striden **solo** mot två Bandits (Fighter, egen hjälte: 72,4 % med Tough, 60,4 % med Savage Attacker) (som i 2024 har exakt dessa värden), 1000 frön, enkel taktik med klassförmågor: Liria 70,4 %, Sigrun 63,9 %, Pip 38,5 %, Brodd 34,2 %, Alma 10,6 %. Solo på nivå 1 är tufft enligt reglerna; hjältarna är byggda för att spela i sällskap.

## Verifierat

- `npm test` 73/73, `npm run typecheck` och `npm run build` lokalt.
- Lokal webbläsare, `?scen=door&klass=warrior&talang=iron`: Human Fighter 14 HP, AC 16, Second Wind grå vid fullt HP, Anfall möjligt på 10 ft (Javelin).
- Lokal webbläsare: skaparen visar 5 färdiga hjältar och 6 klasser; Brodd visar 11 HP, AC 15, +3, Chain Shirt. `?scen=door&hjalte=brodd` startar striden med Healing Word-knappen och Bonus Action-texten.
- Lokal webbläsare med ett importerat sällskap (Human Rogue med Alert + Dwarf Cleric med Healer): Initiative Swap-rutan visade turordningen, bytet gav "Läkaren agerar nu på 12, Vaken på 17"; Läkarens tur visade knappen "Battle Medic på Läkaren".
- Lokal webbläsare: karaktärsskaparen visar Species (4), Klass (4), Origin Feat (4) med nya texter; Human Krigare: 18 HP, AC 14, STR 17 DEX 14 CON 14 INT 8 WIS 10 CHA 12.
