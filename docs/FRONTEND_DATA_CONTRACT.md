# Frontend-datakontrakt

## Formål

Dette dokument er den autoritative kontrakt mellem egenkontrolsystemets frontend og det senere persistenslag. I den frontend-fokuserede iterationsfase udvikles visninger og arbejdsgange mod denne kontrakt og realistiske fixtures. Supabase-schema, RPC'er og migrationer tilpasses samlet ved et senere integrationscheckpoint.

Kontrakten fastlægger produktets informationsbehov og brugerhandlinger. Den fastlægger ikke juridiske krav, temperaturgrænser eller kontrolhyppigheder; sådanne værdier skal fortsat komme fra virksomhedens godkendte konfiguration og faglige vurdering.

## Arbejdsprincip

1. En UI-ændring beskrives først som en brugerhandling eller visningstilstand.
2. Kontrakten ændres kun, hvis UI'et faktisk har brug for nye data eller en ny kommando.
3. Hver kontraktændring får mindst én realistisk fixture og en fejltilstand.
4. Frontenden implementeres og testes mod fixtures uden databaseændringer.
5. Databasetilpasning samles i et integrationscheckpoint med mapping, migrationer, RLS, atomiske funktioner og integrationstests.

Rene ændringer af layout, tekst, interaktionsrækkefølge og komponenter kræver normalt ingen kontraktændring.

## Read model til kontrolfladen

Frontenden modtager én samlet, serialiserbar `ControlWorkspace`. Feltnavne er frontendens domænesprog og må ikke afhænge af tabel- eller kolonnenavne.

```ts
type ControlWorkspace = {
  context: {
    companyId: string;
    companyName: string;
    locationId: string;
    locationName: string;
    localDate: string; // YYYY-MM-DD i lokationens tidszone
    timeZone: string; // IANA-navn, fx Europe/Copenhagen
    configurationStatus: 'draft' | 'approved';
  };
  today: ControlDay;
  week: ControlDay[];
  noMeasurementReasons: NoMeasurementReason[];
  eventControls: EventControlLauncher[];
};

type ControlDay = {
  localDate: string;
  isOperatingDay: boolean;
  controls: ControlOccurrence[];
};

type ControlOccurrence = {
  id: string; // stabilt id for den konkrete forekomst
  definitionId: string;
  definitionRevision: number;
  title: string;
  subtitle?: string;
  dueTime?: string; // HH:mm lokal tid
  status: 'upcoming' | 'pending' | 'completed' | 'no_measurement' | 'missed';
  input: ControlInput;
  outcome?: ControlOutcome;
};

type ControlInput =
  | {
      kind: 'temperature';
      unit: 'celsius';
      profileLabel: string;
      limit?: { operator: 'lte' | 'gte'; value: number };
      profileStatus: 'approved' | 'requires_review';
    }
  | { kind: 'yes_no'; expected?: boolean }
  | { kind: 'checklist'; items: Array<{ id: string; label: string; required: boolean }> }
  | { kind: 'text'; required: boolean };

type ControlOutcome =
  | {
      kind: 'temperature';
      value: number;
      unit: 'celsius';
      deviation: boolean;
      correctiveAction?: string;
      recordedAt: string;
    }
  | {
      kind: 'no_measurement';
      reasonCode: string;
      reasonLabel: string; // snapshot af label ved registrering
      note?: string;
      recordedAt: string;
    }
  | { kind: 'yes_no'; value: boolean; recordedAt: string }
  | {
      kind: 'checklist';
      answers: Array<{ itemId: string; checked: boolean }>;
      recordedAt: string;
    };

type NoMeasurementReason = {
  code: string;
  label: string;
  requiresNote: boolean;
};

type EventControlLauncher = {
  definitionId: string;
  title: string;
  description: string;
  eventType: string;
};
```

`ControlOccurrence.status` er en præsenteret status til UI'et. Persistenslaget kan have flere interne statusværdier, men de må ikke sive ind i komponenterne uden et konkret produktbehov.

## Read model til kontrolhistorik

