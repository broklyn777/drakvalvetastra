# Första striden vid Tre Lyktor

Alla avstånd mäts från spelarnas startposition (0 ft). Stridsmotorns avståndsregler gäller för detta encounter.

Båda fienderna använder [Bandit (2014 Legacy) från D&D Beyond](https://www.dndbeyond.com/monsters/16798-bandit): AC 12, 11 HP, speed 30 ft och DEX 12. De har Scimitar (+3, 1T6+1 hugg, reach 5 ft) och Light Crossbow (+3, 1T8+1 stick, range 80/320 ft). Två banditer ger totalt 50 XP som encounterts grundbelöning. Namntillägget ”armborstskytt” visar vilken av de två som inleder med avståndsvapen; det är samma fiendetyp.

| Väg in                             | Svärdsbandit | Armborstskytt | Effekt                                                                                        |
| ---------------------------------- | -----------: | ------------: | --------------------------------------------------------------------------------------------- |
| Direkt till dörren                 |         5 ft |         50 ft | Banditen hotar i närstrid; skytten kan skjuta från gården.                                    |
| Via gamle mannen och dörren        |         5 ft |         50 ft | Samma formation; sigillet är berättelsens belöning.                                           |
| Via fönstret, varna vid dörren     |         5 ft |         50 ft | Samma formation; varningen är en berättelseflagga och ger ingen separat stridsbonus.          |
| Via fönstret, flankera genom köket |         5 ft |          5 ft | Båda kan angripas direkt. Skytten står i framlinjen och drar sabeln om spelaren är inom 5 ft. |

Texten beskriver nu armborst och sabel, vilka fienderna faktiskt bär. Skytten har kvar `preferredAttack: 'ranged'` i båda varianterna och kan skjuta om avståndet åter öppnas; stridsmotorn väljer dess `Scimitar` vid högst 5 ft. `surprise: 'enemies'` behålls vid flankeringen. Här betyder surprise nackdel på fiendernas initiativslag, inte att de automatiskt förlorar sin första tur. De har oförändrade HP, AC, attackvärden, vapenprofiler och XP; nära startläge begränsar skyttens första anfall till den svagare sabeln.

Värdshusstriden har inga valbara skyddsplatser. Vid flankeringen är belöningen redan att spelaren når båda banditerna i närstrid och tvingar skytten att dra sabeln. Via dörren är skytten fortfarande ett avståndshot från 50 ft. Mellanliggande levande varelser kan ge Half Cover enligt [taktiska stridsregler](tactical-combat.md), men ingen av vägarna uppmanar spelaren att lämna sitt överläge för att gömma sig vid eken eller vedboden.

Verifiering: `tests/engine.test.ts` går igenom samtliga fyra vägar, testar vilka mål som går att anfalla i första rundan och kontrollerar skyttens faktiska vapen och avstånd vid första anfallet. Kör `npm test` och `npm run typecheck`.

En enkel balanskontroll med 100 fasta slumpfrön per variant och samma ensamma krigare/taktik gav 77 segrar via dörren och 84 via flankeringen. Det visar en måttlig fördel i detta urval, inte ett generellt mått på balans för alla klasser eller gruppstorlekar.
