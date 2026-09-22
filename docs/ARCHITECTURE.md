# Arkitektur och utbyggnad

## Varför Next.js

Next.js äger webbappen: serverrenderat skal, React-gränssnitt, kontoflöden och en proxy till spelservern. Spelmotorn är vanlig TypeScript, och den långlivade WebSocket-servern körs i en separat Node-process. Därför kräver mer kampanjinnehåll eller en ny transport inte en omskrivning av spelreglerna.

App Router används utan externa UI-ramverk. CSS-variabler håller färger och typografi gemensamma. Scenillustrationen är en lokal SVG-komponent. Inga externa typsnitt, bilder, inline-DOM-manipulationer eller PeerJS-CDN:er behövs. Berättelsetextens begränsade `<strong>`-markeringar renderas som React-noder; godtycklig HTML körs inte.

## Spelmotorns kontrakt

`dispatch(state, campaign, actorId, command, expectedRevision)` är den enda gränsen för spelhandlingar. Den:

1. Kontrollerar kampanj/version och förväntad revision.
2. Klonar indata och validerar aktör, scenval, tur, mål och resurser.
3. Utför draget och eventuella efterföljande fiendeturer.
4. Returnerar ett nytt, serialiserbart tillstånd med höjd revision, eller oförändrad indata och ett fel.

RNG-tillstånd ingår i sparningen. Samma snapshot och kommandosekvens ger samma resultat. UI-animering eller nätverkstid påverkar inte tärningsslag. Ett avvisat drag konsumerar inga tärningsslag, föremål eller förmågor.

Kampanjens scenfactory skapar text, villkor, möten och effekter utifrån aktuellt tillstånd. Effekter körs endast av motorn på en klon, en gång per besökt scen. Text och möten beräknas om efter effekten. Scenläsning i UI ändrar ingenting. Den här modellen bevarar originalets berättelse och kan senare ersättas stegvis med helt deklarativa effektdefinitioner för en innehållseditor.

## En ny kampanj

1. Skapa en modul under `packages/content/src` som returnerar `Record<string, Scene>`.
2. Använd stabila scen-ID:n och `Choice`-tupler. Alla mål måste finnas, inklusive `combat.onWin`.
3. Registrera ett `Campaign` i `packages/content/src/index.ts`: ID, version, start, text och XP-regler.
4. Lägg till tester för alla länkar, villkorade vägar och minst ett komplett genomspel.
5. Höj `campaign.version` om ett gammalt tillstånd inte längre går att tolka. Lägg då till en uttrycklig migrering innan den nya versionen används för gamla sparningar.

Första implementationen har två kampanj-ID:n med olika startpunkt i samma innehåll. Det demonstrerar oberoende kampanjstart och sparidentitet utan att hitta på ett utlovat nytt innehållskapitel.

## Nya stridsregler

Lägg till en variant i `GameCommand`, motsvarande Zod-schema och en handler i spelmotorn. UI skickar endast avsikten. Nätverksklienten får aldrig själv bestämma skada, XP, motståndarens liv eller en annan aktörs identitet.

Initiativ använder T20 + SMI-modifierare, och överraskning ger nackdel på initiativ. Naturlig 20 dubblar skadetärningarna, inte fasta bonusar. Naturlig 1 missar. Försvar ger nackdel till hjältens nästa tur. Skydda ger +2 försvar tills krigarens nästa tur och delar resurs med Kraftslag. Förstärkt skada appliceras innan motstånd/sårbarhet. Tjuvens specialattack följer samma målregler som vanliga attacker.

Fiendeturer körs i en iterativ scheduler med skyddsgräns. Bossen annonserar mål före sitt utfall, och byter fas under halva maxlivet. Det finns inga rekursiva UI-timeouts som riskerar att köras igen vid rendering eller återanslutning.

## Sparformat

`format: "drakvalvet"`, `version: 1`, `state.schemaVersion: 1` och `campaignVersion` är separata kontrakt. Alla importer går genom Zod och kontroll mot kampanjens scener. Framtida versioner avvisas tydligt; någon godtycklig version konverteras inte på chans. Version 1 är det första sparformatet. Originalet hade inga beständiga sparfiler att migrera.

