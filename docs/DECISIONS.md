# Arkitekturbeslutninger

Statusværdier: `Foreslået`, `Accepteret`, `Erstattet`, `Afvist`. Datoen er beslutningsdato, ikke nødvendigvis implementeringsdato.

## ADR-001: SvelteKit som framework

- **Status:** Accepteret
- **Dato:** 2026-07-12

### Kontekst

Systemet er en interaktiv applikation med reaktive formularer, betingede flows, kalender- og statusvisninger og behov for server-side håndtering.

### Beslutning

Brug SvelteKit med TypeScript. Det giver reaktive UI-forløb, server-side form actions, routing og Vercel-understøttelse i en samlet stack, som er enklere end en typisk React-stack til dette projekt.

### Alternativer

Astro blev overvejet. Det er stærkt til indholdstunge sites, men egenkontrolsystemets primære karakter er en interaktiv applikation. Astro vælges derfor ikke som primært framework.

### Konsekvenser

Teamet skal etablere SvelteKit-praksis for server/client-grænser, formularer og test. Valget fastlægger ikke et komponentbibliotek.

## ADR-002: Supabase Postgres som database

- **Status:** Accepteret
- **Dato:** 2026-07-12

### Kontekst

Vedvarende data kan ikke ligge som en lokal fil i et Vercel-deployment. Systemet kræver relationer, historik, sikker adgang og eksportmulighed.

### Beslutning

Brug Supabase-hostet standard Postgres. Supabase giver også mulighed for Auth og senere Storage. Standard Postgres og almindelige eksportformater begrænser leverandørlåsning.

### Konsekvenser

Adgangspolitikker, connection-strategi, backup og eksport skal designes eksplicit. Supabase er ikke i sig selv den eneste tilladte kopi af vigtig dokumentation.

## ADR-003: Drizzle ORM

- **Status:** Accepteret
- **Dato:** 2026-07-12

### Kontekst

Projektet har behov for type-safe queries, versionsstyrede schemaændringer og gennemgåelige migrationer.

### Beslutning

Brug Drizzle ORM med schema i TypeScript og Drizzle-migrationer.

### Konsekvenser

Schema og migrationer bliver en del af code review. Standard Postgres bevares, så Postgres-host senere kan skiftes uden at udskifte domænemodellen.

## ADR-004: Online-only MVP

- **Status:** Accepteret
- **Dato:** 2026-07-12

### Kontekst

Offline-synkronisering kræver lokal lagring, kø, konfliktregler, sikkerhed og ekstra test. Domæne og arbejdsgange er endnu ikke valideret.

### Beslutning

Første version er online-only. UI skal håndtere netværksfejl tydeligt og bevare ufærdigt formularinput, hvor det er praktisk muligt, men der implementeres ikke offline-kø eller synkronisering i MVP.

### Konsekvenser

Kompleksiteten og konfliktrisikoen reduceres, så domæne og flows kan valideres hurtigere. Offline kan tilføjes senere uden løfte om bagudkompatibel synkroniseringsmodel.

## ADR-005: Opskriftssitet som visuel kilde

- **Status:** Accepteret
- **Dato:** 2026-07-12

### Kontekst

Egenkontrolsystemet skal høre til samme produktfamilie og må ikke ligne et generisk administrationssystem.

### Beslutning

Brug det lokale opskriftssite som autoritativ visuel reference for typografi, farver, spacing, komponenter, responsive mønstre og relevante printregler. Referenceprojektet behandles read-only.

### Konsekvenser

Designværdier må først fastlægges efter kode- og visuel analyse dokumenteret i `DESIGN_SYSTEM.md`. Domænespecifikke afvigelser skal begrundes.

## Åbne beslutninger

- Komponentbibliotek eller projektspecifikke komponenter
- Kalenderbibliotek eller egen visning
- E-mail-/notifikationsløsning
- PDF-generator og eksportlayout
- Backupudbyder, frekvens, retention og gendannelsesproces
- Supabase-adgangsmodel og detaljeret rollemodel

