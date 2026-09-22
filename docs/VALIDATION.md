# Verifiering

Verifierat i denna workspace med Node.js 24.19.0.

| Kontroll | Resultat |
| --- | --- |
| `npm run typecheck` | Godkänd, strikt TypeScript |
| `npm test` | 24 av 24 tester godkända |
| `npm run build` | Next.js production build och kompilerad spelserver godkända |
| `npm run test:e2e` | 4 av 4 Chromium-tester godkända mot production build |
| `npm run dev` | Båda tjänster startade, healthcheck och spelvyn svarade korrekt |
| Visuell granskning | Datorvy och mobilvy granskade; ingen horisontell överströmning vid 390 px |

Webbläsartesterna verifierar:

1. En hel berättelseväg från skapad rollperson, genom två strider, till Skogsby och slutet. Inkluderar manuell sparning, omladdning och konsekvensberoende val.
2. Avvisning av felaktig sparfil, import av giltig fil, export och tangentbordsstängning av dialog.
3. Två separata spelarsessioner: lobby, skapande, delade scenval, turbehörighet, synkroniserad stridslogg, återanslutning efter omladdning och avvisning av obehörig tredje användare.
4. Kontoregistrering, inloggning från en annan webbläsarkontext och återställning av kontosparning.

Enhetstesterna täcker bland annat alla 42 sceners länkar, 48 karaktärskombinationer, deterministiska strider, målbegränsningar, motstånd/sårbarhet, klassförmågor, bossfas, gruppskalning, nivågränser, sparvalidering, idempotenta kommandon, revisionskonflikter och lösenordshashning.

Skärmbilder från testerna finns i `artifacts/home-desktop.png`, `artifacts/combat-desktop.png` och `artifacts/game-mobile.png`.

Docker, PostgreSQL, horisontell skalning, verklig internetdrift och belastning med många samtidiga rum har inte verifierats. Nuvarande körning använder en spelserver och SQLite.
