# Arbejdsinstruks for kodeagenter

## Formål og afgrænsning

Projektet er et digitalt egenkontrolsystem til en mindre dansk deli, minirestaurant og takeaway. Det skal understøtte planlægning, udførelse, afvigelseshåndtering, historik, revision og eksport af egenkontrol. Systemet er et dokumentationsværktøj, ikke en juridisk godkendelse.

Domænet og begreberne i `docs/DOMAIN.md` er styrende. Agenter må ikke opfinde juridiske krav, temperaturgrænser, kontrol- eller dokumentationshyppigheder, opbevaringsperioder eller andre faglige regler. Konkrete værdier skal komme fra virksomhedens fagligt vurderede risikoanalyse og procedurer.

## Teknisk retning

- SvelteKit og TypeScript
- Vercel
- Supabase Postgres og Supabase Auth
- Drizzle ORM og migrationer
- Zod-validering
- Vitest og Playwright
- Online-only i MVP; offline-synkronisering er ikke omfattet
- Eget visuelt system udledt af opskriftssitet; intet generisk dashboarddesign

Detaljer, som ikke er besluttet i `docs/DECISIONS.md`, må ikke behandles som fastlagte. Det gælder blandt andet komponent- og kalenderbibliotek, e-mail, PDF-generator og backupudbyder.

## Autoritative dokumenter

1. `AGENTS.md` fastlægger arbejdsregler.
2. `docs/DOMAIN.md` fastlægger domænesprog og afgrænsning.
3. `docs/DATA_MODEL.md` beskriver den foreløbige informationsmodel.
4. `docs/DECISIONS.md` registrerer tekniske beslutninger.
5. `docs/DESIGN_SYSTEM.md` bliver designets autoritative specifikation efter referenceanalysen.
6. `docs/SOURCES.md` registrerer faglige kilder og deres påvirkning.
7. `docs/CONFIGURATION.md` og `config/egenkontrol.defaults.json` beskriver det versionerede startkatalog; udkast må ikke behandles som godkendte regler.
8. `docs/ROADMAP.md` rummer aktuelle og kortvarige opgaver. Sådanne opgaver må ikke lægges i denne fil.

Ved konflikt skal den mest specifikke, godkendte beslutning bruges, og konflikten dokumenteres.

## Visuel reference og UI

Opskriftssitet angivet i `docs/LOCAL_SETUP.md` er read-only og den autoritative visuelle reference. Undersøg det før UI-arbejde; opfind ikke designværdier. Undgå SaaS-sidebars, blå/grå standardskabeloner, kraftige skygger, overflødige kort og tunge tabeller.

Primær enhed er en iPad i et køkkenmiljø. UI skal have store trykflader, fungere uden hover, understøtte stående og liggende retning, kræve få trin og lidt fritekst samt tydeligt vise manglende kontroller og gemmeresultat. Formularinput bør så vidt praktisk bevares ved netværksfejl. Løsningen skal kunne forstås uden teknisk oplæring.

## Dataintegritet og sikkerhed

- Udførte kontroller er revisionsrelevante og må ikke slettes eller overskrives lydløst.
- Rettelser, brugeridentitet, tidspunkt med tidszone og væsentlige ændringer skal kunne spores.
- Afvigelser er selvstændige registreringer og må ikke afsluttes uden dokumenteret stillingtagen; korrigerende handlinger skal fremgå.
- Brug immutable registreringer eller eksplicit versions-/korrektionshistorik, når historik har dokumentationsværdi.
- Vigtig dokumentation skal kunne eksporteres og sikkerhedskopieres; databasen må ikke være eneste mulige kopi.
- Minimer leverandørlåsning, hvor det er praktisk muligt.
- Secrets må aldrig committes, logges, sendes til klienten eller placeres i `PUBLIC_*`. Brug senere `.env.local` som beskrevet i `docs/LOCAL_SETUP.md`.
- Valider input på serveren, håndhæv adgangskontrol server-side, og anvend mindst mulige privilegier.

## Database og migrationer

- Enhver schemaændring skal have en gennemgåelig Drizzle-migration; ret ikke produktionsschema manuelt.
- Migrationer skal være fremadrettede, deterministiske og så vidt muligt bagudkompatible.
- Beskriv datamigrering, rollback/afhjælpning og effekt på historiske data.
- Destruktive ændringer kræver eksplicit beslutning og verificeret backup/eksportplan.
- Redigér ikke allerede anvendte migrationer; opret en ny korrigerende migration.
- Opdater `docs/DATA_MODEL.md` og relevante tests sammen med schemaændringer.

## Arbejdsproces

1. Læs `AGENTS.md`.
2. Læs relevante filer i `docs/`.
3. Undersøg eksisterende kode og referenceprojekt.
4. Beskriv nødvendige antagelser.
5. Implementér den mindst mulige sammenhængende ændring.
6. Tilføj eller opdatér tests.
7. Opdatér dokumentation.
8. Opdatér `docs/ROADMAP.md`.
9. Opsummér ændringer, åbne spørgsmål og testresultat.

Bevar brugerens eksisterende ændringer. Nye domæneantagelser skal markeres og afklares, før de bliver bindende regler.

## Test- og dokumentationskrav

Forretningsregler, validering og dataintegritet skal dækkes af Vitest. Centrale brugerforløb, adgangskontrol og iPad-relevante layouts skal dækkes af Playwright. Fejltilstande og netværksfejl skal testes, når de berøres. Kør relevante tests og rapportér præcist, hvad der blev kørt.

Dokumentation er en del af ændringen: opdater domæne, datamodel, ADR, designnoter, kilder og roadmap efter behov. Dokumentér hvorfor, ikke kun hvad. Gentag ikke lange tekster på tværs af filer; link til den autoritative beskrivelse.
