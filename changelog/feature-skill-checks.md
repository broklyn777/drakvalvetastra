# feature/skill-checks

**Ägare:** Claude · **Status:** redo för granskning
**Förhandsvisning:** https://drakvalvetastra-git-feature-skill-checks-broklyn777s-projects.vercel.app

## För spelaren

- Vissa val i berättelsen kräver nu ett färdighetsslag: T20 + attributmodifierare mot en svårighetsgrad (SV).
- Valknappen visar slaget och din chans, till exempel "Bluff · KAR · SV 12 · 45%".
- Efter valet visar scenen hur slaget gick.
- Vid vakttornet:
  - **Klättra med repet** (STY eller SMI, SV 10). Misslyckas du faller du (1T4 skada, aldrig under 1 HP) och vakterna överraskar dig.
  - **Bluffa med sigillet** (KAR, SV 12). Misslyckas du frågar vakten efter lösenordet och det blir strid.
- Berättelse-XP för att smyga eller bluffa förbi ges bara om du lyckas.

## Tekniskt

- `Choice` kan ha ett tredje, valfritt fält: `{ skill, attributes, dc, fail }`.
- Nytt: `packages/engine/src/checks.ts`. Slaget görs i `dispatch` och loggas som ett event med `check`-data.
- `check` är valfritt i sparschemat, så gamla sparningar går fortfarande att ladda.
- Två nya scener: `towerSneakFail` och `towerBluffFail` (totalt 44).

## Verifierat

- `npm test` 31/31, `npm run typecheck` och `npm run build` lokalt.
- Inte provspelat hela vägen till tornet i webbläsaren.
