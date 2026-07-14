# Roadmap

Roadmapet er projektets levende opgaveliste. Faglige punkter skal valideres og må ikke forstås som forhåndsfastsatte myndighedskrav.

## Projektforvaltning

- [x] Initialisér lokalt Git-repository
- [x] Tilføj `.gitignore` for secrets, dependencies og genererede filer
- [x] Opret første commit med dokumentationsgrundlaget
- [x] Opret offentligt GitHub-repository med navnet `egenkontrol`
- [x] Tilføj GitHub-repositoryet som `origin` og push `main`

## Fase 0 — domæneafklaring

- [ ] Kortlæg virksomhedens aktiviteter og lokationer (én lokation registreret; aktiviteter afventer gennemgang)
- [x] Opret udvideligt startkatalog med foreslåede aktiviteter og kontroller
- [x] Adskil kontrolhyppighed og dokumentationshyppighed i konfigurationen
- [x] Adskil produktets startkatalog fra virksomhedens lokale konfiguration
- [x] Tilføj konfiguration af lokationer, udstyr og lokale overrides
- [x] Tilføj normale driftsdage pr. lokation og undgå faste kontroller på lukkedage
- [x] Registrér Nabo Brejning med én lokation, tre køleenheder og to frysere
- [ ] Gennemgå og godkend startkataloget mod virksomhedens faktiske drift
- [ ] Gennemgå relevante myndighedskilder
- [ ] Udarbejd virksomhedens konkrete risikoanalyse
- [x] Opret arbejdsudkast til risikoanalyse for de seks startaktiviteter
- [ ] Gennemgå og godkend risikoanalyseudkastet med virksomhedens faktiske produkter og processer
- [ ] Identificér relevante risici
- [ ] Identificér mulige GAG- og CCP-områder med faglig bistand
- [ ] Fastlæg relevante kritiske grænser
- [ ] Fastlæg kontrolhyppigheder
- [ ] Fastlæg dokumentationshyppigheder separat
- [ ] Fastlæg afvigelsesreaktioner og korrigerende handlinger
- [x] Opret særskilt katalogudkast for gode arbejdsgange og tværgående procedurer
- [ ] Gennemgå og aktivér relevante arbejdsgange for Nabo Brejning
- [ ] Afklar sporbarhed og tilbagetrækning
- [ ] Afklar dokumentopbevaring, eksport og backupbehov
- [ ] Fastlæg roller og ansvar

**Acceptkriterier**

- [ ] Aktiviteter, risici, styringsforanstaltninger, procedurer og kontroller kan spores til hinanden
- [ ] Alle konkrete grænser og hyppigheder har en dokumenteret, fagligt godkendt kilde
- [ ] Åbne spørgsmål og ansvarlig for afklaring er registreret

## Fase 1 — designanalyse

- [x] Giv Codex read-only adgang til opskriftssitet
- [x] Justér lokal referenceprojektsti
- [x] Identificér globale styles og relevante kildefiler
- [x] Kortlæg farver, typografi og spacing
- [x] Kortlæg knapper og formularfelter
- [x] Kortlæg layouts, bredder og breakpoints
- [x] Kortlæg feedback, animation og printstil
- [x] Dokumentér resultater i `DESIGN_SYSTEM.md`
- [x] Opret en visuel prøve på dagens kontroller
- [x] Afprøv prøven i stående og liggende iPad-format

**Acceptkriterier**

- [ ] Alle designværdier kan spores til referenceprojektet eller en begrundet afvigelse
- [ ] Prøven kan betjenes uden hover og ligner produktfamilien frem for et generisk dashboard

## Fase 2 — teknisk fundament

- [x] Opret SvelteKit-projekt
- [x] Tilføj Vercel-adapter
- [x] Opsæt Tailwind CSS 4 med Vite-plugin
- [x] Konfigurér streng TypeScript
- [x] Opret Supabase-projekt
- [x] Anvend og verificér første Drizzle-migration
- [ ] Konfigurér og dokumentér miljøvariabler
- [x] Opsæt Drizzle
- [x] Opret migrationsstruktur og migrationspraksis
- [x] Opsæt Zod
- [x] Opsæt Supabase Auth-klient og loginflow
- [x] Beskyt interne routes server-side
- [x] Opret den ene administrative bruger og tilknyt actor
- [x] Tilføj virksomhedsspecifikke RLS-læsepolitikker og atomisk temperatur-RPC
- [x] Anvend korrigerende `authenticated`-grants og verificér RLS-læsning
- [x] Opsæt Vitest
- [x] Opsæt Playwright
- [ ] Opsæt preview-deployments
- [ ] Fastlæg basal sikkerheds- og logningspraksis

**Acceptkriterier**

