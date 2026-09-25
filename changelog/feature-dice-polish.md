# feature/dice-polish

**Ägare:** ChatGPT · **Status:** redo för preview-test
**Förhandsvisning:** https://drakvalvetastra-git-feature-dice-polish-broklyn777s-projects.vercel.app

## För spelaren

- Ability Check-tärningen har fått tydligare d20-form och facetter.
- Själva rullanimationen är kortare och snabbare så återkommande slag inte känns sega.
- Resultatet landar med en kort bounce och får diskret visuell skillnad mellan lyckat och misslyckat slag.
- Natural 20 och Natural 1 får lite extra visuell karaktär utan att ändra reglerna.

## Tekniskt

- Ingen ändring av RNG, DC, modifiers eller success/failure-logik.
- Ability Check-animationen har kortats från 0,9 s till 0,56 s.
- Resultatpresentationen använder endast CSS-klasser från det redan serverbestämda check-resultatet.

## Verifierat

- Ingen lokal test/typecheck är markerad som verifierad ännu.
