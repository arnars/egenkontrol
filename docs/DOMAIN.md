# Domæne

## Formål

Egenkontrolsystemet skal hjælpe virksomheden med at planlægge, udføre og dokumentere kontroller, håndtere afvigelser og fremvise en sporbar historik. Det understøtter virksomhedens egen risikoanalyse og procedurer; det afgør ikke, om disse er fagligt eller juridisk tilstrækkelige.

> Virksomhedens konkrete risikoanalyse er endnu ikke udarbejdet. Eksempler i dokumentationen er derfor illustrative og må ikke behandles som universelle krav.

## Risikoanalyse, procedure og dokumentation

- **Risikoanalysen** forbinder virksomhedens konkrete aktiviteter med relevante risici og vurderer styringsbehovet.
- **Proceduren** beskriver, hvordan en styringsforanstaltning udføres i praksis, hvem der gør det, og hvordan der reageres.
- **Dokumentationen** er det revisionsrelevante bevis for planlagte og udførte kontroller, målinger, afvigelser, handlinger og ændringer.

De tre lag skal hænge sammen, men må ikke blandes: en registrering er ikke i sig selv en risikoanalyse, og en procedure er ikke bevis for, at kontrollen er udført.

## Central domænekæde

```text
Aktivitet
→ Risiko
→ Styringsforanstaltning
→ Procedure
→ Kontroldefinition
→ Planlagt kontrol
→ Udført kontrol
→ Eventuel afvigelse
→ Korrigerende handling
```

En kontroldefinition kan have en kritisk grænse og en gentagelsesregel. Gentagelsesreglen danner planlagte kontroller; en udført kontrol dokumenterer den konkrete hændelse.

## Driftsdage og lukkedage

En lokation har et konfigureret ugentligt driftsmønster. En `daily`-regel betyder én forekomst pr. **driftsdag**, ikke pr. kalenderdag. En fast lukkedag danner derfor ingen planlagt kontrol og skal hverken vises som manglende eller efterfølgende markeres som overskredet. Ugevisningen viser lukkedagen eksplicit, så fraværet af kontroller kan forklares.

Nabo Brejnings aktuelle konfigurationsudkast bruger tirsdag–lørdag som normale driftsdage og mandag/søndag som faste lukkedage. Mønstret er et driftsmæssigt udkast, ikke en fagligt godkendt kontrolhyppighed. Hvis allerede planlagte kontroller ikke udføres, kan de afsluttes enkeltvis eller samlet for dagens resterende kontroller som **Ingen måling** med en konfigureret grund, fx lukket eller helligdag. Det er dokumentation for de konkrete forekomster og må ikke gemmes som opdigtede måleværdier.

## To forskellige hyppigheder

**Kontrolhyppighed** beskriver, hvor ofte kontrollen reelt skal udføres. **Dokumentationshyppighed** beskriver, hvilke udførelser der normalt registreres. De skal modelleres separat.

Eksempel: Modtagne varer kan kontrolleres ved hver varemodtagelse, mens normal dokumentation udtages efter en anden, fagligt fastlagt frekvens. Fejl og afvigelser skal altid kunne dokumenteres. Systemet må ikke selv fastsætte frekvenserne.

## Afvigelser og korrigerende handlinger

En afvigelse er en selvstændig registrering knyttet til en udført kontrol eller en anden observeret hændelse. Den beskriver observationen, vurderingen og status. Den må ikke blot overskrives eller lukkes uden dokumenteret stillingtagen.

En korrigerende handling beskriver, hvad der blev gjort, af hvem og hvornår, samt eventuel opfølgning. En afvigelse kan kræve flere handlinger og skal bevare hele forløbet i historikken.

## Eksempler på kontrolområder

Mulige områder er varemodtagelse, køle- og frostopbevaring, opvarmning, nedkøling, varmholdelse, salg uden for køl, rengøring, personlig hygiejne, allergener, adskillelse, vedligeholdelse, skadedyr, sporbarhed, tilbagetrækning og årlig revision. Sandsynlige første MVP-kontroller er temperatur på køl og frost, varemodtagelse, opvarmning, nedkøling og varmholdelse.

Listen er ikke et kravkatalog. Relevans, grænser og hyppighed afhænger af virksomhedens risikoanalyse.

Rengøring og skadedyrssikring modelleres foreløbigt som gode arbejdsgange med statiske, versionerede planer frem for gentagne digitale kontroller. Konkrete skadedyrsfund og leveringsfejl er hændelser, som skal kunne registreres med observation, vurdering og handling. En fejlfri varemodtagelse danner kun en digital registrering, hvis virksomhedens godkendte procedure senere fastlægger en normal dokumentationshyppighed.

## Begrebsoversigt

| Begreb | Betydning i systemet |
| --- | --- |
| Virksomhed | Den juridiske eller organisatoriske enhed, der ejer egenkontrollen. |
| Lokation | Det fysiske driftssted, hvor aktiviteter og kontroller foregår. |
| Bruger | En identificeret person med adgang og revisionsspor. |
| Aktivitet | En konkret arbejdsgang, fx varemodtagelse eller nedkøling. |
| Risiko | Et muligt uønsket forhold knyttet til en aktivitet. |
| Risikoanalyse | Den faglige vurdering af aktiviteter, risici og styring. |
| Styringsforanstaltning | Tiltag, der forebygger, fjerner eller reducerer en risiko. |
| Procedure | Den versionerede beskrivelse af, hvordan arbejdet udføres. |
| Kontroldefinition | Konfiguration af hvad, hvordan og hvornår der kontrolleres. |
| Kritisk grænse | En fagligt fastlagt grænse knyttet til relevant styring; ikke nødvendigvis relevant for alle kontroller. |
| Kontrolhyppighed | Hvor ofte kontrollen udføres. |
| Dokumentationshyppighed | Hvor ofte normal udførelse registreres. |
| Planlagt kontrol | En konkret forventet kontrol forekomst med tidsvindue og status. |
| Ingen måling | En sporbar afslutning af en planlagt kontrol med grund og uden måleværdi. |
| Udført kontrol | Den revisionsrelevante registrering af en udførelse. |
| Måling | En struktureret værdi med enhed og kontekst, fx en temperatur. |
| Afvigelse | En selvstændig registrering af et forhold, der kræver stillingtagen. |
| Korrigerende handling | Dokumenteret reaktion på en afvigelse. |
| Dokument | Risikoanalyse, procedure, eksport eller andet versioneret materiale. |
| Revision | En ny, sporbar version eller periodisk gennemgang. |
| Auditlog | Append-only spor af væsentlige hændelser og ændringer. |

## Åbne domænespørgsmål

- Hvilke aktiviteter udfører virksomheden konkret, og på hvilke lokationer?
- Hvilke risici, GAG-områder og eventuelle CCP-områder identificerer den faglige vurdering?
- Hvilke grænser, kontrolhyppigheder og dokumentationshyppigheder fastlægges?
- Hvad er tilladte tidsvinduer, og hvornår er en kontrol manglende?
- Hvilke roller kan udføre, rette, godkende og revidere?
- Hvordan håndteres hændelsesbaserede kontroller uden kendt tidspunkt på forhånd?
- Hvornår kan en afvigelse afsluttes, og kræves opfølgende godkendelse?
- Hvilke krav fastlægges for sporbarhed, eksport, backup og dokumentopbevaring?
