# Digitalt egenkontrolsystem

Et kommende digitalt egenkontrolsystem til den daglige drift i en mindre dansk deli, minirestaurant og takeaway. Systemet skal gøre planlagte kontroller, registreringer, afvigelser, korrigerende handlinger, historik og eksport let tilgængelige på iPad.

## Status

SvelteKit-fundamentet og den konfigurationsdrevne side "Dagens kontroller" er oprettet. Drizzle-schemaet er migreret til Supabase, RLS er slået til på alle 11 applikationstabeller, og virksomhedsspecifikke læsepolitikker er tilføjet. Supabase Auth er integreret med server-validerede cookies og beskyttede interne routes. Temperaturformularen skriver atomisk gennem en afgrænset databasefunktion, og gemte målinger læses tilbage gennem RLS og vises som gennemført.

Den valgte retning er SvelteKit med TypeScript på Vercel, Supabase Postgres og Auth, Drizzle ORM, Zod, Vitest og Playwright. Første version er online-only. Det visuelle system skal udledes af et eksisterende lokalt opskriftssite.

## Dokumentation

- [`docs/DOMAIN.md`](docs/DOMAIN.md) — domæne, begreber og åbne faglige spørgsmål
- [`docs/RISK_ANALYSIS_DRAFT.md`](docs/RISK_ANALYSIS_DRAFT.md) — arbejdsudkast for Nabo Brejnings første seks kontrolområder
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — afkrydsningsbar projektplan
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — foreløbig datamodel og revisionsprincipper
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) — skabelon til analyse af designreferencen
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — tekniske beslutninger og åbne valg
- [`docs/SOURCES.md`](docs/SOURCES.md) — myndigheds- og domænekilder
- [`docs/LOCAL_SETUP.md`](docs/LOCAL_SETUP.md) — lokal kontekst og kommende miljøvariabler
- [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md) — redigering og udvidelse af startkataloget
- [`config/egenkontrol.defaults.json`](config/egenkontrol.defaults.json) — konfigurerbare aktiviteter og sane defaults
- [`config/virksomhed.example.json`](config/virksomhed.example.json) — virksomhedens lokationer, udstyr og lokale valg
- [`config/virksomhed.json`](config/virksomhed.json) — Nabo Brejnings aktuelle konfigurationsudkast
- [`config/arbejdsgange.defaults.json`](config/arbejdsgange.defaults.json) — udkast til tværgående gode arbejdsgange og procedurer

## Næste trin

1. Tilføj virksomhedsspecifikke RLS-politikker og test isolation.
2. Forbind "Dagens kontroller" med den revisionssikre skrivepipeline.
3. Fortsæt den faglige gennemgang af risikoanalyse og procedurer.
