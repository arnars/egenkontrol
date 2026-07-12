# Roadmap

Roadmapet er projektets levende opgaveliste. Faglige punkter skal valideres og må ikke forstås som forhåndsfastsatte myndighedskrav.

## Projektforvaltning

- [x] Initialisér lokalt Git-repository
- [x] Tilføj `.gitignore` for secrets, dependencies og genererede filer
- [x] Opret første commit med dokumentationsgrundlaget
- [x] Opret offentligt GitHub-repository med navnet `egenkontrol`
- [x] Tilføj GitHub-repositoryet som `origin` og push `main`

## Fase 0 — domæneafklaring

- [ ] Kortlæg virksomhedens aktiviteter og lokationer
- [x] Opret udvideligt startkatalog med foreslåede aktiviteter og kontroller
- [x] Adskil kontrolhyppighed og dokumentationshyppighed i konfigurationen
- [ ] Gennemgå og godkend startkataloget mod virksomhedens faktiske drift
- [ ] Gennemgå relevante myndighedskilder
- [ ] Udarbejd virksomhedens konkrete risikoanalyse
- [ ] Identificér relevante risici
- [ ] Identificér mulige GAG- og CCP-områder med faglig bistand
- [ ] Fastlæg relevante kritiske grænser
- [ ] Fastlæg kontrolhyppigheder
- [ ] Fastlæg dokumentationshyppigheder separat
- [ ] Fastlæg afvigelsesreaktioner og korrigerende handlinger
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
- [ ] Opret senere en visuel prøve på dagens kontroller
- [ ] Afprøv prøven i stående og liggende iPad-format

**Acceptkriterier**

- [ ] Alle designværdier kan spores til referenceprojektet eller en begrundet afvigelse
- [ ] Prøven kan betjenes uden hover og ligner produktfamilien frem for et generisk dashboard

## Fase 2 — teknisk fundament

- [ ] Opret SvelteKit-projekt
- [ ] Tilføj Vercel-adapter
- [ ] Konfigurér streng TypeScript
- [ ] Opret Supabase-projekt
- [ ] Konfigurér og dokumentér miljøvariabler
- [ ] Opsæt Drizzle
- [ ] Opret migrationsstruktur og migrationspraksis
- [ ] Opsæt Zod
- [ ] Opsæt Supabase Auth
- [ ] Beskyt interne routes server-side
- [ ] Opsæt Vitest
- [ ] Opsæt Playwright
- [ ] Opsæt preview-deployments
- [ ] Fastlæg basal sikkerheds- og logningspraksis

**Acceptkriterier**

- [ ] En tom, beskyttet applikation kan bygges, testes og deployes som preview
- [ ] Secrets eksponeres ikke til klienten eller repositoryet
- [ ] Test- og migrationskommandoer er dokumenteret og reproducerbare

## Fase 3 — første datamodel

- [ ] Modellér virksomhed
- [ ] Modellér lokation
- [ ] Modellér bruger og medlemskab
- [ ] Modellér kontroldefinition
- [ ] Modellér gentagelsesregel og begge hyppighedstyper
- [ ] Modellér planlagt kontrol
- [ ] Modellér udført kontrol
- [ ] Modellér måling
- [ ] Modellér afvigelse
- [ ] Modellér korrigerende handling
- [ ] Modellér auditlog
- [ ] Modellér versionering og rettelser

**Acceptkriterier**

- [ ] En komplet kontrolkæde kan gemmes og hentes uden at miste historik
- [ ] Rettelser og væsentlige ændringer kan spores til bruger og tidspunkt
- [ ] Isolation mellem virksomheder og lokationer er testet

## Fase 4 — MVP

- [ ] Implementér login
- [ ] Implementér dagens kontroller
- [ ] Implementér ugens kontroller
- [ ] Implementér temperaturregistrering
- [ ] Implementér ja/nej-kontrol
- [ ] Implementér tjekliste
- [ ] Implementér afvigelsesflow
- [ ] Implementér korrigerende handling
- [ ] Implementér historik
- [ ] Vis tydelig gemmebekræftelse
- [ ] Bevar input og vis fejltilstand ved netværksproblemer, hvor praktisk muligt
- [ ] Test centrale flows på iPad-formater

**Acceptkriterier**

- [ ] En bruger kan gennemføre de prioriterede daglige kontroller med få trin
- [ ] Manglende kontroller og afvigelser er tydelige
- [ ] Data gemmes atomisk eller fejler synligt uden lydløst datatab
- [ ] Centrale flows har automatiserede enheds- og browsertests

## Fase 5 — planlægning og kalender

- [ ] Implementér opgavegenerator
- [ ] Implementér daglige, ugentlige og valgte ugedage
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
