# Digitalt egenkontrolsystem

Et kommende digitalt egenkontrolsystem til den daglige drift i en mindre dansk deli, minirestaurant og takeaway. Systemet skal gøre planlagte kontroller, registreringer, afvigelser, korrigerende handlinger, historik og eksport let tilgængelige på iPad.

## Status

Projektet er i planlægningsfasen. **SvelteKit-applikationen er endnu ikke oprettet**, og der findes endnu ingen dependencies, database eller migrationer.

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

## Næste trin

1. Udarbejd virksomhedens konkrete risikoanalyse og procedurer.
2. Giv read-only adgang til opskriftssitet og udfyld designanalysen.
3. Afklar åbne domæne- og sikkerhedsspørgsmål.
4. Opret derefter det tekniske fundament som planlagt i roadmapet.
