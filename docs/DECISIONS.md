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
