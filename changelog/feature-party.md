# feature/party

**Ägare:** Claude · **Status:** redo att provspelas · bygger på `feature/rules-2024` (slå ihop den först)
**Förhandsvisning:** https://drakvalvetastra-git-feature-party-broklyn777s-projects.vercel.app

## För spelaren

- **Solo eller Sällskap** i karaktärsskaparen. I sällskapsläget väljer du 2–4 hjältar: färdiga hjältar med ett klick, eller din egen hjälte med "Lägg till min egen hjälte". Sedan "Börja med sällskapet".
- Hela sällskapet spelas från samma skärm. **I strid** styr du den hjälte som har turen. **Utanför strid** klickar du på en hjälte i panelen "Ditt sällskap" för att agera som hen, t.ex. dricka en läkebrygd eller använda örter.
- Sällskapspanelen visar klass och HP för varje hjälte, och vilka som har fallit.
- Genväg till ett sällskap: `?scen=door&hjalte=sigrun,brodd,solveig` (högst 4, i den ordningen).
- "Fortsätt med …" på startsidan visar hur många fler som är med i sällskapet.
- **Karaktärsblad för alla**: knappen **Blad** vid varje hjälte i sällskapspanelen, och **Karaktärsblad** under den egna hjälten, öppnar hela bladet i ett fönster (även under strid).
- Bladet har ett nytt avsnitt **Regler & förmågor**: Proficiency, Initiative, Speed, Spell Save DC, Background, species-egenskap, Origin Feat, klassförmåga, Fighting Style, resurser kvar till nästa Long Rest (Spell Slots, Lay On Hands, Second Wind, Hunter's Mark, Heroic Inspiration, Hit Point Dice) och alla vapen med attack, skada, räckvidd och Weapon Mastery.
- **Tärningsfönstret i strid ligger kvar** tills du trycker Stäng eller Fortsätt, även när turen går vidare till nästa hjälte i sällskapet. Det visar vapnet och bonusen från själva slaget (t.ex. Javelin eller Fire Bolt).
- **Skydd mot dubbeltryck** i tärningsfönstret: knapparna "Slå D8 skada" och "Stäng" dyker upp där "Slå D20" var, och kan tryckas först efter 0,6 sekunder. Då slås skadan inte av misstag, och en miss stängs inte innan du hunnit se uträkningen.
- Tärningar skrivs nu 1d6 (inte 1T6), skölden heter Shield (+2 AC), och Healer-featens örter visas som Healer's Kit med Battle Medic.

## Tekniskt

- `game-view.tsx`: `CombatPanel` nycklas på scenen, inte hjälten, så att panelens tillstånd överlever turbyten. `combat-panel.tsx`: tärningsfönstret sparar anfallarens id; mål och kamratval nollställs när turen byter hjälte.
- `useGame`: `startParty(selections)` och `focus`/`setFocus` (lokal hjälte utanför strid; nollställs vid nytt spel och laddning).
- `CharacterCreator`: `onSubmitParty` (visas inte i onlineläge). `GameView`: `onFocus` (bara lokala spel).
- `testing.ts`: `TestStart.party`, `pregenSelection`, `hjalte=` med kommalista; föremål ges till hela sällskapet.
- Motorn var redan byggd för 1–4 hjältar (turordning, XP-delning, skalade möten); inga regeländringar.
- Tester: `tests/party.test.ts` (4 st).
- Nytt: `src/components/rules-sheet.tsx`. `game-view.tsx`: bladfönster via `Modal` från `dialogs.tsx`.

## Balans

Första striden, 200 frön, enkel taktik: Solveig ensam vs Sigrun + Brodd + Solveig. Testet kräver att sällskapet vinner över 90 % och minst 50 procentenheter oftare än Solveig ensam; det gick igenom.

## Verifierat

- `npm test` 77/77 och `npm run typecheck` lokalt.
- Lokal webbläsare: sällskapsläget valde Sigrun, Brodd och Solveig; spelet visade "3 HJÄLTAR", och klick på Brodd i panelen gjorde honom aktiv.
- Lokal webbläsare: `?scen=forest&hjalte=sigrun,brodd,solveig`, knappen Blad för Brodd öppnade bladet med Spell Save DC 13, Background Hermit, Healing Word, Spell Slots 2/2, Hit Point Dice 1/1 och Mace +3 · 1d6+1.
- Lokal webbläsare, sällskap: Solveigs Fire Bolt visade 16 + 5 = 21 och 1d10 = 9 skada; fönstret låg kvar fast turen gått till Brodd, tills Fortsätt trycktes.
- Lokal webbläsare, `?scen=door&hjalte=liria,brodd,sigrun`: ett tryck direkt efter träffen ignorerades (knappen inaktiv), 0,7 s senare gick den att trycka; fyra försök.
- Lokal webbläsare: `?scen=door&hjalte=sigrun,brodd,solveig` gav Initiative Swap-rutan (Solveig har Alert) och sedan Solveigs tur.
