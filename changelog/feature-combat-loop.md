# feature/combat-loop

**Ägare:** ChatGPT · **Status:** under arbete
**Förhandsvisning:** https://drakvalvetastra-git-feature-combat-loop-broklyn777s-projects.vercel.app

## För spelaren

- Segerskärmen visar nu runda, antal besegrade fiender, kvarvarande HP, healing, skada och kritiska träffar.
- När ett mål är utanför räckvidd visar huvudknappen i striden om du ska flytta eller använda Dash i stället för att bara blockera Anfall.
- Vanlig förflyttning kan göras före Anfall under samma tur.
- Den första närstridsbanditen i öppningsstriden börjar nu inom 5 ft så att Anfall kan användas direkt när det är din tur.
- Stridsvyn visar nu faktiskt avstånd till valt mål separat från kvarvarande Movement.

## Tekniskt

- Combat-UI:t använder `attackAvailability` för att växla primär handling mellan Anfall, Flytta mot mål och Dash mot mål.
- Full-loop-testet är gjort deterministiskt och testar state-flödet utan att bero på encounter-balans eller RNG.
- Test finns för att vanlig movement inte förbrukar handlingen och för att första melee-målet är attackbart direkt.

## Verifierat

- Vercel-deployment för senaste kända combat-preview har rapporterat success via GitHub-status.
- `npm test` och `npm run typecheck` är inte markerade som verifierade lokalt i denna branch ännu.
