# Konfiguration af aktiviteter og kontroller

## Formål

`config/egenkontrol.defaults.json` er et versioneret startkatalog. Det er ikke en godkendt risikoanalyse. Alle poster starter som udkast og skal tilpasses virksomhedens faktiske aktiviteter, produkter og procedurer før aktivering.

`config/egenkontrol.schema.json` beskriver den maskinlæsbare struktur. Når applikationen senere oprettes, skal JSON Schema suppleres med Zod-validering og krydsreferencetjek.

Virksomhedens egne valg ligger separat i `config/virksomhed.example.json`, valideret af `config/virksomhed.schema.json`. Kopiér senere eksemplet til en virksomhedsfil og redigér den frem for at ændre startkataloget direkte. Det gør det muligt at opdatere kataloget og sammenligne versioner uden at overskrive lokale valg.

## To konfigurationslag

| Lag | Indeholder | Ændringsprincip |
| --- | --- | --- |
| Startkatalog | Generelle aktiviteter, kontroller, felter, kilder og foreslåede standarder | Versionsstyres som produktets udgangspunkt |
| Virksomhedskonfiguration | Virksomhed, lokationer, udstyr, aktive aktiviteter og lokale overrides | Godkendes og revideres af virksomheden |

`basedOnCatalogVersion` viser, hvilken katalogversion virksomhedskonfigurationen er gennemgået imod. En katalogopdatering må ikke automatisk ændre en allerede godkendt virksomhedsopsætning.

## Sane defaults

Startkataloget indeholder:

- varemodtagelse,
- temperatur på køl,
- temperatur på frost,
- opvarmning,
- nedkøling,
- varmholdelse.

Grænserne er hentet som dokumenterede startforslag fra de officielle kilder, men er ikke universelle. Eksempelvis afhænger kølekrav af produktkategori, mærkning, holdbarhed og salgsform, og varmebehandling kan i visse validerede processer bruge andre tid-/temperaturkombinationer.

Hyppighederne er operationelle startforslag, ikke påståede myndighedskrav:

| Kontrol | Kontrolhyppighed | Dokumentationshyppighed |
| --- | --- | --- |
| Varemodtagelse | Hver leverance | Én normal registrering ugentligt; alle afvigelser |
| Køl | Dagligt kl. 09:00 | Hver kontrol |
| Frost | Dagligt kl. 09:00 | Hver kontrol |
| Opvarmning | Hver batch | Første batch pr. driftsdag; alle afvigelser |
| Nedkøling | Hver batch | Hver kontrol |
| Varmholdelse | Hver varmholdningsservice | Hver kontrol |

Tidspunkt, udvælgelsesregel og frekvenser skal vurderes i virksomhedens risikoanalyse.

## Sådan tilføjes et område

1. Tilføj en post i `activities` med et stabilt kebab-case `id`.
2. Tilføj en eller flere poster i `controls`.
3. Knyt kontrol-id'erne til aktivitetens `controlIds` og aktivitetens id til kontrollens `activityId`.
4. Angiv kontrol- og dokumentationshyppighed separat.
5. Definér felter, afvigelsestriggers og mulige korrigerende handlinger.
6. Registrér kilder i `sourceRegistry` og referér dem med `sourceRefs`.
7. Behold status som `draft_requires_approval`, indtil virksomheden har godkendt revisionen.
8. Hæv `catalogVersion`; ved strukturelle brud hæves også `schemaVersion`.

Eksempel på et nyt område:

```json
{
  "id": "cleaning",
  "label": "Rengøring",
  "enabled": false,
  "sortOrder": 70,
  "riskCategories": ["microbiological", "chemical", "physical"],
  "controlIds": ["closing-cleaning-check"]
}
```

En tilhørende kontrol skal stadig have procedure, frekvenser, felter, afvigelsestrigger, handlinger og kilder. `enabled: false` kan bruges, mens området afklares.

## Regler for redigering

- Genbrug aldrig et `id` til en anden betydning.
- Ændr ikke historiske kontrolregistreringer ved at ændre konfigurationen.
- Hæv kontrollens `revision`, når indhold, grænse, procedure eller hyppighed ændres.
- Planlagte og udførte kontroller skal senere gemme reference til den konkrete revision.
- Afvigelser skal altid kunne dokumenteres, uanset normal dokumentationshyppighed.
- Fjern ikke tidligere anvendte kontroller; markér dem `retired`.
- Korrigerende handlinger i kataloget er prompts, ikke automatiske beslutninger.
- Kildeændringer kræver ny `reviewedAt` og vurdering af berørte kontroller.
- Læg lokationsspecifikke tider og hyppigheder i `controlOverrides` frem for at ændre kataloget.
- Registrér køle-, frost- og andet relevant udstyr i `assets`; brug stabile id'er, selv om label senere ændres.
- Brug `profileOverrides` til fagligt begrundede lokale grænser, og registrér begrundelse og kilder.
- Godkend ikke virksomhedskonfigurationen, så længe `openQuestions` eller `requires_review`-poster er uafklarede.

## Validering, der mangler før runtime

JSON Schema validerer grundformen. Applikationen skal senere også kontrollere:

- at id'er er unikke,
- at alle `activityId`, `controlIds`, profil-id'er og `sourceRefs` findes,
- at dokumentationshyppigheden er forenelig med kontrolhyppigheden,
- at `selected_occurrences` har en kendt, deterministisk regel,
- at en aktiveret kontrol kun bruger godkendte profiler og revisioner,
- at tidspunkter er gyldige i lokationens tidszone,
- at ændringer skaber revisioner frem for lydløs overskrivning.
- at virksomhedens `basedOnCatalogVersion` findes og er gennemgået,
- at lokations-, udstyrs-, aktivitets-, kontrol- og profilreferencer findes,
- at alle id'er er unikke inden for deres type.

## Før konfigurationen kan godkendes

- Bekræft hvilke aktiviteter virksomheden faktisk udfører.
- Kortlæg konkrete produktkategorier til temperaturprofiler.
- Beslut hvor mange køle- og fryseenheder der findes.
- Godkend kontrol- og dokumentationshyppigheder.
- Godkend grænser og eventuelle alternative tid-/temperaturprocesser.
- Beskriv de faktiske procedurer og ansvarlige roller.
- Godkend afvigelses- og afslutningsflowet.
