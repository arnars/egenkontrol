# Lokal udviklingskontekst

Projektet bruger Node.js 24 eller nyere og pnpm. Installer dependencies med `pnpm install`, og start udviklingsserveren med `pnpm dev`.

## Visuelt referenceprojekt

Den foreløbige relative sti er:

```text
../recipe-site
```

Stien er bekræftet for denne lokale projektplacering. Referenceprojektet må kun læses og analyseres; det skal behandles som read-only. Commit aldrig absolutte lokale stier. Hvis mapperne placeres anderledes på en anden maskine, skal stien justeres lokalt.

En lokal miljøvariabel kan senere bruges:

```text
RECIPE_SITE_PATH=../recipe-site
```

## Miljøfiler og secrets

Lokale hemmeligheder skal senere ligge i `.env.local`. Filen må aldrig committes. Der er endnu ikke oprettet nogen miljøfil.

Forventede variabelnavne:

```text
DATABASE_URL=
DIRECT_URL=
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RECIPE_SITE_PATH=
```

| Variabel                    | Eksponering                  | Forventet formål                                                                  |
| --------------------------- | ---------------------------- | --------------------------------------------------------------------------------- |
| `DATABASE_URL`              | Kun server                   | Applikationens Postgres-forbindelse; kan indeholde credentials.                   |
| `DIRECT_URL`                | Kun server                   | Direkte databaseforbindelse til migrationer/administration.                       |
| `PUBLIC_SUPABASE_URL`       | Offentlig                    | Supabase-projektets offentlige URL.                                               |
| `PUBLIC_SUPABASE_ANON_KEY`  | Offentlig                    | Klientnøgle designet til offentlig brug sammen med korrekt adgangskontrol.        |
| `SUPABASE_SERVICE_ROLE_KEY` | Kun server, særligt følsom   | Privilegerede serveropgaver; må aldrig sendes til klienten.                       |
| `RECIPE_SITE_PATH`          | Lokal udvikling, ikke secret | Lokal read-only sti; må ikke ende i klientbundle eller committes som absolut sti. |

`PUBLIC_*`-værdier må kunne ses af browseren og må derfor aldrig give privilegeret adgang alene. Alle andre værdier behandles som server-only, og server-side adgangskontrol skal gælde uanset klientens UI.

## Kommandoer

```text
pnpm dev
pnpm check
pnpm lint
pnpm test:unit
pnpm test:e2e
pnpm build
```

Playwright-browsere installeres lokalt med `pnpm exec playwright install`, før browsertests køres første gang.

## Skal afklares

- Lokal Supabase kontra fjern udviklingsdatabase
- Separate miljøer til udvikling, preview og produktion
- Connection pooling kontra direkte forbindelse
- Kommandoer til udvikling, test, migration og typecheck
- Hvordan referenceprojektets commit/version registreres i designanalysen
