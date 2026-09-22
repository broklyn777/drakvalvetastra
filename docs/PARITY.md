# Jämförelse med Drakvalvet v021

Originalet finns orört i `upload/Drakvalvet-v021.html`. Ingen iframe eller den gamla globala JavaScript-motorn används i den nya appen. `scripts/migrate-content.py` visar hur originalets användarägda scener och karaktärsdata extraherades vid portningen. Kör inte skriptet som en del av vanlig build; fortsatt författande sker i TypeScript-modulerna.

| Område i v021                             | Ny implementation                                                            |
| ----------------------------------------- | ---------------------------------------------------------------------------- |
| 42 scener                                 | Samtliga överförda, med originaltext, val och effekter                       |
| Prologen, vakttornet och valvet           | Spelbara genom strid, repväg eller sigillbluff                               |
| Mira, Runa och Edric                      | Förtroende, ledtrådar, brev/karta/spår och villkorade vagnsval bevarade      |
| Fyra folkslag, fyra klasser, tre talanger | Alla 48 kombinationer med gemensam typad skapandefunktion                    |
| Karaktärsblad                             | Attribut, rustning, vapen, talang, liv, XP, guld och inventarier             |
| Initiativ och överraskning                | Gemensam regelmotor för solo och multiplayer                                 |
| Attack, kritiska träffar och naturlig 1   | Dubbla skadetärningar på 20, fasta bonusar en gång                           |
| Klassförmågor                             | Kraftslag, Brinnande händer, Smygattack, Helande ord                         |
| Skydda, försvar och hjälp                 | Fungerande skydd med varaktighet och giltiga mål; fördel/nackdel             |
| Positioner och genombrott                 | Fram-/baklinje, magisk räckvidd, positionsbyte och STY/SMI-slag              |
| Motstånd, sårbarhet och bossfaser         | Gäller även solo via samma stridskod                                         |
| Gruppskalning                             | Fler fiender för grupper, mer uthållighet och farligare attacker för bossen  |
| Stridslogg och statistik                  | Strukturerade händelser, tärningsdetaljer, skada, mottagen skada och läkning |
| XP och nivåer                             | Samma nivåtrösklar upp till nivå 20; första gränsen konsekvent 300 XP        |
| PeerJS-spel med webbläsarvärd             | Auktoritativ Node/WebSocket-server med sessioner och behörigheter            |
| Omladdning återställer allt               | Autosparning, tre lokala platser, JSON-filer och kontosparning               |
| Tillfälliga multiplayerhjältar            | Rum och deras karaktärsprogression sparas transaktionellt i SQLite           |
| Ett globalt scenregister                  | Kampanjregister med versioner och två spelbara startpunkter                  |

Originalets SHA-256: `c88bf2644dd90a8b47cd71cd756a1ded3a4e3c60447bd12912f0ab6557ff3ab2`.

## Avsiktliga korrigeringar

- Originalets direkta uttryck för bossliv och vissa berättelsetexter beräknades när HTML-skriptet laddades. Nu beräknas de mot den aktuella världen.
- Startvärdet `nextXp=100` stämde inte med nivåtabellens första gräns på 300. Alla vyer och motorregler använder nu 300.
- Loot, sceneffekter och story-XP kan inte upprepas genom återbesök eller upprepad rendering.
- Ett upphittat vaktsvärd gör huggskada även när en magiker bär det.
- Gemensam utrustning kan låsa upp sällskapets berättelseval; föremålet tillhör fortfarande den som fann det.
- Helande ord kan återuppliva en fallen kamrat. Efter seger får kvarvarande fallna hjältar 1 liv så att gruppen inte fastnar permanent.
- Specialattacker följer samma kontroll av mål och positioner som vanliga attacker.
- Klienten kan inte ange aktörsidentitet, skada eller det slutliga spelresultatet i ett multiplayerkommando.

Detta är en funktionell port med korrigeringar och tillägg, inte en exakt reproduktion av alla ursprungliga programmeringsfel. Fortsättningen efter originalets slut är fortfarande framtida innehåll.