LocalStorage är en liten adapter bakom `SaveRepository`. Den kan ersättas med IndexedDB utan ändringar i spelreglerna. Kontosparningar är privata data; de används inte som betrodd multiplayerprogression. Slumptalsfröet är avsett för reproducerbarhet, inte kryptografiskt rättvisa lootboxar.

## Multiplayer och databas

Servern äger rummet. Aktören hämtas från sessionen, aldrig från klientens command-payload. Rumstillträde, kapacitet och värdrättigheter kontrolleras på servern. Alla berättelseval får göras av en levande medlem; revisionen avgör vilket av två samtidiga val som accepteras.

Ett kommando har ett unikt ID och förväntad spelrevision. Samma ID och samma innehåll från samma aktör kvitteras utan att utföras igen. Ett annat innehåll med samma ID avvisas. Snapshot, kommandokvitto och karaktärsprogression sparas i samma SQLite-transaktion, med jämförelse av rummets föregående revision.

Närvaro härleds från anslutna sockets och sparas inte som sanning i databasen. Heartbeat tar bort döda anslutningar. Klienten återansluter med begränsad exponentiell väntetid och får ett nytt snapshot. Om ett drag hann sparas innan anslutningen dog visar snapshot dess resultat; klienten försöker inte automatiskt spela om ett osäkert drag.

Tabeller: `users`, `sessions`, `rooms`, `commands`, `saves`, `characters`. Gäster har samma stabila användar-ID-modell som konton. Sessionsnycklar hashas; lösenord får unikt salt och scrypt. Behörighetskontroller, Origin-kontroll, meddelandegränser och lokala frekvensgränser finns i transportlagret.

## Vägen till flera serverinstanser

Nuvarande SQLite-repository är synkront och avsett för en process med lokal disk. Det är inte en distribuerad låsmekanism eller ett skalbarhetsbevis. Byt i följande ordning:

1. **PostgreSQL:** gör repositorymetoderna asynkrona, flytta SQL till en PostgreSQL-adapter, versionsstyr migreringar och behåll revision + unik `(room_id, command_id)` i transaktionen. Se `postgres-schema.sql` som startpunkt, inte som en redan aktiverad adapter.
2. **Rumsägarskap:** en spelserver äger ett rum åt gången. Lägg till leases/fencing eller en partitionerad kommandokö. Vid flytt läses senaste snapshot från databasen innan fler drag tas emot.
3. **Delade anslutningar:** lägg närvaro och pub/sub i Redis/NATS eller motsvarande. Routing måste leverera rumsmeddelanden även till sockets på andra processer. Optimistisk DB-låsning ensam löser inte broadcast.
4. **Operativt skydd:** flytta frekvensgränser till delad lagring eller edge, lägg till mätvärden, strukturerade loggar, spårning och lasttester med riktiga återanslutningar och serverbortfall.
5. **Konton:** anslut en identitetsleverantör eller inför verifiering, återställning, sessionshantering och missbruksskydd före en publik tjänst med kontokrav.

Fullständiga snapshots är rimliga för små turbaserade rum. För mycket större tillstånd kan protokollet få deltaändringar med snapshot-resynk. Detta bör styras av mätning. Kommandotabellen är en revisionslogg; full event sourcing och godtycklig historisk replay kräver också bevarade initiala snapshots och versionsbundna spelregler.

## Kända produktgränser

- Ingen automatisk takeover av en frånkopplad hjältes tur; spelaren måste återansluta.
- Ingen värdöverföring i en ej startad lobby. En spelare som väljer att lämna kan återansluta med samma konto/cookie.
- Ingen kampanjöverskridande multiplayerhandel eller utrustningsöverföring.
- Ingen redaktör, extern kampanjimport, servermoddar, chatt eller matchmaking.
- Inget e-postflöde, lösenordsbyte, glömt lösenord eller federerad inloggning.
- Ingen distribuering, Redis, PostgreSQL-adapter eller genomförd kapacitetstestning av många samtidiga rum.

Dessa gränser blockerar inte de implementerade solo- och kooperativa äventyren.
