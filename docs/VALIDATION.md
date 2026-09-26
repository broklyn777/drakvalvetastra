# Verifiering

Verifierat i denna workspace med Node.js 24.19.0.

| Kontroll            | Resultat                                                                |
| ------------------- | ----------------------------------------------------------------------- |
| `npm run typecheck` | Godkänd, strikt TypeScript                                              |
| `npm test`          | 44 av 44 tester godkända med en tillfällig Node-shim för saknat `/proc` |
| `npm run build`     | Next.js och serverbygget godkända med samma miljöshim                   |
| `npm run test:e2e`  | Chromium kraschar före testerna i denna sandbox utan `/proc`            |
| `npm run dev`       | Verifierades före ändringen av kryptan                                  |
| Visuell granskning  | Tidigare dator- och mobilvy granskade; kryptans nya UI återstår lokalt  |

Webbläsartesterna är skrivna för att verifiera följande när Chromium kan starta:

1. En hel berättelseväg från skapad rollperson, genom två strider, till Skogsby och slutet. Inkluderar manuell sparning, omladdning och konsekvensberoende val.
2. Avvisning av felaktig sparfil, import av giltig fil, export och tangentbordsstängning av dialog.
3. Två separata spelarsessioner: lobby, skapande, delade scenval, turbehörighet, synkroniserad stridslogg, återanslutning efter omladdning och avvisning av obehörig tredje användare.
4. Kontoregistrering, inloggning från en annan webbläsarkontext och återställning av kontosparning.

Enhetstesterna täcker bland annat alla 44 sceners länkar, 48 karaktärskombinationer, deterministiska strider, avstånd, skydd, siktlinjer, officiella monsterprofiler, motstånd/sårbarhet, klassförmågor, gruppskalning, nivågränser, sparvalidering, idempotenta kommandon, revisionskonflikter och lösenordshashning.

Tidigare skärmbilder finns i `artifacts/home-desktop.png`, `artifacts/combat-desktop.png` och `artifacts/game-mobile.png`; de visar inte den nya kryptan.

Docker, PostgreSQL, horisontell skalning, verklig internetdrift och belastning med många samtidiga rum har inte verifierats. Nuvarande körning använder en spelserver och SQLite.
