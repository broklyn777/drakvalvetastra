# Taktisk strid

Stridskommandon behandlas i spelmotorn. UI visar samma avstånd, AC och slag som motorn använder; sparade stridstillstånd valideras av protokollet.

## Position, sikt och skydd

- I avståndsstrider, exempelvis värdshuset, mäts avstånd i ft från hjältarnas start vid 0 ft. Närstrid når 5 ft. Avståndsattacker använder vapnets normal och lång räckvidd och får nackdel på långt avstånd eller inom 5 ft från målet. Fri rörelse förbrukar hastighet; Dash förbrukar handlingen och ger ytterligare en hastighet.
- Mellanliggande levande varelser och platser märkta `half` ger **Half Cover: +2 AC** mot avståndsattacker. Bara ett skydd räknas även när flera finns på samma linje. Händelsen sparar skyddets källa och visar anfallsslag som `T20 + bonus vs AC`.
- Om ett encounter har terrängplatser kan en hjälte ta skydd vid en sådan genom förflyttning. Skyddet slutar gälla när hjälten lämnar platsen. `total` bryter siktlinjen för avståndsattacker åt båda håll på mer än 5 ft; en avståndsfiende kan närma sig för att hitta en attackväg. Närstrid inom 5 ft fungerar även vid skyddet. Magikerns yteffekt når inte mål bakom totalt skydd. Värdshusstriden har inga terrängplatser: flankeringen belönar närstrid mot skytten.
- I strider utan mätta avstånd används framlinje och baklinje. En närstridshjälte måste stå i framlinjen och nå fiendens framlinje, eller bryta igenom för att nå baklinjen. Att byta position använder förflyttningen men lämnar handlingen tillgänglig.

Detta är en endimensionell avståndsmodell, inte en rutnätskarta. När skyddspunkter finns har de namngivna avstånd; modellen beräknar inte vinklar runt pelare, träd eller byggnader. En spelares skyddsposition representerar att spelaren faktiskt står bakom föremålet. Kommandon från server och lokal solospel kör samma regler. `surprise` i kampanjen påverkar initiativ genom nackdel, enligt spelets befintliga abstraktion.

## Officiella motståndare

Samtliga befintliga strider använder låga CR-profiler från D&D Beyond 2014 Legacy:

| Plats      | Officiell varelse                                             |  CR | Profil som används                                                      |
| ---------- | ------------------------------------------------------------- | --: | ----------------------------------------------------------------------- |
| Värdshuset | [Bandit](https://www.dndbeyond.com/monsters/16798-bandit) × 2 | 1/8 | AC 12, HP 11, Scimitar +3 (1T6+1), Light Crossbow +3 (1T8+1, 80/320 ft) |
| Tornet     | [Guard](https://www.dndbeyond.com/monsters/16915-guard)       | 1/8 | AC 16, HP 11, Spear +3 (1T6+1)                                          |
| Tornet     | [Cultist](https://www.dndbeyond.com/monsters/16835-cultist)   | 1/8 | AC 12, HP 9, Scimitar +3 (1T6+1)                                        |
| Kryptan    | [Skeleton](https://www.dndbeyond.com/monsters/17015-skeleton) | 1/4 | AC 13, HP 13, Shortsword +4 (1T6+2), sårbar för krosskada               |

Spelet modellerar de attacker och skadetyper som används i striderna, men inte hela monsterblockens immuniteter och andra drag som saknar motsvarande handlingar i denna kampanj. Kampanjens gruppskalning och XP-utdelning är separata spelregler. Jägarens ledtråd ger spelaren bättre initiativ mot skelettet; den ändrar inte dess officiella HP eller AC. Ett högt rop ger i stället fienden initiativfördel enligt kampanjens surprise-modell.

## Verifiering

`npm test` kontrollerar de fyra vägarna in i värdshusstriden, faktisk attackräckvidd och vapenval, frontlinje samt officiella fiendeprofiler. En separat testuppställning med terräng verifierar skydd, bruten sikt och förflyttning utan att lägga skyddsplatser i värdshusets encounter. `npm run typecheck` och `npm run build` validerar klient, protokoll och server.
