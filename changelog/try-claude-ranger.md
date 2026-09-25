# try/claude-ranger

**Ägare:** Claude · **Status:** jämförelse med `try/gpt-ranger`, redo att provspelas
**Förhandsvisning:** https://drakvalvetastra-git-try-claude-ranger-broklyn777s-projects.vercel.app

## För spelaren

- Ny klass **Ranger** i karaktärsskaparen.
  - Longbow: 1d8 + 2 Piercing, 150/600 ft, Attack Bonus +5, AC 14 (Studded Leather), 14 HP, livstärning d10.
  - Grundvärden enligt D&D 2024:s Standard Array för Ranger: STR 12, DEX 15, CON 13, INT 8, WIS 14, CHA 10 (plus folkets bonus).
- **Hunter's Mark** (Bonus Action, en gång per strid): markera valt mål. Dina vapenträffar mot det gör +1d6. Kostar inte turen, så du kan markera och skjuta samma tur.
- **Weapon Mastery: Slow**: en träff med Longbow sänker målets förflyttning med 10 ft till din nästa tur.
- Skjuter direkt från dörren i första striden utan att gå fram. Long range (över 150 ft) och fiende inom 5 ft ger Disadvantage, som för andra avståndsattacker.
- I strider utan avstånd står Rangern i baklinjen och når fiender i baklinjen.
- Går upp i nivå med d10: +6 + CON per nivå.

## Tekniskt

- `ClassId` + `classData.ranger` + Zod-enum + `abilities.ranger`.
- `combat.ts`: `heroAttackProfile` känner igen Longbow (följer vapnet, inte klassen); nya `isRangedHero` ersätter `className === 'Magiker'` för baklinje/räckvidd. Magikern beter sig som förut.
- Nya stridsfält `marked` och `slowed` (Zod `default({})`, så gamla sparningar laddas).
- Tärningsfönstret visar vapnets egen skada; Hunter's Mark-tärningen står i loggen (`Hunter's Mark +X`) och räknas in i skadan.
- Rörde inte `combat-panel.tsx` (ChatGPT:s fil). Ikonen i skaparen: `Crosshair`.
- Tester i egen fil `tests/ranger.test.ts` (7 st).

## Kända begränsningar

- Hunter's Mark gör extra Piercing i stället för Force (spelet saknar Force som skadetyp).
- Texten under stridsknapparna säger "Varje handling använder din tur", vilket inte stämmer för Hunter's Mark. Står i `combat-panel.tsx`.
- Hittar Rangern vaktsvärdet vid tornet byts Longbow ut mot svärdet (gäller alla klasser idag).

## Verifierat

- `npm test` 43/43, `npm run typecheck` och `npm run build` lokalt.
- Lokal webbläsare, `?scen=door&klass=ranger&folk=elf`: Hunter's Mark markerade målet och blev grå, Anfall gick att använda samma tur, pilen visade attackfönstret (Longbow, +6, Half Cover AC 14) och loggen visade Slow.
- Simulering av första striden, 1000 frön, samma enkla taktik för alla: Ranger 75,6 %, Krigare 79,1 %, Tjuv 80,1 %, Magiker 50,0 %.
