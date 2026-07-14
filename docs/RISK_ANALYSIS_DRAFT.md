# Risikoanalyse — arbejdsudkast for Nabo Brejning

## Status og anvendelse

- **Status:** Udkast — kræver virksomhedens og eventuelt faglig rådgivers gennemgang
- **Virksomhed:** Nabo Brejning
- **Lokation:** Nabo Brejning (`brejning`)
- **Katalogversion:** `2026-07-12.1`
- **Udarbejdet:** 2026-07-12

Dokumentet er et struktureret udgangspunkt, ikke en godkendt risikoanalyse. Det antager foreløbigt, at alle seks startaktiviteter udføres. Fjern, deaktivér eller udvid områderne, så analysen dækker den faktiske drift fra varemodtagelse til salg.

Fødevarestyrelsens materiale beskriver risikoanalysen som en sammenhæng mellem virksomhedens aktiviteter, risici og styringsmuligheder. Den endelige analyse skal vurdere mikrobiologiske, kemiske og fysiske risici og identificere eventuelle kritiske kontrolpunkter. Se `SOURCES.md`.

## Vurderingsstatus

| Status | Betydning |
| --- | --- |
| `Skal bekræftes` | Det skal afklares, om aktiviteten udføres som antaget. |
| `Skal risikovurderes` | Risiko og styring er foreslået, men sandsynlighed/alvor og klassifikation mangler. |
| `Skal godkendes` | Grænse, hyppighed eller handling er et kildebaseret startforslag. |
| `Godkendt` | Må først bruges efter dokumenteret virksomhedsgodkendelse. |

Ingen af områderne er endnu `Godkendt`.

## Samlet procesflow

```text
Varemodtagelse
→ køle- eller frostopbevaring
→ eventuel opvarmning
→ eventuel varmholdelse eller nedkøling
→ senere servering/salg
```

Det faktiske flow skal suppleres med fx klargøring, optøning, adskillelse, allergenhåndtering, salg uden temperaturstyring, rengøring og sporbarhed, hvis de indgår i driften.

## RA-001 — varemodtagelse

| Felt | Arbejdsudkast |
| --- | --- |
| Aktivitet | Modtagelse af køle-, frost- og øvrige varer |
| Status | Skal bekræftes og risikovurderes |
| Mulige mikrobiologiske risici | Vækst eller overlevelse af sygdomsfremkaldende mikroorganismer ved brudt temperaturkæde; modtagelse af uegnede eller beskadigede varer |
| Mulige kemiske risici | Mangelfuld eller forkert mærkning, herunder oplysninger med betydning for allergenhåndtering |
| Mulige fysiske risici | Fremmedlegemer eller kontaminering som følge af beskadiget emballage |
| Styringsforanstaltning | Kontrollér relevant temperaturprofil, emballage, mærkning/dato og leverandør før anvendelse |
| Procedureudkast | Varer kontrolleres ved levering og opbevares hensigtsmæssigt, indtil kontrollen er afsluttet. Temperatur måles, når produkt/profil kræver det. |
| Kontroldefinition | `receiving-check` |
| Kontrolhyppighed | Hver levering — skal godkendes |
| Dokumentationshyppighed | Forslag: én normal registrering ugentligt; alle afvigelser — skal godkendes |
| Kritiske grænser | Valgt produktprofil; ikke én universel temperatur |
| Afvigelse | Temperatur uden for profil, beskadiget emballage eller uacceptabel mærkning/dato |
| Mulige handlinger | Afvis/returnér, kontakt leverandør, kassér eller foretag og dokumentér en faglig vurdering |
| Foreløbig klassifikation | Skal vurderes som GAG, CCP eller anden styring for de konkrete varegrupper |
| Kilder | `fvst-receiving`, `fvst-written-controls`, `fvst-cold-storage` |

### Skal afklares

- Hvilke leverandører og varegrupper forventes?
- Hvilke varer kræver temperaturmåling, og hvilken profil gælder for hver?
- Foregår levering på tidspunkter, hvor modtagekontrol kan udføres med det samme?
- Hvordan identificeres leverance/batch med henblik på sporbarhed?

## RA-002 — køleopbevaring

| Felt | Arbejdsudkast |
| --- | --- |
| Aktivitet | Opbevaring i Køleskab 1, Køleskab 2 og Kølebord 1 |
| Status | Skal bekræftes og risikovurderes |
| Mulig mikrobiologisk risiko | Vækst af sygdomsfremkaldende mikroorganismer ved for høj produkttemperatur eller længere temperaturbelastning |
| Styringsforanstaltning | Overvåg enhed/produkt med relevant temperaturprofil; placér eller anvend måleudstyr, så målingen er retvisende |
| Procedureudkast | Aflæs enheden og foretag produktmåling ved tvivl eller afvigelse. Registrér enhed, profil, temperatur, tidspunkt og bruger. |
| Kontroldefinition | `refrigeration-temperature` |
| Kontrolhyppighed | Forslag: dagligt kl. 09.00 — skal godkendes |
| Dokumentationshyppighed | Forslag: hver kontrol — skal godkendes |
| Kritisk grænse | Foreløbig profil `chilled-general-draft` (maks. 5 °C); produkter kan kræve andre grænser |
| Afvigelse | Temperatur over den godkendte profil eller usikker/ikke-retvisende måling |
| Mulige handlinger | Kontrolmåling, flyt varer, vurdér temperaturbelastning, service eller kassation efter dokumenteret vurdering |
| Foreløbig klassifikation | Temperaturkontrol er en mulig CCP-kandidat; endelig klassifikation afhænger af produkter og proces |
| Kilder | `fvst-cold-storage`, `fvst-written-controls` |

