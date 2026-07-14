# Foreløbig datamodel

Dokumentet beskriver informationsbehov og relationer, ikke et endeligt Drizzle-schema. Felter, constraints og enums skal valideres mod virksomhedens risikoanalyse og konkrete arbejdsgange før implementering.

## Implementeringsstatus

Drizzle-schema og migrationer findes i `src/lib/server/db/schema.ts` og `drizzle/`. De virksomhedsspecifikke RLS- og grant-migrationer er anvendt på projektets delte Supabase-instans. De kobler `auth.uid()` til actorens virksomhed, giver afgrænsede læsepolitikker på tværs af kontrolkæden og eksponerer en atomisk RPC til temperaturregistrering. Følgende principper er implementeret i schema/migration:

- eksakt reference til kontroldefinition og revision,
- idempotency key for indsendelser,
- udført kontrol og måling som append-only dokumentation,
- selvstændig afvigelse med append-only hændelsesforløb,
- korrigerende handlinger og auditlog,
- bruger-id og tidspunkter med tidszone,
- database-triggers, der afviser `UPDATE` og `DELETE` på revisionsrelevante tabeller.

Auth-relationen, de første RLS-politikker, nødvendige læseprivilegier og seed af temperaturdefinitionerne er etableret. Den aktuelle temperatur-ugeplan materialiseres nu idempotent i `scheduled_controls` gennem en afgrænset RPC, og nye temperaturudførelser gemmer den konkrete schedule-reference. Fuld synkronisering af konfigurationskataloget og den endelige korrektionsmodel er endnu ikke afsluttet.

Temperaturflowet gemmer nu måling, afvigelse, en udført korrigerende handling, afvigelseshændelser og audit-events i samme databasetransaktion. En korrigerende handling dokumenterer, hvad brugeren faktisk gjorde; systemet foreskriver ikke handlingen. Afvigelsen forbliver et selvstændigt forløb og lukkes ikke automatisk af denne registrering.

## Entiteter og ansvar

| Entitet | Ansvar |
| --- | --- |
| `Company` | Ejer data og konfiguration. |
| `Location` | Afgrænser det fysiske driftssted og dets tidszone. |
| `User` / `Membership` | Identitet, virksomhedstilknytning og rolle. |
| `Activity` | Den konkrete aktivitet i risikoanalysen. |
| `Risk` / `RiskAssessment` | Risiko og dens versionerede faglige vurdering. |
| `ControlMeasure` | Styringsforanstaltning knyttet til en risiko. |
| `Procedure` / `ProcedureRevision` | Versioneret arbejdsbeskrivelse. |
| `ControlDefinition` / revision | Versioneret definition af input, grænser og hyppigheder. |
| `CriticalLimit` | Versioneret, fagligt fastlagt grænse, når relevant. |
| `ScheduledControl` | Konkret forekomst genereret fra definition og gentagelsesregel. |
| `ScheduledControlOmission` | Immutable begrundelse for, at en konkret planlagt kontrol blev afsluttet uden måling. |
| `CompletedControl` | Immutable registrering af den konkrete udførelse. |
| `Measurement` | Struktureret værdi, enhed og målekontekst. |
| `Deviation` | Selvstændigt afvigelsesforløb. |
| `CorrectiveAction` | En handling og eventuel opfølgning på afvigelsen. |
| `Document` / `DocumentRevision` | Versionerede risikoanalyser, procedurer og andre dokumenter. |
| `AuditEvent` | Append-only registrering af væsentlige handlinger og ændringer. |

## Centrale relationer

```text
Company 1 ── * Location
Company 1 ── * Membership * ── 1 User
Activity 1 ── * Risk ── * RiskAssessmentRevision
Risk * ── * ControlMeasure
ControlMeasure 1 ── * ProcedureRevision
ProcedureRevision 1 ── * ControlDefinitionRevision
ControlDefinitionRevision 1 ── * ScheduledControl
ScheduledControl 0..1 ── 1 CompletedControl ── * Measurement
ScheduledControl 0..1 ── 1 ScheduledControlOmission
CompletedControl 0..* ── * Deviation ── * CorrectiveAction
alle væsentlige entiteter ── * AuditEvent
```

Planlagte og udførte kontroller skal pege på den konkrete revision af definition/procedure, så senere ændringer ikke omskriver historikken.

## Pseudotyper

