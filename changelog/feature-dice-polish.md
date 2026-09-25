# feature/dice-polish

**Ägare:** ChatGPT · **Status:** redo för preview-test efter SVG-uppdatering
**Förhandsvisning:** https://drakvalvetastra-git-feature-dice-polish-broklyn777s-projects.vercel.app

## För spelaren

- Ability Check, Attack Roll och damage-rolls använder nu samma Gemini-stil: stillastående tärningsruta, snabbt sifferflimmer och därefter motorns riktiga resultat.
- Den kompakta layouten visar tärningen centralt och resultatet direkt under.
- Resultatraden använder **Träff! / Miss!**. Ability Checks visar riktig ability-modifier och total, Attack Rolls visar riktig Attack Bonus mot AC, och skadetärningar visar riktiga damage-rolls och bonusar från motorn.
- Ingen rotation, tumble, bounce eller SVG-effekt används längre. Siffrorna flimrar cirka 0,63 s och slutvärdet kommer alltid från motorn.
- Natural 20 får en diskret guldburst utan att ändra reglerna.

## Tekniskt

- Ingen ändring av RNG, DC, modifiers eller success/failure-logik.
- Ability Check och Attack Roll använder cirka 0,63 s sifferflimmer i Gemini-stil utan separat landningsanimation.
- Slumpade siffror under animationen är endast kosmetiska. Engine-eventets `roll`, `modifier`, `total` och `dc` används i slutresultatet.
- STR/DEX/CON/INT/WIS/CHA-bonus hämtas alltså från samma riktiga Ability Check-data som tidigare.

## Verifierat

- Ingen lokal test/typecheck är markerad som verifierad ännu.
