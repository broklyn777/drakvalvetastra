# feature/test-mode

**Ägare:** Claude · **Status:** redo för granskning
**Förhandsvisning:** https://drakvalvetastra-git-feature-test-mode-broklyn777s-projects.vercel.app

## För spelaren

Påverkar inte spelare i produktion. Testläget visas bara i Vercel-förhandsvisningar och lokalt.

- Ny hopfällbar ruta **Testläge** på startsidan: välj kampanj, scen, folk, klass, talang, seed och föremål (rep, sigill, fackla, järnmynt, jägarens varning) och klicka **Starta här**.
- **Kopiera länk** ger en adress som startar samma test direkt, till exempel
  `?scen=towerExterior&klass=warrior&folk=dwarf&talang=iron&seed=1013904226&har=rope,sigil`.
  Bra att skicka med när man ber om granskning. Adressen rensas efter start så att en omladdning inte startar om testet.
- Samma seed ger samma tärningsslag; byt seed för ett annat utfall.

## Tekniskt

- Nytt: `packages/engine/src/testing.ts` med `createTestGame`, `testScenes`, `parseTestParams` och `testParams`.
- Hoppet går genom motorns vanliga `enter` (nu exporterad), så sceneffekter, story-XP och strider startar precis som när man spelar dit.
- URL-parametrar valideras mot kampanjens scener och karaktärsdata (`Object.hasOwn`, så t.ex. `klass=toString` ignoreras).
- Nytt: `src/components/test-mode.tsx` (rutan och `useTestLink`). Aktiveras när `buildInfo.environment !== 'PRODUCTION'`.
- Egen testfil `tests/testing.test.ts` för att inte krocka med ändringar i `tests/engine.test.ts`.
- Obs: ett testspel autosparas som vanligt. I förhandsvisningen skriver det över förhandsvisningens autosparning, inte produktionens.

## Verifierat

- `npm test` 32/32, `npm run typecheck` och `npm run build` lokalt.
- Lokal webbläsare: länken `?scen=towerExterior&klass=warrior&folk=dwarf…&har=rope,sigil` startade i Det fallna vakttornet med Dvärg · Krigare och båda föremålsvalen; adressen rensades.
- Lokal webbläsare: rutan listade 42 scener, **Kopiera länk** gav en korrekt adress och **Starta här** med scenen `door` startade striden.
- Inte testat på mobil.
