# feature/dice-polish

**Ägare:** ChatGPT · **Status:** redo för preview-test efter SVG-uppdatering
**Förhandsvisning:** https://drakvalvetastra-git-feature-dice-polish-broklyn777s-projects.vercel.app

## För spelaren

- Ability Check använder nu en riktig SVG-ritad d20 med tydliga facetter.
- Den kompakta layouten visar tärningen centralt och resultatet direkt under.
- Resultatraden använder **Träff! / Miss!** och visar det riktiga slaget, ability-modifiern och totalen, till exempel `12 + 2 = 14 (Krav: DC 10)`.
- Själva rullanimationen är kort och kosmetisk; slutvärdet kommer alltid från motorn.
- Natural 20 får en diskret guldburst utan att ändra reglerna.

## Tekniskt

- Ingen ändring av RNG, DC, modifiers eller success/failure-logik.
- Ability Check-animationen är cirka 0,48 s med cirka 0,18 s landning.
- Slumpade siffror under animationen är endast kosmetiska. Engine-eventets `roll`, `modifier`, `total` och `dc` används i slutresultatet.
- STR/DEX/CON/INT/WIS/CHA-bonus hämtas alltså från samma riktiga Ability Check-data som tidigare.

## Verifierat

- Ingen lokal test/typecheck är markerad som verifierad ännu.