## ADR-006: Separate databaseforbindelser til runtime og migrationer

- **Status:** Accepteret
- **Dato:** 2026-07-12

### Kontekst

Applikationen skal køre som serverless SvelteKit på Vercel, mens migrationer og backupværktøjer har andre forbindelsesbehov. Supabases transaction pooler er beregnet til midlertidige serverless-forbindelser og understøtter ikke prepared statements. Den direkte forbindelse er beregnet til blandt andet migrationer og `pg_dump`.

### Beslutning

Brug `DATABASE_URL` med Supabases transaction pooler til applikationens runtime og `DIRECT_URL` med den direkte Postgres-forbindelse til Drizzle Kit, migrationer og administrative værktøjer. Postgres.js konfigureres med `prepare: false` og en lille forbindelsespulje i runtime.

### Konsekvenser

Begge forbindelser skal konfigureres separat i lokale, preview- og produktionsmiljøer. Migrationer må ikke køres via transaction pooleren. RLS, Auth og mindst mulige databaseprivilegier skal afklares før produktionsbrug.

## ADR-007: Inviteret adgang med Supabase Auth

- **Status:** Accepteret
- **Dato:** 2026-07-12

### Kontekst

Systemet indeholder virksomhedsinterne registreringer og må ikke tilbyde offentlig selvoprettelse. Supabases standardmailtjeneste tillader ikke den redigerbare token-hash-skabelon, som et server-side magic-link-flow kræver, uden at egen SMTP først konfigureres.

### Beslutning

Første version bruger inviterede Supabase-brugere med e-mail og adgangskode. SvelteKit opbevarer sessionen i cookies, validerer identiteten med `getClaims()` på serveren og beskytter alle routes undtagen login. Offentlig signup implementeres ikke.

### Konsekvenser

Den ene administrative bruger oprettes manuelt og knyttes til en actor. Glemt adgangskode, magic links og mailnotifikationer er ikke en del af det nuværende flow. RLS-politikker skal fortsat håndhæve virksomhedstilhørsforhold uafhængigt af routebeskyttelsen.

## ADR-008: Tailwind CSS som stylinglag

- **Status:** Accepteret
- **Dato:** 2026-07-13

### Kontekst

Det visuelle referenceprojekt bruger Tailwind CSS 4, mens den første egenkontrolprototype brugte en samlet fil med komponentorienteret CSS. Det gjorde værdierne sværere at sammenligne direkte med referencen og samlede mange selectors i en fil, som voksede med hvert flow.

### Beslutning

Brug Tailwind CSS 4 via den officielle Vite-plugin. Komponenternes layout, typografi, spacing, tilstande, responsive varianter og printadfærd skrives som utilities i Svelte-filerne. Den globale CSS begrænses til Tailwind-import, design-tokens, dokumentets grundstil, fokusmarkering og `@page`.

### Konsekvenser

Designværdier kan sammenlignes direkte med referenceprojektets Tailwind-skala. Lange class-lister accepteres i de få større views; gentagne mønstre skal først udtrækkes som Svelte-komponenter, når der findes reel genbrug. Der bruges ikke `@apply` til at genskabe et parallelt komponent-CSS-lag.

## ADR-009: Driftsdage filtrerer kalenderbaserede kontroller

- **Status:** Accepteret
- **Dato:** 2026-07-13

### Kontekst

Der er ikke nødvendigvis bemanding på alle kalenderdage. Hvis en daglig regel genererede kontroller på faste lukkedage, ville systemet vise falske mangler og svække tilliden til overblikket.

### Beslutning

Lokationer konfigurerer normale `operatingWeekdays`. Kalenderbaserede forekomster genereres kun på driftsdage; `daily` fortolkes som hver driftsdag. Lukkedage vises eksplicit i ugeoverblikket, men danner ikke en planlagt kontrol. Første generator beregner den aktuelle uge deterministisk i lokationens tidszone. Materialisering i `scheduled_controls`, datoundtagelser og regler for ændringer af en allerede materialiseret plan behandles som efterfølgende ændringer.

