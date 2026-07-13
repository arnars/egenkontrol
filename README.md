# Digitalt egenkontrolsystem

Et kommende digitalt egenkontrolsystem til den daglige drift i en mindre dansk deli, minirestaurant og takeaway. Systemet skal gøre planlagte kontroller, registreringer, afvigelser, korrigerende handlinger, historik og eksport let tilgængelige på iPad.

## Status

SvelteKit-fundamentet og de konfigurationsdrevne visninger "Dagens kontroller" og "Ugens kontroller" er oprettet. Ugegeneratoren respekterer lokationens normale driftsdage, så faste lukkedage ikke skaber falske mangler. Drizzle-schemaet er migreret til Supabase, RLS er slået til på alle 11 applikationstabeller, og virksomhedsspecifikke læsepolitikker er tilføjet. Supabase Auth er integreret med server-validerede cookies og beskyttede interne routes. Temperaturformularen skriver måling, eventuel afvigelse, korrigerende handling og auditspor atomisk. Gemte målinger læses tilbage gennem RLS og vises som gennemført.

Den valgte retning er SvelteKit med TypeScript og Tailwind CSS 4 på Vercel, Supabase Postgres og Auth, Drizzle ORM, Zod, Vitest og Playwright. Første version er online-only. Det visuelle system er udledt af et eksisterende lokalt opskriftssite.

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

1. Materialisér ugegeneratorens forekomster i `scheduled_controls` og forbind udførelser til dem.
2. Implementér ja/nej-kontroller og tjeklister.
3. Fortsæt den faglige gennemgang af risikoanalyse, driftsdage og procedurer.
