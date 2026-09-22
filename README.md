# Drakvalvet

En fungerande Next.js / React / TypeScript-port av `upload/Drakvalvet-v021.html`, med originalets 42 scener och en gemensam spelmotor för solo och kooperativ multiplayer.

## Starta

Kräver **Node.js 24+** och npm. Node 24 används för den inbyggda SQLite-drivrutinen.

Öppna projektmappen i VS Code. Uppgiften **Drakvalvet: starta** körs automatiskt,
installerar saknade paket och öppnar port 3000. På Windows kan du även dubbelklicka
`start-drakvalvet.cmd`; på macOS dubbelklickar du `start-drakvalvet.command`.

```bash
npm ci
npm run dev
```

Öppna **http://localhost:3000**. Kommandot startar webbappen på port 3000 och spelservern på port 4001. Ingen extern tjänst, databasinstallation, API-nyckel eller CDN krävs för att spela.

```bash
npm run typecheck
npm test
npm run build
npm start
```

`npm run build` bygger både Next.js och spelservern till JavaScript. `npm start` kör båda i produktionsläge. För separat drift finns `npm run start:web` och `npm run start:server`.

### Webbläsartester

```bash
npm run build
npm run test:e2e
```

Testerna startar egna servrar och använder `.data/e2e.sqlite`. Stäng eventuella lokala servrar på port 3000/4001 först. På Linux används Chromium från npm-paketet `@sparticuz/chromium`; på macOS/Windows installeras testwebbläsaren med `npx playwright install chromium`. Du kan ange `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` för en egen binär.

## Det som går att spela

- **Väktarnas arv**: hela originalets prolog och Kapitel 1, från Kungsvägen till den stulna kistan i Skogsby.
- **Skogsbys hemligheter**: en separat kampanjingång som börjar direkt i Skogsby. Återanvänder originalets Kapitel 1; detta är inte en nyskriven fortsättning efter originalets slut.
- Fyra folkslag, fyra klasser och tre talanger: 48 kombinationer, med samma grundvärden som originalet.
- Initiativ, naturlig 1/20, kritiska träffar, fördel/nackdel, skadetyper, motstånd och sårbarheter.
- Fram-/baklinje, genombrott, positionsbyte, försvar, hjälp, Skydda, fyra klassförmågor, läkebrygder och örter.
- Gruppskalade möten, en boss som förbereder utfall och byter fas, stridslogg och resultatöversikt.
- Utrustning, XP, nivåer upp till 20, journal samt relationer och villkorade berättelseval.
- Solo, lokal kontroll över importerade sällskap och onlinekooperativ för 2–4 spelare.

## Sparningar och konton

**Solo:** automatisk sparning efter varje godkänt drag, tre manuella sparplatser, lokal hjälteöversikt och validerad JSON-import/export. Sparningar bevarar även pågående strid, turordning och slumptalstillstånd. Lokal lagring hör till webbläsaren och domänen; exportera en fil för en oberoende kopia.

**Konton:** registrering, inloggning, utloggning och kontosparning som kan laddas på en annan enhet. En gäst kan registrera sitt befintliga konto och behålla samma identitet. Lösenord lagras med saltad scrypt, sessionstoken hashad i databasen, webbläsarsessionen i en HttpOnly-cookie. E-postverifiering, lösenordsåterställning och extern identitetsleverantör är inte implementerade.

**Multiplayer:** skapa rum, dela sexteckenskoden och välj rollperson på varje enhet. Värden startar när minst två spelare är redo. Servern bestämmer resultat, turordning och behörighet. Rummet sparas efter varje förändring och visas under tidigare sällskap efter omladdning/inloggning. WebSocket återansluter automatiskt vid korta nätavbrott. Gästens återkomst förutsätter att sessionscookien finns kvar; använd konto för återkomst från annan enhet.

Multiplayerkaraktärer sparas per rum och spelare. En kampanjöverskridande ekonomi eller fri överföring av utrustning mellan multiplayerkampanjer är avsiktligt inte införd; det kräver separata regler för progression och ägande. Privata importerade solofiler kan aldrig användas för att skriva över ett serverstyrt rum.

## Projektstruktur

| Sökväg                        | Ansvar                                                                      |
| ----------------------------- | --------------------------------------------------------------------------- |
| `src/app`                     | Next.js App Router, layout, felvyer och API-proxy                           |
| `src/components`              | React-vyer för kampanjer, skapande, berättelse, strid, lobby och sparningar |
| `src/hooks/use-game.ts`       | Klientens spelkontroller, lokal lagring och återanslutning                  |
| `packages/engine/src`         | Typad, deterministisk spelmotor utan DOM, React eller nätverk               |
| `packages/content/src`        | Karaktärsdefinitioner, 42 scener och kampanjregister                        |
| `packages/protocol/src`       | Zod-validering, kommandon, rum och versionshanterade sparformat             |
| `packages/persistence/src`    | Validering av sparningar och webbläsarens lagringsadapter                   |
| `server`                      | HTTP, WebSocket, konton, rum, transaktioner och SQLite                      |
| `tests`                       | Enhets-, integrations- och webbläsartester                                  |
| `docs`                        | Arkitektur, drift och jämförelse med originalet                             |
| `upload/Drakvalvet-v021.html` | Originalet, bevarat utan ändringar                                          |

## Utbyggnad

Läs [arkitekturen](docs/ARCHITECTURE.md), [funktionsjämförelsen](docs/PARITY.md) och [driftinstruktionerna](docs/DEPLOYMENT.md).

Den här implementationen kör **en auktoritativ spelserver med SQLite**. Nästa steg för horisontell skalning är ett asynkront PostgreSQL-repository, rumsägarskap mellan spelservrar och delad närvaro/pub-sub. Next.js kan skalas separat. Dessa gränser är förberedda i uppdelningen, men en distribuerad multiplayerplattform är inte driftsatt eller lastverifierad här.
