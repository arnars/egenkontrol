# Designsystem

Dette dokument bygger på en read-only kodeanalyse af opskriftssitet den 12. juli 2026. Referenceprojektet har ingen tilgængelig Git-revision, så analysen kan ikke bindes til et commit-id. Ved senere ændringer skal dato og helst revision registreres igen.

Egenkontrolsystemet implementerer fra 13. juli 2026 værdierne med Tailwind CSS 4-utilities. `src/styles/app.css` indeholder kun Tailwind-import, tokens og dokumentglobale regler; komponentstyling ligger sammen med Svelte-markuppen.

Værdier må ikke opfindes. Genbrug værdierne nedenfor, eller registrér et konkret domæne- eller tilgængelighedsbehov under "Afvigelser fra referenceprojektet".

## Referenceprojekt

- Relativ sti: `../recipe-site`
- Applikation: `../recipe-site/app`
- Adgang: read-only
- Teknologi i referencen: Astro 7 og Tailwind CSS 4
- Analyseret: 2026-07-12
- Git-revision: ikke tilgængelig i referenceprojektet

Stien er dokumenteret i `LOCAL_SETUP.md`. Referenceprojektets egne `AGENTS.md`-filer beskriver udtrykket som enkelt, roligt, funktionelt og uden unødige animationer eller tunge effekter.

## Relevante kildefiler

| Område | Kilde i referenceprojektet | Udledt information |
| --- | --- | --- |
| Tokens og print | `app/src/styles/global.css` | Farver, fonte, tokens og A4-print |
| Grundlayout | `app/src/layout/base.astro` | Baggrund, indholdsbredde og vertikal padding |
| Navigation | `app/src/components/nav.astro` | Segmenteret topnavigation, fokus og animation |
| Forside | `app/src/pages/index.astro` | Sidehoved, typografisk hierarki og sektionsafstand |
| Filtre | `app/src/pages/_recipe-index/RecipeIndexFilters.astro` | Labels, inputs, selects, knapper og filterlayout |
| Kort/liste | `app/src/pages/_recipe-index/RecipeIndexCard.astro` | Indholdspaneler, metadata, fokus og responsive grids |
| Detaljevisning | `app/src/pages/recipes/_detail/*.astro` | Overskrifter, definition lists, sticky sideindhold og print |
| Menuvisning | `app/src/pages/menus/_detail/*.astro` | Tjeklister, kolonner, print og informationshierarki |
| Tom tilstand | `app/src/pages/menus/_index/MenuIndexList.astro` | Kort tom besked uden ekstra panel |
| Fejlside | `app/src/pages/404.astro` | Fejltypografi og sekundære handlingslinks |

Kildestierne er relative til `../recipe-site` og må ikke kopieres som absolutte maskinstier.

## Designprincipper

- Indhold og daglige handlinger har højere visuel prioritet end navigation og systemkrom.
- Udtrykket er næsten monokromt med varm, off-white sidebaggrund.
- Store sans-serif-overskrifter kombineres med serif-brødtekst og små monospace-labels.
- Hierarki skabes primært med typografi, luft og enpixel-separatorer, ikke skygger.
- Paneler er flade; cards bruges til sammenhængende indhold, ikke som standardcontainer for alle felter.
- Interaktioner er diskrete og korte. Ingen funktion må afhænge af animation eller hover.
- Egenkontrolsystemet skal overtage formsproget, men tilpasse betjeningsmål til køkkenbrug på iPad.

## Farver

Farverne er defineret direkte i `app/src/styles/global.css`.

| Token | Værdi | Rolle |
| --- | --- | --- |
| `paper` | `#ffffff` | Felter, almindelige paneler og aktiv navigationstekst |
| `page` | `#f7f7f4` | Sidebaggrund |
| `ink` | `#111111` | Primær tekst, fokus, aktiv flade og stærk border |
| `muted` | `#6b6b63` | Sekundær tekst, labels og inaktive handlinger |
| `line` | `#d9d9d2` | Borders og separatorer |
| `accent` | `#111111` | Fokus og aktiv status; identisk med `ink` |
| `accent-soft` | `#eeeeea` | Tags, hover og diskret fremhævelse |
| `sage` | `#eeeeea` | Semantisk token til køkkenudstyr; aktuelt identisk med `accent-soft` |