```ts
type ControlSchedule =
  | { kind: 'daily'; localTime?: string }
  | { kind: 'weekly'; weekday: Weekday; localTime?: string }
  | { kind: 'selected_weekdays'; weekdays: Weekday[]; localTime?: string }
  | { kind: 'monthly'; dayOfMonth: number; localTime?: string }
  | { kind: 'interval'; every: number; unit: 'day' | 'week' | 'month'; anchor: ZonedDateTime }
  | { kind: 'per_event'; eventType: string }
  | { kind: 'yearly'; month: number; day: number; localTime?: string };

type DocumentationFrequency =
  | { kind: 'every_control' }
  | { kind: 'selected_occurrences'; selectionRule: string }
  | { kind: 'weekly'; targetCount?: number }
  | { kind: 'monthly'; targetCount?: number }
  | { kind: 'deviations_only' };

type InputDefinition =
  | { kind: 'measurement'; unit: string; limits?: CriticalLimitRef[] }
  | { kind: 'yes_no'; expected?: boolean }
  | { kind: 'checklist'; items: ChecklistItem[] }
  | { kind: 'text'; required: boolean };
```

`selectionRule` er en pladsholder, ikke et færdigt regeludtryk. Reglen skal kunne forklares for brugeren og testes deterministisk.

## Statusforslag

| Entitet | Mulige statusværdier |
| --- | --- |
| Kontroldefinition | `draft`, `active`, `retired` |
| Planlagt kontrol | `upcoming`, `due`, `completed`, `missed`, `cancelled` |
| Udført kontrol | `submitted`, `corrected` (korrektion via ny revision) |
| Afvigelse | `open`, `assessing`, `action_required`, `resolved`, `closed` |
| Korrigerende handling | `planned`, `completed`, `verified`, `cancelled` |
| Dokument/revision | `draft`, `approved`, `superseded`, `withdrawn` |

Statusværdier er foreløbige. Særligt forskellen mellem `resolved` og `closed`, samt regler for `cancelled`, kræver domæneafklaring.

## Revisionsprincipper

- `CompletedControl`, `Measurement`, `Deviation`, `CorrectiveAction` og `AuditEvent` er revisionsrelevante.
- Indsendte registreringer ændres ikke in-place. En rettelse oprettes som en ny revision/korrektion med årsag og reference til den tidligere registrering.
- Soft delete kan bruges til konfiguration, der skal skjules, men må ikke skjule revisionsrelevant historik. `retiredAt` er ofte tydeligere end generisk `deletedAt`.
- Auditloggen er append-only og supplerer, men erstatter ikke, domænespecifik versionshistorik.
- Hver væsentlig hændelse gemmer aktør, server-tidspunkt, handling, entitet, correlation/request-id og relevant ændringsmetadata.
- Der bør være idempotency-nøgle på indsendelser for at undgå dubletter ved genforsøg.

## Tid og tidszoner

Gem hændelsestidspunkter som UTC-instanter og gem lokationens IANA-tidszone, fx `Europe/Copenhagen`. Gem også den lokale kontekst eller offset, når den har dokumentationsværdi. Gentagelsesregler beregnes i lokationens tidszone og skal testes ved sommertid. Skeln mellem planlagt tidsvindue, faktisk observationstid og serverens registreringstid.

Lokationens normale `operatingWeekdays` filtrerer kalenderbaserede gentagelsesregler. `daily` betyder hver driftsdag. En fast lukkedag opretter ingen `ScheduledControl`; det er derfor ikke det samme som status `cancelled` eller `missed`. Når forekomster senere materialiseres i databasen, må efterfølgende ændringer af driftsmønstret ikke omskrive dem.

### Materialisering af temperaturplanen

Den autentificerede ugevisning sender højst 100 deterministiske temperaturforekomster til `materialize_temperature_schedule`. Databasen validerer actor, virksomhed, lokation, definition, asset, dato, tidspunkt og occurrence key. `ON CONFLICT DO NOTHING` gør gentagne sideindlæsninger idempotente, og nye forekomster får et audit-event. Kun et rullende vindue fra syv dage før til fjorten dage efter lokationens lokale dato accepteres.

En ny temperaturudførelse skal pege på en forekomst for samme lokation, kontrol og lokale dato. En partiel unik indeks tillader kun én oprindelig udførelse pr. planlagt kontrol; senere rettelser skal fortsat bruge korrektionsrelationen. Gemning af udførelse, måling, eventuel afvigelse, handling, auditspor og statusændring til `completed` sker i samme transaktion.

En planlagt temperaturkontrol kan alternativt afsluttes som **Ingen måling**. `scheduled_control_omissions` gemmer den valgte årsags kode og et label-snapshot, eventuel bemærkning, aktør og servertid. Databasen tillader højst én sådan registrering pr. forekomst, afviser den hvis en måling allerede findes og ændrer atomisk forekomsten til `cancelled`. Tabellen og audit-eventet er append-only. Årsagslisten valideres server-side mod virksomhedskonfigurationen, så klienten ikke kan opfinde en årsag.

