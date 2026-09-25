# Första striden vid Tre Lyktor

Alla avstånd mäts från spelarnas startposition (0 ft). Detta är en ändring av första encountert; stridsmotorns regler är oförändrade.

| Väg in                             | Svärdsbandit | Armborstskytt | Effekt                                                                                                 |
| ---------------------------------- | -----------: | ------------: | ------------------------------------------------------------------------------------------------------ |
| Direkt till dörren                 |         5 ft |         50 ft | Banditen hotar i närstrid; skytten kan skjuta från gården.                                             |
| Via gamle mannen och dörren        |         5 ft |         50 ft | Samma formation; sigillet är berättelsens belöning.                                                    |
| Via fönstret, varna vid dörren     |         5 ft |         50 ft | Samma formation; varningen är en berättelseflagga och ger ingen separat stridsbonus.                   |
| Via fönstret, flankera genom köket |         5 ft |          5 ft | Båda kan angripas direkt. Skytten står i framlinjen och tar fram kortsvärdet om spelaren är inom 5 ft. |

Texten beskriver nu armborst, vilket fienden faktiskt bär. Skytten har kvar `preferredAttack: 'ranged'` i båda varianterna och kan skjuta om avståndet åter öppnas; stridsmotorn väljer dess `Scimitar` vid högst 5 ft. `surprise: 'enemies'` behålls vid flankeringen. Här betyder surprise nackdel på fiendernas initiativslag, inte att de automatiskt förlorar sin första tur. De har oförändrade HP, AC, attackvärden, vapenprofiler och XP; nära startläge begränsar skyttens första anfall till det svagare kortsvärdet.

Verifiering: `tests/engine.test.ts` går igenom samtliga fyra vägar, testar vilka mål som går att anfalla i första rundan och kontrollerar skyttens faktiska vapen och avstånd vid första anfallet. Kör `npm test` och `npm run typecheck`.

En enkel balanskontroll med 100 fasta slumpfrön per variant och samma ensamma krigare/taktik gav 77 segrar via dörren och 84 via flankeringen. Det visar en måttlig fördel i detta urval, inte ett generellt mått på balans för alla klasser eller gruppstorlekar.
