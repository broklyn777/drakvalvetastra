# feature/dice-polish

**Ägare:** ChatGPT · **Status:** redo för preview-test efter SVG-uppdatering
**Förhandsvisning:** https://drakvalvetastra-git-feature-dice-polish-broklyn777s-projects.vercel.app

## För spelaren

- Ability Check och Attack Roll använder nu samma SVG-ritade d20 med tydliga facetter.
- Den kompakta layouten visar tärningen centralt och resultatet direkt under.
- Resultatraden använder **Träff! / Miss!**. Ability Checks visar riktig ability-modifier och total, till exempel `12 + 2 = 14 (Krav: DC 10)`, och Attack Rolls visar riktig Attack Bonus mot AC.
- Själva rullanimationen följer nu Gemini-prototypen: tärningen står still medan siffrorna flimrar snabbt, och det riktiga slutvärdet kommer alltid från motorn.
- Natural 20 får en diskret guldburst utan att ändra reglerna.

## Tekniskt

- Ingen ändring av RNG, DC, modifiers eller success/failure-logik.
- Ability Check-animationen använder cirka 0,63 s sifferflimmer i Gemini-stil och en kort landning.
- Slumpade siffror under animationen är endast kosmetiska. Engine-eventets `roll`, `modifier`, `total` och `dc` används i slutresultatet.
- STR/DEX/CON/INT/WIS/CHA-bonus hämtas alltså från samma riktiga Ability Check-data som tidigare.

## Verifierat

- Ingen lokal test/typecheck är markerad som verifierad ännu.