Handlingen **Ingen målinger i dag** henter alle stadig åbne temperaturforekomster for lokationens aktuelle lokale dato og sender deres UUID'er til én databasefunktion. Funktionen validerer dato, virksomhed, lokation og samtlige forekomster, låser dem i deterministisk rækkefølge og gemmer alle udeladelser i én transaktion med fælles correlation-id. Hvis blot én forekomst er ugyldig eller allerede målt, rulles hele handlingen tilbage. Allerede gemte målinger indgår ikke i serverens input og ændres aldrig.

Tidligere temperaturudførelser har fortsat `scheduled_control_id = null`. De backfilles ikke, fordi en automatisk efterkobling ikke kan dokumentere, hvilken planrevision der faktisk gjaldt. Migrationerne er fremadrettede og sletter eller omskriver ingen historiske records. Ved fejl skal execute-adgang til materialiserings-/completion-RPC’en kunne tilbagekaldes, hvorefter en ny korrigerende migration anvendes; den unikke indeks kan bevares uden at påvirke legacy-records.

## Versionshistorik

Risikoanalyser, procedurer, kritiske grænser og kontroldefinitioner versionsstyres med `validFrom`, eventuelt `validTo`, revisionsnummer, ændringsbegrundelse, forfatter og godkender. En aktiveret revision er låst; en ændring skaber en efterfølger. Historiske kontroller beholder reference til den revision, som gjaldt ved planlægning/udførelse.

## Mulige enums

```ts
type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
type InputKind = 'measurement' | 'yes_no' | 'checklist' | 'text';
type AuditAction = 'created' | 'submitted' | 'corrected' | 'status_changed' | 'approved' | 'retired' | 'exported';
type DeviationSource = 'completed_control' | 'event' | 'manual_observation';
```

Brug kun database-enums, hvis ændringsomkostningen er acceptabel; lookup/check constraints kan være mere fleksible.

## Eksempler

Eksemplerne har bevidst ingen konkrete temperaturgrænser eller bindende hyppigheder.

```ts
const refrigerationDefinition = {
  title: 'Temperatur på køl',
  locationId: 'loc_…',
  procedureRevisionId: 'proc_rev_…',
  input: { kind: 'measurement', unit: '°C', limits: ['limit_rev_…'] },
  controlSchedule: { kind: 'daily', localTime: '09:00' },
  documentationFrequency: { kind: 'every_control' },
  revision: 1,
  status: 'draft' // må først aktiveres efter faglig godkendelse
};

const scheduled = {
  definitionRevisionId: 'control_rev_…',
  locationId: 'loc_…',
  windowStartsAt: '2026-07-12T07:00:00Z',
  windowEndsAt: '2026-07-12T09:00:00Z',
  timeZone: 'Europe/Copenhagen',
  status: 'due',
  occurrenceKey: 'control_rev_…:2026-07-12'
};

const completed = {
  scheduledControlId: 'scheduled_…',
  observedAt: '2026-07-12T07:18:00Z',
  submittedAt: '2026-07-12T07:19:02Z',
  submittedBy: 'user_…',
  measurements: [{ value: 3.8, unit: '°C', instrumentRef: null }],
  definitionRevisionId: 'control_rev_…'
};

const deviationFlow = {
  deviation: {
    completedControlId: 'completed_…',
    observedValue: { value: 8.2, unit: '°C' },
    assessment: 'Afventer ansvarlig vurdering',
    status: 'action_required',
    createdBy: 'user_…'
  },
  correctiveActions: [{
    description: 'Handling dokumenteres her uden at systemet foreskriver den',
    performedAt: '2026-07-12T07:30:00Z',
    performedBy: 'user_…',
    status: 'completed'
  }]
};
```

## Åbne spørgsmål

- Skal planlagte kontroller materialiseres på forhånd eller genereres i et rullende vindue?
- Hvordan udvælges `selected_occurrences`, og hvem kan ændre reglen?
- Skal kritiske grænser være én værdi, interval eller betingede regler?
- Hvordan modelleres tjeklisteversioner og delvise svar?
- Hvilke roller og godkendelsesflows er nødvendige?
- Kan én udført kontrol dække flere planlagte kontroller eller lokationer?
- Hvilken rettelsesmodel giver den tydeligste tilsynsvisning?
- Hvilke data skal auditloggen indeholde uden at lagre unødige persondata eller secrets?
- Hvilke eksport-, opbevarings- og backupkrav fastlægges fagligt?
