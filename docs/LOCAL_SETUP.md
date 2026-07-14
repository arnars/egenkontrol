# Lokal udviklingskontekst

Projektet bruger Node.js 24.x og pnpm. Installer dependencies med `pnpm install`, og start udviklingsserveren med `pnpm dev`.

Vercel-projektet hedder `egenkontrol` under teamet `weareremotely` og er forbundet med GitHub-repositoryet `arnars/egenkontrol`. Produktionsdeployments bruger Node.js 24.x. Den midlertidige offentlige produktionsadresse er `https://egenkontrol-eta.vercel.app`; det tilsigtede domæne er `https://egenkontrol.nabobrejning.dk`.

Domænet er tilføjet til projektet, og DNS hos DNS.services peger subdomænet `egenkontrol` på Vercels projektspecifikke CNAME `f7a9a3aa3cff5d2f.vercel-dns-017.com`. Vercel verificerede konfigurationen og HTTPS den 14. juli 2026. Status kan genkontrolleres med `vercel domains verify egenkontrol.nabobrejning.dk`.

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

Lokale hemmeligheder skal ligge i `.env.local`. Filen må aldrig committes. Den lokale fil indeholder foreløbig kun den offentlige projekt-URL og publishable key; databasecredentials er ikke gemt i projektmappen.

Det fælles Supabase-projekt hedder `egenkontrol`, har projektreference `qgihpnympwvtbjufwawg` og ligger i regionen Central EU (Frankfurt). Den offentlige projekt-URL er `https://qgihpnympwvtbjufwawg.supabase.co`. Credentials og databasepassword dokumenteres ikke i repositoryet.

Forventede variabelnavne:

```text
DATABASE_URL=
DIRECT_URL=
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RECIPE_SITE_PATH=
```

| Variabel                    | Eksponering                  | Forventet formål                                                                  |
| --------------------------- | ---------------------------- | --------------------------------------------------------------------------------- |
| `DATABASE_URL`              | Kun server                   | Applikationens Postgres-forbindelse; kan indeholde credentials.                   |
| `DIRECT_URL`                | Kun server                   | Direkte databaseforbindelse til migrationer/administration.                       |
| `PUBLIC_SUPABASE_URL`       | Offentlig                    | Supabase-projektets offentlige URL.                                               |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Offentlig              | Klientnøgle designet til offentlig brug sammen med korrekt adgangskontrol.        |
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
pnpm db:generate
pnpm db:check
pnpm db:migrate
```

Playwright-browsere installeres lokalt med `pnpm exec playwright install`, før browsertests køres første gang.

`DATABASE_URL` skal bruge Supabases transaction pooler til Vercel-runtime. Postgres.js er konfigureret med `prepare: false`, fordi transaction pooling ikke understøtter prepared statements. `DIRECT_URL` bruges af Drizzle Kit til migrationer og senere af `pg_dump`/administration. Kopiér `.env.example` til `.env.local` og indsæt aldrig rigtige credentials i repositoryet.

Den første migration blev anvendt på Supabase 12. juli 2026 og er registreret i Drizzles migrationstabel. Schedule-materialiseringen og dens korrigerende enum-cast-migration blev anvendt 13. juli 2026. Migrationerne til begrundede afslutninger uden måling og den atomiske dagshandling blev anvendt og verificeret 14. juli 2026; databasen har derefter 12 applikationstabeller og migrationsjournalen otte poster. De anvendte migrationsfiler er uforanderlige; senere schema- eller funktionsændringer skal ligge i nye migrationsfiler. Kør aldrig `drizzle-kit push` direkte mod det delte miljø.

Supabase Auth bruger i første version inviteret e-mail og adgangskode. Selvoprettelse er ikke en del af applikationen. `hooks.server.ts` validerer sessionens JWT-claims server-side og sender anonyme brugere til `/login`. Magic links afventer egen SMTP og en redigerbar PKCE-kompatibel mailskabelon.

## Skal afklares

- Om preview og produktion senere skal bruge hver sin Supabase-instans; begge Vercel-miljøer peger foreløbig på det delte projekt
- Lokal Supabase til integrationstests kontra den delte fjerninstans
- Hvordan referenceprojektets commit/version registreres i designanalysen