Der er ingen blå eller kulørte statusfarver i referencen. Fejl, advarsel og succes i egenkontrolsystemet kræver derfor enten tekst/ikon/mønster inden for paletten eller en dokumenteret afvigelse efter kontrastkontrol. Status må aldrig formidles med farve alene.

## Typografi

Alle fonte er systemstakke; der hentes ingen webfonte.

| Rolle | Fontstak | Observeret brug |
| --- | --- | --- |
| Serif | `ui-serif, Georgia, Cambria, "Times New Roman", Times, serif` | `body`, brødtekst som udgangspunkt |
| Sans | `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | Overskrifter, formularinput og længere handlings-/metodetekst |
| Mono | `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace` | Metadata, labels, navigation, status og små knapper |

Observeret hierarki:

- Sidetitel: sans, `text-5xl` til `md:text-7xl`, semibold, linjehøjde `0.92`, meget tæt tracking.
- Sektionsoverskrift: sans, `text-4xl` til `md:text-5xl`, medium, linjehøjde `1`.
- Korttitel: sans, `text-3xl`, medium, linjehøjde `0.95`, tæt tracking.
- Underoverskrift: sans, typisk `text-lg` eller `text-3xl`, medium.
- Introduktion/metodetekst: sans, `text-lg`, afslappet linjehøjde.
- Labels/metadata: mono, oftest `text-xs` eller `10px`, uppercase og `tracking-widest`.
- Formularinput og kompakt brødtekst: sans, `text-sm`.

Kombinationen af meget små uppercase-labels og store overskrifter er karakteristisk. Små tekster må ikke bruges til kritisk iPad-information uden en tilgængelighedsvurdering.

## Spacing

Referencen bruger Tailwinds standardskala konsekvent; basisenhed er `0.25rem`.

- Små interne gaps: `0.25–0.75rem` (`gap-1` til `gap-3`).
- Normal komponentafstand: `1rem–1.5rem` (`gap-4`, `gap-6`, `p-6`).
- Sektionsafstand: `2.5–4rem` (`mb-10`, `gap-12`, `gap-16`).
- Kort har typisk `1.5rem` padding; kompakt listevariant `1.25rem`.
- Labels har typisk `0.5rem` afstand til feltet.
- Sidehoved og navigation bruger store bundafstande omkring `3–3.5rem`.

Brug samme skala. Tilføj kun nye mellemtrin, hvis en dokumenteret iPad-interaktion kræver det.

## Layout

- `body`: mindst viewport-højde, `page`-baggrund, `ink`-tekst og serif-font.
- Hovedcontainer: centreret bredde `min(1120px, calc(100vw - 2rem))`.
- Vertikal sidepadding: `3rem`, fra `md` `4rem`.
- Forsidehoved: én kolonne på smal skærm, to ved `md`.
- Indekskort: én kolonne, to ved `sm`, tre ved `lg`.
- Filtergrid: to kolonner ved `sm`, seks ved `lg`.
- Detaljevisninger bruger indholdsgrid og i enkelte tilfælde sticky sideindhold fra `md`.
- Print fjerner containerbredde og padding.

Egenkontrolsystemet skal bruge en indholdscentreret topstruktur. En permanent klassisk SaaS-sidebar er ikke en del af referencesproget.

## Breakpoints

Referencen bruger Tailwind 4-standardbreakpoints uden lokale overskrivninger.

| Prefix | Minimumsbredde | Observeret brug |
| --- | --- | --- |
| `sm` | `640px` | To kolonner i indeks og filtre |
| `md` | `768px` | Sidepadding, to-kolonne-headere, sticky sideindhold |
| `lg` | `1024px` | Tre kortkolonner og sekskolonne-filtre |
| `xl` | `1280px` | Tre kolonner i menu-/forberedelseslister |
| `2xl` | `1536px` | Fire kolonner i udvalgte indkøbsvisninger |

iPad-visninger skal afprøves efter faktisk viewport og orientering; breakpointnavne må ikke stå alene som accept af layoutet.

## Borders, radius og skygger

- Borders: `1px` med `line`; ved hover/fokus skifter nogle til `ink`.
- Separatorer er oftest top- eller bundborder frem for indrammede paneler.
- De fleste knapper, felter og cards har skarpe hjørner.
- `rounded-sm` bruges på inline tokens; segmenteret navigation bruger `rounded-full`.
- Der er ingen observerede box-shadows.

## Knapper

To centrale mønstre findes:

1. **Indrammet handling:** højde `2rem` eller `2.25rem`, `line`-border, vandret padding `0.75–1rem`, mono `10–12px`, uppercase, bred tracking og `muted` tekst. Hover bruger `ink`-border/-tekst og nogle steder `accent-soft`-baggrund.
2. **Diskret teksthandling:** ingen ramme, mono `10px`, uppercase, muted/ink og ofte underline ved aktiv status.

Fokus på links og indrammede handlinger bruger synlig `2px` accent-ring med `2px` eller `4px` offset. Disabled- og loading-tilstande er ikke defineret i referencen og skal designes som dokumenterede udvidelser.

Referenceknappernes `2–2.25rem` højde er for lille som generel standard til køkkenbetjening. Egenkontrolsystemets primære handlinger skal beholde typografi, border og farver, men bruge større trykflader; se afvigelseslisten.

## Formularfelter

- Input og select: højde `2.25rem`, fuld bredde, `paper`-baggrund, `line`-border og `0.75rem` vandret padding.
- Tekst: sans `text-sm`, `ink`; placeholder er `muted`.
- Label: mono `text-xs`, uppercase, bred tracking, `muted`, blok med `0.5rem` bundafstand.
- Fokus ændrer border til `ink`; referencefelterne har ikke samme eksplicitte ring som handlingslinks.
- Filterlayoutet er responsivt og bruger native input/select frem for et komponentbiblioteks standardskin.

Egenkontrolsystemet skal tilføje synligt `focus-visible`, valideringstekst, disabled, read-only, loading og ikke-gemt/netværksfejl. Numeriske felter skal bruge passende `inputmode`; fritekst begrænses i daglige flows.

## Navigation

Navigationen ligger øverst og er centreret i indholdscontaineren. Hovedvalgene vises som en segmenteret, `18rem` bred pill med hvid baggrund, `line`-border og `0.25rem` padding. Hvert link er `2rem` højt. Aktivt valg har `ink`-baggrund og `paper`-tekst. En kontekstuel tilbagehandling ligger separat til venstre.

Den aktive pill flyttes på `200ms ease-out`; navigationen venter `120ms` før route-skift, så bevægelsen ses. Egenkontrolsystemet bør bevare det diskrete topnavigationsprincip, men informationsarkitekturen og touchmål skal valideres for flere funktioner.

Egenkontrolsystemets primære topnavigation bruger referenceprojektets form, padding, linkhøjde og typografi, men er udvidet fra `18rem` til `32rem`, fordi fire destinationer ellers bliver for tætte. Den bruger fortsat `0.25rem` indvendig padding, `2rem` linkhøjde og mono `11px`. På smalle telefonformater fylder navigationen containerens bredde og placeres under **Log ud**. Den separate **Log ud**-handling bruger samme `2rem` højde og `11px` typografi uden vandret padding, så teksten flugter med indholdscontainerens venstre kant.

## Kort og paneler

- Normale kort bruger `paper`-baggrund, `1.5rem` padding og ingen border eller skygge.
- Særlige/utility-kort bruger `accent-soft` med lavere opacity og `line`-border.
- Korttitlen står ofte sent i den vertikale rytme med metadata over og under.

På listen over dagens kontroller åbnes den valgte kontrols inputpanel direkte under dens egen række. Et nyt tryk på samme kontrolrække lukker panelet igen. Panelet må ikke samles i bunden af listen, fordi den rumlige forbindelse mellem handling og kontrol ellers bliver uklar på iPad.

Risikoanalyse og arbejdsgangsplaner bruger én fælles dokumentheader udledt af opskriftssitet: stor sans-serif `text-5xl/7xl`, semibold vægt, tæt tracking, mono-status og en kort introduktion i højre kolonne. Serif forbeholdes længere brødtekst. Tabeller bruger én fælles komponent med samme kolonneoverskrifter, cellepadding, linjer, typografi og minimumsbredde; på smalle skærme ruller de vandret frem for at blive omdannet til dashboardkort.

Statiske arbejdsgange bruger opskriftssidens metodehierarki: en kort note i sans-serif og muted farve med venstrekant, efterfulgt af instruktioner med små mono-løbenumre. Tailwinds nulstilling af standard-listemarkører må ikke efterlade punkter som ustrukturerede, fritstående tekstlinjer.

Topnavigationens fire pladser er **Kontroller**, **Planer**, **Historik** og **Risiko**. Historik er en selvstændig, kronologisk visning med et standardinterval på 30 dage, hurtige periodevalg og frie fra-/til-datoer. Registreringer grupperes efter lokal dato i flade rækker; afvigelser, handlinger og ingen måling skal kunne aflæses uden en tung dashboardtabel. Planer samler rengøring, personlig hygiejne, adskillelse, skadedyr og varemodtagelse på en enkel indeksvisning. De første tre læses som statiske dokumenter. Skadedyr og varemodtagelse viser den statiske arbejdsgang først og åbner kun en formular ved en konkret hændelse eller fejl.
- Metadata vises som små definition lists med højrejusterede værdier.
- Listetilstand bruger flade grids og lodrette separatorer i stedet for tabeller.
- Detailsektioner adskilles typisk af overskrift plus bundborder.

For dagens kontroller bør en enkel liste/række være udgangspunktet. Brug kun paneler, når de samler én meningsfuld kontrol eller handling.

## Feedbacktilstande

- Tom filtrering: en kort, muted sans-tekst, fx "Ingen menuer matcher filtreringen", uden illustration eller ekstra card.
- Fejlside: stor sans-titel, forklarende muted tekst og indrammede handlingslinks.
- Midlertidig handlingsfeedback: kopieringsknap skifter tekst til succes eller fejl og nulstilles efter `1200ms`.
- Aktiv filter-/visningsstatus: `ink`, underline og `aria-pressed`.

Referencen har ikke dækkende mønstre for gemt, valideringsfejl, advarsel, manglende kontrol eller netværksfejl. Disse er nødvendige udvidelser. De skal være tekstlige, vedvarende så længe de er relevante, tilgængelige for hjælpemidler og må ikke være farveafhængige.

## Animationer

- Almindelige farve-/borderændringer bruger Tailwinds `transition` uden lokal varighed.
- Segmenteret navigation bruger eksplicit `200ms ease-out`.
- Route-skiftet forsinkes `120ms` efter navigationsvalg.
- Kopieringsfeedback nulstilles efter `1200ms`; det er feedbacktiming, ikke en animation.
- Der er ingen dekorative animationer eller observeret lokal `prefers-reduced-motion`-regel.

Nye bevægelser skal være funktionelle og diskrete. Egenkontrolsystemet skal respektere reduceret bevægelse, især hvis navigationens flytning genbruges.

## Print

`global.css` definerer A4 med margin `10mm 12mm`, hvid baggrund og transparente inline tokens. Navigation og skærmhandlinger skjules. Detailkomponenterne:

- reducerer typografi til ca. `6–13pt` afhængigt af hierarki,
- reducerer gaps og padding,
- undgår sideskift inde i logiske blokke,
- bruger eksplicitte sideskift før større lister,
- viser menufod som fast printfooter,
- fjerner interaktive fremhævelser og underlines.

En kommende tilsynsudskrift skal bruge samme nøgterne printprincip, men desuden sikre bruger, tidspunkt, tidszone, revision, afvigelser og korrigerende handlinger. Print er ikke i sig selv eksport eller backup.

## iPad-specifikke regler

- Bevar den maksimale indholdsbredde og varme sidebaggrund, men validér gutters i begge orienteringer.
- Ingen funktion må afhænge af hover; hover er kun en ekstra respons.
- Primære kontrolrækker og handlinger skal have mindst `44 × 44px` trykflade som projektspecifik tilgængelighedsafvigelse.
- Brug få trin, store numeriske input og passende skærmtastatur.
- Kritisk metadata må ikke stå alene i referenceprojektets `10px` labels.
- Vis manglende kontroller tydeligt med tekst og struktur, ikke kun farve.
- Gemmefeedback skal være tydelig og vedvarende nok til at blive opfattet.
- Bevar indtastet formularindhold ved netværksfejl, hvor praktisk muligt; MVP er stadig online-only.
- Understøt stående og liggende orientering og undgå kontroller skjult af skærmtastatur eller safe areas.

## Komponentinventar

| Komponent til egenkontrol | Reference | Retning |
| --- | --- | --- |
| App-header/topnavigation | `components/nav.astro` | Genbrug topplacering, pill, mono-labels og aktive farver; forstør touchmål og afklar flere destinationer |
| Sidetitel og intro | `pages/index.astro` | Genbrug stort sans-hierarki, to-kolonne-layout og bundseparator |
| Knap | `RecipeDetailActions.astro`, `404.astro` | Genbrug border/farve/fokus; større primære touchmål |
| Formularfelt | `RecipeIndexFilters.astro` | Genbrug font, farver og border; tilføj fokus, validering og større daglige input |
| Kontrolrække | `RecipeIndexCard.astro` listevariant | Brug fladt grid/separator frem for tung tabel; domænespecifik status og handling tilføjes |
| Kontrolpanel | `RecipeIndexCard.astro` cardvariant | Kun til én sammenhængende kontrol, hvid flade uden skygge |
| Metadata | `RecipeIndexMetaList.astro`, `RecipeDetailMeta.astro` | Definition list med mono-label og tydelig værdi; forstør vigtig status |
| Tjekliste | `MenuDetailPrepList.astro`, `MenuDetailShoppingList.astro` | Genbrug firkantet checkmark og flade rækker; gør den interaktiv og touchvenlig |
| Statusindikator | Tags og aktiv navigation | Brug accent-soft/ink plus tekst; nye statustyper skal dokumenteres |
| Tom tilstand | `MenuIndexList.astro` | Kort, direkte tekst i flowet |
| Fejlvisning | `404.astro` | Genbrug typografisk hierarki og indrammede næste handlinger |
| Printvisning | `global.css` og detailkomponenter | Genbrug A4, kompakt hierarki, skjulte handlinger og break-regler |

## Afvigelser fra referenceprojektet

| Afvigelse | Behov og beslutning | Status |
| --- | --- | --- |
| Større trykflader | Referencehandlinger er typisk `32–36px` høje. Primære iPad-handlinger sættes til mindst `44 × 44px`, mens border, typografi og farver bevares. | Besluttet projektregel |
| Større kritisk tekst | Referenceprojektets `10px` mono-labels må kun bruges til sekundær metadata; manglende kontroller, fejl og gemmestatus skal være større og tydeligere. | Besluttet projektregel |
| Domænestatusser | Referencen mangler komplette mønstre for succes, advarsel, afvigelse og manglende kontrol. Udformning afventes en visuel prøve og kontrasttest. | Åben |
| Formularfeedback | Validering, disabled, loading og netværksfejl findes ikke som samlet reference. De skal designes i samme flade formsprog. | Åben |
| Reduced motion | Referencen har ingen lokal regel. Genbrugte animationer skal have en reduceret eller fjernet variant. | Besluttet projektregel |
| Tilsynsprint | Referenceprint er opskriftsorienteret. Egenkontrolprint skal tilføje revisionsmetadata og afvigelsesforløb uden at ændre den visuelle grundstil. | Åben |
