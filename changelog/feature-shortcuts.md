# feature/shortcuts

**Ägare:** Claude · **Status:** redo för granskning
**Förhandsvisning:** https://drakvalvetastra-git-feature-shortcuts-broklyn777s-projects.vercel.app

## För spelaren

- Genvägarna (testläget) finns nu i alla miljöer, även i produktion på drakvalvetastra.vercel.app.
- Bannern högst upp på startsidan har en knapp **GENVÄGAR**. Klick öppnar testrutan och scrollar dit.
- Direktlänkar som `?scen=towerExterior&klass=warrior&folk=dwarf&har=rope,sigil` fungerar också i produktion.

## Tekniskt

- `drakvalvet.tsx`: tog bort villkoret `environment !== 'PRODUCTION'`, lade till knappen i bannern (texten STRIDSPATCH är orörd).
- `test-mode.tsx`: `openTestMode()`, `id="testlage"` på rutan, ny undertext.
- Genvägar påverkar bara solospel i webbläsaren; multiplayer styrs fortfarande av servern.
- Vill vi dölja genvägarna inför en publik release räcker det att återinföra villkoret i `drakvalvet.tsx`.

## Verifierat

- `npm test` 36/36, `npm run typecheck` och `npm run build` lokalt.
- Lokal webbläsare: bannern visar GENVÄGAR; klick öppnade testrutan.
