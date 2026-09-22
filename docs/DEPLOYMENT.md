# Drift

## Lokal utveckling

`npm run dev` startar båda processerna. Standardvärden fungerar utan `.env`. Next.js läser `.env.local`, men den fristående spelservern läser processens miljövariabler. Om du vill läsa en fil även för spelservern kan du använda Node 24:

```bash
node --env-file=.env.local --import tsx server/index.ts
```

Exemplet `.env.example` beskriver de relevanta variablerna. Hemligheter ska aldrig läggas i `NEXT_PUBLIC_*`.

## Produktionsstart

```bash
npm ci
npm run build
npm start
```

Webbapp och spelserver kan köras separat med `start:web` och `start:server`. Den kompilerade servern finns i `dist/server/index.js`; TypeScript-loader behövs inte vid produktionsstart.

| Variabel             | Användning                                                    |
| -------------------- | ------------------------------------------------------------- |
| `PORT`               | Next.js-port, standard 3000                                   |
| `GAME_PORT`          | Spelserverns port, standard 4001                              |
| `GAME_SERVER_URL`    | Intern adress från Next.js till spelservern                   |
| `DATABASE_PATH`      | SQLite-fil på en beständig volym                              |
| `ALLOWED_ORIGINS`    | Kommaseparerade exakta webborigins, inklusive schema och port |
| `COOKIE_SECURE`      | Sätt till `true` vid HTTPS-drift                              |
| `NEXT_PUBLIC_WS_URL` | Publik WebSocket-adress; bestäms vid Next.js build            |

För lokal körning utan miljövariabler används `ws://<webbvärd>:4001/socket`. Vid HTTPS i produktion, konfigurera exempelvis `NEXT_PUBLIC_WS_URL=wss://spel.example/socket` **innan build**. Använd samma publika värd för HTTP och WebSocket så att HttpOnly-sessionscookien når båda. En fristående WebSocket-domän kräver en annan, uttrycklig tokenlösning och stöds inte av den här cookieadaptern.

## Omvänd proxy

Ett minimalt Nginx-upplägg bakom din TLS-terminering:

```nginx
location /socket {
    proxy_pass http://game:4001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 75s;
}
location / {
    proxy_pass http://web:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Sätt `ALLOWED_ORIGINS` till webbplatsens HTTPS-origin. Håll spelserverns interna HTTP-port bakom proxyn. API-proxyn skickar endast vidare uttryckligen tillåtna resurser och cookies; den fungerar inte som en godtycklig URL-proxy.

## Docker

Dockerfilen bygger både webb och spelserver. Containern kör som den fördefinierade `node`-användaren och använder `/app/.data` för SQLite.

```bash
docker build --build-arg NEXT_PUBLIC_WS_URL=wss://spel.example/socket -t drakvalvet .
docker run --init -p 3000:3000 -p 4001:4001 \
  -e ALLOWED_ORIGINS=https://spel.example \
  -e COOKIE_SECURE=true \
  -v drakvalvet-data:/app/.data drakvalvet
```

Dockerdefinitionen är med som körbar driftkonfiguration men har inte byggts eller testats med Docker i denna workspace. Kör bakom HTTPS-proxy vid publik drift. För lokal Docker-test på HTTP: ändra `COOKIE_SECURE=false`, `ALLOWED_ORIGINS=http://localhost:3000` och bygg med `NEXT_PUBLIC_WS_URL=ws://localhost:4001/socket`.

## Databas och återställning

SQLite skapas automatiskt med WAL, foreign keys och transaktioner. `.data` ska inte versionshanteras. Säkerhetskopiera konsekvent med SQLite backup API eller stoppa spelservern innan databasfil och eventuella WAL-filer kopieras. Kopiera inte bara en aktiv `.sqlite`-fil utan hänsyn till WAL.

Rumsdata överlever processomstart. Klienter återansluter, och hämtar det sparade tillståndet. Ingen processlokal matchstatus är den enda beständiga sanningskällan. Aktiva WebSocket-anslutningar går naturligtvis förlorade vid omstart.

Sessionslivslängden är 30 dagar. E-postverifiering och lösenordsåterställning saknas. Frekvensgränserna är processlokala, och proxyn innebär att många HTTP-anrop kan dela intern IP; produktionsdrift bör lägga separata per-användare/per-IP-gränser vid edge och en delad limiter.

## Verifiera en installation

- `GET /api/health` via webbappen ska svara med `ok: true`.
- Spela solo, skapa en manuell sparning och ladda efter omladdning.
- Öppna två separata webbläsarprofiler, skapa ett rum och starta med två hjältar.
- Testa återanslutning och kontrollera att båda klienter visar samma scen och stridslogg.
- Registrera ett konto, spara privat och ladda från en annan profil.

Se `ARCHITECTURE.md` före fler än en spelserverprocess. Flera processer framför samma SQLite-fil ger inte korrekt delad WebSocket-närvaro eller broadcast.