### Skal afklares

- Hvilke produkter opbevares i hver enhed?
- Er der varer med strengere temperaturkrav end startprofilen?
- Har kølebordet flere selvstændige temperaturzoner?
- Hvor sidder termometrene, og findes et separat indstikstermometer?
- Er kl. 09.00 repræsentativt og praktisk på alle driftsdage?

## RA-003 — frostopbevaring

| Felt | Arbejdsudkast |
| --- | --- |
| Aktivitet | Opbevaring i Fryser 1 og Fryser 2 |
| Status | Skal bekræftes og risikovurderes |
| Mulig risiko | Temperaturafvigelse, optøning/genfrysning eller forhold, der gør varen uegnet eller strider mod produktets opbevaringskrav |
| Styringsforanstaltning | Overvåg begge enheder og reagér på temperaturstigning eller tegn på optøning |
| Procedureudkast | Aflæs enhed, registrér måling og foretag konkret varevurdering ved afvigelse. |
| Kontroldefinition | `freezer-temperature` |
| Kontrolhyppighed | Forslag: dagligt kl. 09.00 — skal godkendes |
| Dokumentationshyppighed | Forslag: hver kontrol — skal godkendes |
| Kritisk grænse | Foreløbig profil `deep-frozen-draft` (maks. −18 °C); kontrollér produktkrav og eventuelle tolerancer |
| Afvigelse | Temperatur over godkendt profil eller tegn på utilsigtet optøning |
| Mulige handlinger | Kontrolmåling, flyt varer, dokumentér konkret vurdering, service eller kassation |
| Foreløbig klassifikation | Skal vurderes; fødevaresikkerhed og kvalitet må adskilles i den endelige vurdering |
| Kilder | `fvst-written-controls` samt relevante produktspecifikke kilder, der mangler |

### Skal afklares

- Hvilke produktkategorier opbevares i hver fryser?
- Er enhederne lagerfrysere, kummefrysere eller andet?
- Findes automatisk alarm eller temperaturregistrering?
- Hvad er proceduren ved strømsvigt?

## RA-004 — opvarmning og genopvarmning

| Felt | Arbejdsudkast |
| --- | --- |
| Aktivitet | Varmebehandling af retter eller komponenter |
| Status | Skal bekræftes og risikovurderes |
| Mulig mikrobiologisk risiko | Overlevelse af sygdomsfremkaldende mikroorganismer ved utilstrækkelig varmebehandling |
| Styringsforanstaltning | Anvend en godkendt tid-/temperaturproces og mål repræsentativ kernetemperatur |
| Procedureudkast | Identificér produkt/batch, mål i relevant kernested med egnet termometer, og registrér resultatet. |
| Kontroldefinition | `heating-core-temperature` |
| Kontrolhyppighed | Forslag: hver batch — skal godkendes |
| Dokumentationshyppighed | Nabo-udkast: én relevant hændelse ugentligt eller `Ikke relevant i denne uge`; alle afvigelser — skal godkendes |
| Kritisk grænse | Startforslag: mindst 75 °C; undtagelser og alternative processer kræver konkret, dokumenteret grundlag |
| Afvigelse | Godkendt tid-/temperaturproces er ikke opnået eller kan ikke dokumenteres |
| Mulige handlinger | Fortsæt varmebehandling og mål igen, anvend godkendt alternativ proces eller kassér |
| Foreløbig klassifikation | Sandsynlig CCP-kandidat, hvis aktiviteten udføres; skal fastlægges i den konkrete analyse |
| Kilder | `fvst-written-controls`, `fvst-heat-treatment` |

### Skal afklares

- Hvilke produkter og tilberedningsmetoder anvendes?
- Er der produkter, som ikke skal følge 75 °C-eksemplet?
- Hvordan defineres en batch i den daglige drift?
- Hvilket termometer anvendes, og hvordan kontrolleres dets funktion?

## RA-005 — nedkøling

