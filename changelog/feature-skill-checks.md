# feature/skill-checks

**Ägare:** Claude · **Status:** redo för granskning
**Förhandsvisning:** https://drakvalvetastra-git-feature-skill-checks-broklyn777s-projects.vercel.app

## För spelaren

- Vissa val i berättelsen kräver nu ett Ability Check: d20 + ability modifier mot en Difficulty Class (DC).
- Valknappen visar slaget och din chans, till exempel "Deception · CHA · DC 12 · 45%".
- Efter valet visar scenen hur slaget gick.
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
- Provspelat av Björn i Vercel-förhandsvisningen med testsparningar vid tornet: både lyckade och misslyckade slag. (Före termbytet.)