- [ ] En tom, beskyttet applikation kan bygges, testes og deployes som preview
- [ ] Secrets eksponeres ikke til klienten eller repositoryet
- [ ] Test- og migrationskommandoer er dokumenteret og reproducerbare

## Fase 3 — første datamodel

- [x] Modellér virksomhed
- [x] Modellér lokation
- [ ] Modellér bruger og medlemskab (actor-tabel oprettet; Supabase Auth-relation og roller mangler)
- [x] Modellér kontroldefinition
- [ ] Modellér gentagelsesregel og begge hyppighedstyper
- [x] Modellér planlagt kontrol
- [x] Modellér begrundet afslutning uden måling
- [x] Modellér udført kontrol
- [x] Modellér måling
- [x] Modellér afvigelse
- [x] Modellér korrigerende handling
- [x] Modellér auditlog
- [x] Modellér versionering og rettelser på udførte kontroller

**Acceptkriterier**

- [x] Temperaturkontrollens komplette kontrolkæde kan gemmes og hentes uden at miste historik
- [ ] Rettelser og væsentlige ændringer kan spores til bruger og tidspunkt
- [ ] Isolation mellem virksomheder og lokationer er testet

## Fase 4 — MVP

- [x] Implementér login
- [ ] Implementér dagens kontroller
- [x] Implementér ugeoverblik for temperaturkontroller med synlige lukkedage
- [x] Implementér temperaturregistrering i UI og atomisk databasefunktion
- [x] Implementér `Ingen måling` med konfigurerbar grund og auditspor
- [x] Implementér atomisk `Ingen målinger i dag` for dagens resterende temperaturkontroller
- [ ] Implementér ja/nej-kontrol
- [ ] Implementér tjekliste
- [x] Implementér afvigelsesflow for temperaturkontroller
- [x] Implementér korrigerende handling for temperaturkontroller
- [ ] Implementér historik
- [x] Vis tydelig gemmebekræftelse for temperaturkontroller
- [x] Bevar temperaturinput og vis fejltilstand ved gemmeproblemer
- [ ] Test centrale flows på iPad-formater

**Acceptkriterier**

- [ ] En bruger kan gennemføre de prioriterede daglige kontroller med få trin
- [ ] Manglende kontroller og afvigelser er tydelige
- [ ] Data gemmes atomisk eller fejler synligt uden lydløst datatab
- [ ] Centrale flows har automatiserede enheds- og browsertests

## Fase 5 — planlægning og kalender

- [ ] Implementér opgavegenerator
- [x] Implementér deterministisk ugeprojektion for daglige, ugentlige og valgte ugedage
- [x] Materialisér temperaturforekomster i `scheduled_controls` uden dubletter
- [x] Lad faste lukkedage filtrere kalenderbaserede forekomster
- [ ] Implementér månedlige, interval- og årlige regler
- [ ] Implementér hændelsesbaserede kontroller
- [ ] Vis kommende kontroller
- [ ] Vis manglende kontroller
- [ ] Implementér kalendervisning
- [ ] Implementér filtrering
- [ ] Afklar kalenderbibliotek eller egen implementering

**Acceptkriterier**

- [ ] Gentagelsesregler genererer deterministiske forekomster uden dubletter
- [ ] Tidszone- og sommertidstilfælde er testet
- [ ] Kalenderen er en alternativ oversigt, ikke en forudsætning for daglige flows

## Fase 6 — dokumentation og tilsynsvisning

- [ ] Understøt risikoanalyse
- [ ] Understøt procedurer
- [ ] Vis revisionshistorik
- [ ] Implementér kontrolbesøgsvisning
- [ ] Implementér periodefiltrering
- [ ] Implementér åbent eksportformat
- [ ] Afklar og implementér PDF-generator
- [ ] Afklar og implementér backupudbyder og gendannelsestest

**Acceptkriterier**

- [ ] Historik kan vises og eksporteres forståeligt for en valgt periode
- [ ] Revisioner og rettelser er sporbare
- [ ] En dokumenteret gendannelsestest viser, at databasen ikke er eneste kopi

## Fase 7 — senere muligheder

- [ ] Offline-kø
- [ ] IndexedDB
- [ ] Konflikthåndtering og synkronisering
- [ ] Flere lokationer
- [ ] Udvidede roller og rettigheder
- [ ] Bilag og billeder
- [ ] Notifikationer
- [ ] Termometerkalibrering
- [ ] Dokumentarkiv

## Løbende

- [ ] Hold domæne-, data- og beslutningsdokumenter ajour
- [ ] Registrér nye kilder og gennemgangsdatoer
- [ ] Gennemgå sikkerhed, adgang og auditspor ved væsentlige ændringer
- [ ] Flyt afsluttede kortvarige opgaver ud af den aktive plan ved behov