### Konsekvenser

Nabo Brejnings udkast kan have mandag og søndag fri uden falske mangler. Normale åbningstider kan ændres i virksomhedskonfigurationen. Ferie, helligdage og ekstraordinære åbningsdage kræver en særskilt undtagelsesmodel, før de kan påvirke planen.

## ADR-010: Lazy materialisering af den aktuelle temperaturuge

- **Status:** Accepteret
- **Dato:** 2026-07-13

### Kontekst

MVP’en har endnu ingen scheduler eller cron-job, men udførte temperaturkontroller skal kunne pege på en konkret, revisionssikker planlagt forekomst. En ren beregnet UI-projektion er ikke tilstrækkelig dokumentation.

### Beslutning

Den autentificerede sideindlæsning materialiserer den aktuelle uges faste temperaturforekomster gennem en `SECURITY DEFINER`-RPC. RPC’en validerer actorens virksomhed og lokation, begrænser inputvinduet og indsætter idempotent efter occurrence key. Completion-RPC’en kræver forekomstens UUID, låser rækken, forhindrer en anden oprindelig udførelse og ændrer status atomisk sammen med registreringen.

Opvarmning, nedkøling, varemodtagelse og varmholdelse omfattes ikke. De er hændelsesbaserede og skal senere oprette en forekomst som del af deres konkrete startflow.

### Konsekvenser

Planlagte temperaturkontroller eksisterer i databasen, før de udføres, uden at MVP’en behøver en ekstern scheduler. Gentagne indlæsninger skaber ikke dubletter. Sideindlæsningen har en kontrolleret, idempotent skriveeffekt; en senere scheduler kan overtage samme RPC-kontrakt. Eksisterende udførelser backfilles ikke. Definitioner skal fortsat versionsstyres, så en allerede materialiseret forekomst ikke omskrives af senere konfigurationsændringer.

## ADR-011: Ingen måling er et særskilt revisionsspor

- **Status:** Accepteret
- **Dato:** 2026-07-14

### Kontekst

Den normale driftsuge kan ikke forudsige sygdom, helligdage eller ekstraordinær lukning. En manglende temperaturværdi må hverken gemmes som en fiktiv måling eller efterlades uforklaret.

### Beslutning

En materialiseret kontrol kan afsluttes med udfaldet **Ingen måling** og en årsag fra virksomhedskonfigurationen. Udfaldet gemmes append-only med forekomst, årsagskode, label-snapshot, eventuel kort bemærkning, aktør og servertid. Databasen sikrer atomisk, at forekomsten ikke samtidig kan have en oprindelig måling, og ændrer schedule-status til `cancelled`.

De normale `operatingWeekdays` bevares. De beskriver den forventede uge, mens **Ingen måling** dokumenterer en afvigelse på en konkret allerede planlagt dag.

### Konsekvenser

Historikken kan skelne mellem en udført måling, en begrundet dag uden måling og en reelt manglende kontrol. Årsager kan justeres i `config/virksomhed.json` uden at omskrive tidligere labels. Noter bør ikke indeholde unødige personfølsomme oplysninger.

## Skabelon til fremtidige ADR'er

```md
## ADR-NNN: Kort titel

- **Status:** Foreslået | Accepteret | Erstattet | Afvist
- **Dato:** YYYY-MM-DD
- **Erstatter/erstattet af:** ADR-NNN (hvis relevant)

### Kontekst

Hvilket problem, hvilke krav og hvilke begrænsninger udløser beslutningen?

### Beslutning

Hvad er besluttet, og hvad er udtrykkeligt ikke besluttet?

### Alternativer

Hvilke realistiske alternativer blev vurderet, og hvorfor blev de fravalgt?

### Konsekvenser

Positive og negative følger, risici, migration og opfølgende arbejde.
```
