# feature/skill-checks

**Ägare:** Claude · **Status:** redo för granskning
**Förhandsvisning:** https://drakvalvetastra-git-feature-skill-checks-broklyn777s-projects.vercel.app

## För spelaren

- Vissa val i berättelsen kräver nu ett Ability Check: d20 + ability modifier mot en Difficulty Class (DC).
- Valknappen visar slaget och din chans, till exempel "Deception · CHA · DC 12 · 45%".
- När du väljer ett val med slag öppnas ett tärningsfönster: du klickar på **Slå d20**, tärningen rullar och du ser resultatet (till exempel "13 + 0 = 13 mot DC 10 · Lyckat!") innan berättelsen fortsätter. Fönstret säger vad du behöver slå, till exempel "Du behöver slå 10 eller mer på d20 · 55% chans". Du kan också ångra dig och välja något annat.
- Scenen visar sedan hur slaget gick.
- Vid vakttornet:
  - **Klättra med repet**: Athletics (STR), DC 10. Misslyckas du faller du (1d4 damage, aldrig under 1 HP) och vakterna överraskar dig.
  - **Bluffa med sigillet**: Deception (CHA), DC 12. Misslyckas du frågar vakten efter lösenordet och det blir strid.
- Karaktärsbladet visar STR, DEX, CON, INT, WIS och CHA.
- Berättelse-XP för att smyga eller bluffa förbi ges bara om du lyckas.

## Tekniskt

- `Choice` kan ha ett tredje, valfritt fält: `{ skill, attributes, dc, fail }`.
- Nytt: `packages/engine/src/checks.ts`. Slaget görs i `dispatch` och loggas som ett event med `check`-data.
- `check` är valfritt i sparschemat, så gamla sparningar går fortfarande att ladda.
- Två nya scener: `towerSneakFail` och `towerBluffFail` (totalt 44).

## Kvar utanför denna branch

- Karaktärsskaparen och några andra vyer visar fortfarande STY/SMI/KAR. Bör tas i en separat terminologibranch.

## Verifierat

- `npm test` 31/31, `npm run typecheck` och `npm run build` lokalt.
- `npm test` 31/31 och `npm run typecheck` igen efter bytet till engelska D&D-termer.
- Tärningsfönstret testat i lokal webbläsare med testsparningarna: Athletics lyckas (13 + 0 mot DC 10) och Deception misslyckas (7 + 1 mot DC 12, striden startar efter Fortsätt).
- Raden "Du behöver slå 10 eller mer på d20 · 55% chans" kontrollerad i lokal webbläsare (Testa, STR +0, DC 10).
- Provspelat av Björn i Vercel-förhandsvisningen med testsparningar vid tornet: både lyckade och misslyckade slag. (Före termbytet.)
