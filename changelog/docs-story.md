# docs/story

**Ägare:** Claude · **Status:** redo för granskning
**Förhandsvisning:** ingen spelförändring – läs `docs/STORY.md` på GitHub

## För spelaren

Ingen ändring i spelet. För oss som skriver berättelsen:

- **`docs/STORY.md`**: hela berättelsen med karta (flödesschema) över alla 44 scener och val, och varje scen med text, textvarianter, val och vad som krävs för dem, färdighetsslag, strider, belöningar och vad scenen ändrar.
- **`npm run story`** skriver om dokumentet från koden. Kör det efter varje ändring i `watchtower.ts`.

## Tekniskt

- Nytt: `scripts/story-map.ts`. Läser `campaigns.watchtower`, provar varje villkor (sigillet, repet, Miras spår, Edrics förtroende …) för att hitta villkorade val, textvarianter och stridsvarianter, kör varje scens effekt på en kopia för att se vad den ändrar, och söker igenom grafen från båda kampanjstarterna för att hitta scener som inte går att nå.
- Kartan är Mermaid (`flowchart TD`) i två delar: Prolog och Kapitel 1. `-->` val, `-.->` misslyckat färdighetsslag, `==>` vunnen strid.
- Effekterna visas för en Human Fighter; värden som AC beror på hjälten.

## Verifierat

- `npm run story`: 44 scener, 0 onåbara.
- Mermaid-koden tolkades och ritades utan fel med mermaid 11 i webbläsaren.