Historikvisningen bruger et afgrænset datointerval og en samlet, kronologisk liste på tværs af gennemførte målinger og **Ingen måling**. Datoer fortolkes i lokationens tidszone. Frontenden skal senere kunne få resultatet sideinddelt uden at kende persistenslagets tabeller.

```ts
type ControlHistory = {
  from: string; // YYYY-MM-DD, inklusive
  to: string; // YYYY-MM-DD, inklusive
  type: 'all' | 'control' | 'receiving' | 'pest';
  timeZone: string;
  totalCount: number;
  entries: ControlHistoryEntry[];
  nextCursor?: string;
};

type ControlHistoryEntry = {
  id: string;
  occurrenceId?: string;
  definitionId?: string;
  title: string;
  localDate: string;
  recordedAt: string;
  outcome:
    | {
        kind: 'temperature';
        value: number;
        unit: 'celsius';
        deviation: boolean;
        deviationDescription?: string;
        correctiveAction?: string;
      }
    | {
        kind: 'no_measurement';
        reasonLabel: string;
        note?: string;
      }
    | {
        kind: 'receiving_deviation';
        supplier: string;
        deliveryReference: string;
        issueLabel: string;
        actionLabel: string;
        assessment: string;
      }
    | {
        kind: 'pest_incident';
        areaLabel: string;
        incidentLabel: string;
        observation: string;
        productImpact: 'yes' | 'no' | 'unknown';
        actions: string[];
      };
};
```

Den aktuelle historikside læser de allerede integrerede temperatur- og udeladelsesdata read-only. Typefilteret og genveje fra varemodtagelse og skadedyr er etableret, men de to hændelsestyper viser en tydelig ikke-tilsluttet tilstand, indtil deres persistens implementeres. En endelig adapter, cursor-baseret sideinddeling og revisionsspor for senere rettelser etableres ved integrationscheckpointet; de kræver ikke ændringer i den nuværende frontendnavigation.

## Kommandoer fra frontenden

Alle kommandoer indeholder et klientgenereret `requestId`, så et senere persistenslag kan gøre gentagne indsendelser idempotente.

```ts
type RecordTemperatureCommand = {
  kind: 'record_temperature';
  requestId: string;
  occurrenceId: string;
  value: number;
  observedAt: string;
  deviation?: {
    description: string;
    correctiveAction: string;
  };
};

type RecordNoMeasurementCommand = {
  kind: 'record_no_measurement';
  requestId: string;
  occurrenceId: string;
  reasonCode: string;
  note?: string;
};

type RecordNoMeasurementsTodayCommand = {
  kind: 'record_no_measurements_today';
  requestId: string;
  localDate: string;
  occurrenceIds: string[];
  reasonCode: string;
  note?: string;
};

type StartEventControlCommand = {
  kind: 'start_event_control';
  requestId: string;
  definitionId: string;
  eventType: string;
  startedAt: string;
};

type ControlCommand =
  | RecordTemperatureCommand
  | RecordNoMeasurementCommand
  | RecordNoMeasurementsTodayCommand
  | StartEventControlCommand;
```

Kommandoerne for ja/nej, tjekliste, opvarmning, nedkøling og varmholdelse tilføjes, når deres konkrete frontend-flow designes. Der opfindes ikke databasefelter på forhånd.

## Arbejdsgange og hændelser

Rengøringsplanen er et versioneret, statisk dokument. Skadedyr og varemodtagelse følger et hændelsesprincip: den normale arbejdsgang læses uden registrering, mens fund, mistanke og leveringsfejl opretter en revisionsrelevant hændelse. De aktuelle formularer er frontendprototyper og gemmer endnu ikke data.

```ts
type PestArea = {
  id: string;
  label: string;
  prevention: string[];
  incidentActions: string[];
};

type RecordPestIncidentCommand = {
  kind: 'record_pest_incident';
  requestId: string;
  areaId: string;
  incidentType: string;
  observation: string;
  productImpact: 'yes' | 'no' | 'unknown';
  actions: string[];
  observedAt: string;
};

type RecordReceivingDeviationCommand = {
  kind: 'record_receiving_deviation';
  requestId: string;
  supplier: string;
  deliveryReference: string;
  issueType: 'temperature' | 'packaging' | 'date' | 'label' | 'supplier' | 'other';
  measuredTemperature?: number;
  actionId: string;
  assessment: string;
  observedAt: string;
};
```