| Felt | Arbejdsudkast |
| --- | --- |
| Aktivitet | Nedkøling af varmebehandlede fødevarer til senere brug/salg |
| Status | Skal bekræftes og risikovurderes |
| Mulig mikrobiologisk risiko | Vækst af sygdomsfremkaldende bakterier og eventuel toksindannelse ved langsom eller forsinket nedkøling |
| Styringsforanstaltning | Anvend en godkendt nedkølingsprocedure og dokumentér tid og temperatur |
| Procedureudkast | Identificér ret og batchdato, mål start, anvend egnede beholdere/udstyr, mål slut og registrér begge tidspunkter. |
| Kontroldefinition | `cooling-time-temperature` |
| Kontrolhyppighed | Forslag: hver nedkølingsbatch — skal godkendes |
| Dokumentationshyppighed | Nabo-udkast: én relevant hændelse ugentligt eller `Ikke relevant i denne uge`; alle afvigelser — skal godkendes |
| Kritisk grænse | Startforslag: fra 56 °C til højst 10 °C inden for fire timer; alternativ kombination kræver dokumentation for tilsvarende sikkerhed |
| Afvigelse | Den godkendte nedkølingskurve er ikke opfyldt eller måling mangler |
| Mulige handlinger | Intensivér nedkøling og mål igen efter faglig vurdering, opdel produktet, vurdér sikkerhed eller kassér |
| Foreløbig klassifikation | Sandsynlig CCP-kandidat, hvis aktiviteten udføres; skal fastlægges i den konkrete analyse |
| Kilder | `fvst-cooling`, `fvst-written-controls` |

### Skal afklares

- Hvilke produkter og batchstørrelser nedkøles?
- Hvilke beholdere, køleenheder og metoder anvendes?
- Hvornår begynder og slutter den praktiske måling?
- Er der validerede alternative tid-/temperaturkombinationer?

## RA-006 — varmholdelse

| Felt | Arbejdsudkast |
| --- | --- |
| Aktivitet | Varmholdelse af retter eller komponenter før servering/salg |
| Status | Skal bekræftes og risikovurderes |
| Mulig mikrobiologisk risiko | Vækst af sygdomsfremkaldende mikroorganismer ved for lav varmholdningstemperatur |
| Styringsforanstaltning | Hold fødevaren ved godkendt temperatur og foretag repræsentativ måling |
| Procedureudkast | Identificér produkt/batch og varmholdningsenhed, mål produktet og registrér tidspunkt og resultat. |
| Kontroldefinition | `hot-holding-temperature` |
| Kontrolhyppighed | Forslag: hver varmholdningsservice — begrebet og hyppigheden skal præciseres |
| Dokumentationshyppighed | Nabo-udkast: én relevant hændelse ugentligt eller `Ikke relevant i denne uge`; alle afvigelser — skal godkendes |
| Kritisk grænse | Startforslag: mindst 56 °C |
| Afvigelse | Måling under godkendt minimum eller manglende sikker viden om forløbet |
| Mulige handlinger | Genopvarm efter godkendt procedure, foretag dokumenteret vurdering eller kassér |
| Foreløbig klassifikation | Sandsynlig CCP-kandidat, hvis aktiviteten udføres; skal fastlægges i den konkrete analyse |
| Kilder | `fvst-heat-treatment` |

### Skal afklares

- Hvilke produkter varmholdes og i hvilket udstyr?
- Hvad betyder én `hot_holding_service` i praksis?
- Hvornår i forløbet måles der, og er én måling tilstrækkelig?
- Hvordan håndteres overgang mellem opvarmning, varmholdelse og servering?

## Tværgående gode arbejdsgange, der mangler

Følgende områder er ikke dækket af de seks temperaturkontroller og skal vurderes særskilt:

- rengøring og desinfektion,
- personlig hygiejne og håndvask,
- allergener og information til kunder,
- adskillelse af rå og spiseklare fødevarer,
- optøning og klargøring,
- vedligeholdelse af lokaler og udstyr,
- skadedyrssikring,
- affaldshåndtering,
- sporbarhed og tilbagetrækning,
- modtagelse og opbevaring af ikke-kølekrævende varer,
- salg/servering uden for køl,
- termometerkontrol eller kalibrering,
- revision ved ændringer og mindst den hyppighed, virksomheden fastlægger.

Områderne skal ikke alle nødvendigvis have en planlagt digital kontrol. Den konkrete risikoanalyse afgør, om de styres gennem gode arbejdsgange, procedurer, kontrolpunkter eller kritiske kontrolpunkter, og hvad der skal dokumenteres.

## Næste godkendelsesrunde

1. Bekræft eller deaktivér hver af de seks aktiviteter.
2. Beskriv de faktiske produkter og procesflows.
3. Vurdér sandsynlighed og alvor for hver relevant risiko.
4. Klassificér styringen som GAG, CCP eller anden relevant kontrol med fagligt grundlag.
5. Godkend grænser, kontrolhyppighed og dokumentationshyppighed separat.
6. Tilpas de korrigerende handlinger til driftens reelle muligheder.
7. Tilføj manglende gode arbejdsgange og sporbarhedsflow.
8. Registrér godkender, dato og en ny revision; ændr først derefter konfigurationsstatus.