En normal modtagelse danner ikke automatisk en digital registrering. Hvis den godkendte risikoanalyse og procedure senere fastlægger en normal dokumentationshyppighed, tilføjes en særskilt kommando uden at ændre afvigelseskommandoen. Ved persistens skal begge hændelsestyper gemme konfigurationsrevision, bruger, servertid og eventuelle senere rettelser append-only.

## Resultat og fejltilstande

Frontend-adapteren returnerer samme resultatstruktur i fixture- og databasetilstand.

```ts
type CommandResult =
  | {
      ok: true;
      requestId: string;
      affectedOccurrenceIds: string[];
      savedAt: string;
  }
  | {
      ok: false;
      requestId: string;
      error:
        | { kind: 'validation'; message: string; field?: string }
        | { kind: 'conflict'; message: string; current?: ControlOccurrence }
        | { kind: 'network'; message: string; retryable: true }
        | { kind: 'unauthorized'; message: string }
        | { kind: 'unexpected'; message: string };
    };
```

UI'et skal kunne demonstreres med mindst følgende tilstande:

- tom dag uden planlagte kontroller,
- alle kontroller mangler,
- blanding af målt, ingen måling og manglende,
- temperatur der kræver afvigelse og korrigerende handling,
- samlet **Ingen målinger i dag**,
- valideringsfejl,
- langsom gemning,
- netværksfejl med bevarede formularfelter,
- konflikt fordi en forekomst allerede er afsluttet,
- udløbet session.

## Ufravigelige persistenskrav

Fixtures må gerne simulere adfærd, men må ikke ændre disse krav til den senere databaseintegration:

- En afsluttet forekomst må ikke overskrives eller slettes lydløst.
- Rettelser skal oprette et spor frem for at omskrive historik.
- Måling og **Ingen måling** er gensidigt udelukkende oprindelige udfald.
- Afvigelse, korrigerende handling og relevant auditspor gemmes atomisk med udfaldet.
- **Ingen målinger i dag** er én atomisk kommando for de valgte resterende forekomster.
- Aktør, servertid, lokation, definition og revision skal kunne dokumenteres.
- Adgangskontrol og virksomhedsisolation håndhæves server-side.
- Klientens `requestId` skal understøtte sikkert genforsøg uden dubletter.

## Adaptergrænse

Svelte-komponenter må ikke kende Supabase-tabeller, RPC-navne eller snake_case-felter. De skal arbejde gennem en adapter med følgende ansvar:

```ts
interface ControlWorkspaceAdapter {
  loadWorkspace(): Promise<ControlWorkspace>;
  execute(command: ControlCommand): Promise<CommandResult>;
}
```

Der oprettes to implementeringer:

- `FixtureControlWorkspaceAdapter` til design og frontend-tests.
- `SupabaseControlWorkspaceAdapter` ved integrationscheckpointet.

Den nuværende `+page.server.ts` er en fungerende prototype, men endnu ikke den endelige adaptergrænse. Den refaktoreres først, når fixture-adapteren etableres; det kræver ingen databaseændring.

## Integrationscheckpoint

Databasearbejdet genoptages samlet, når disse betingelser er opfyldt:

1. Dagens prioriterede kontrolflows er afprøvet på iPad-format.
2. Read model, kommandoer og fejltilstande har været stabile gennem mindst én samlet designgennemgang.
3. Fixtures dækker normale forløb, afvigelser og fejl.
4. Åbne domænevalg, der påvirker dataintegritet, er markeret og afklaret eller eksplicit udsat.

Checkpointet skal levere en mapping fra frontend-kontrakten til datamodellen, gennemgåelige fremadrettede migrationer, RLS/RPC-ændringer, integrationstests og en plan for eksisterende prototype-data.
