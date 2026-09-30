# Przegląd architektury geologii i heightmapy — 2026-09-30

Podsumowanie sesji analizy dlaczego generator wysp nie działa mimo 3 refaktorów.
Nie jest to gotowy plan wdrożenia — to zestaw zdiagnozowanych problemów i
uzgodnionych kierunków, do rozpisania na konkretne taski osobno.

## 1. Diagnoza: dlaczego wyspy wyglądają geometrycznie

`field.ts` liczy deltę obszaru jako:

```ts
const weight = smoothstep(1 - radius / pass.reach); // izotropowy, eliptyczny
return (lowFrequency + detail) * weight;             // szum MNOŻONY przez weight
```

Ponieważ `weight` to gładki, idealnie eliptyczny smoothstep który **mnoży** cały
wynik, wysokość jest wymuszona do zera dokładnie na krawędzi elipsy
niezależnie od szumu. Szum koloruje tylko wnętrze gotowego kształtu, nie
wpływa na kształt granicy. Stąd "figury geometryczne, lekko poprzerabiane".

**Kierunek naprawy:** domain warping współrzędnych *przed* liczeniem odległości
od centrum obszaru, żeby to szum decydował o kształcie granicy, nie tylko o
wysokości w środku. Miękki, nieskończony zanik (np. odwrotność kwadratu)
zamiast twardego `smoothstep` z konkretnym `reach`.

## 2. Geologia nie powinna definiować granic/kształtów

Obecny model: `GeologicalArea` to kształt (centre + extent + direction +
elongation) ze **stemplem** — twardą elipsą wygaszaną do zera.

**Uzgodniony model docelowy:** `GeologicalArea` to **metadane/parametry**
rozmieszczone w przestrzeni (analogicznie do makroregionów), które lokalnie
modulują parametry ciągłego pola szumu w całym świecie. Żadnych granic,
żadnego `reach`. Ląd/ocean wynika wyłącznie z tego, gdzie finalne ciągłe
pole przecina poziom morza — gdziekolwiek to się stanie.

Wyjątek: atole/kaldery wymagają jawnego składnika radialnego (rim + laguna),
ale musi być **dodawany** do wspólnego pola z miękkim zanikiem, nie mnożony
przez twardy cutoff.

### Wizualizacja podziału na regiony

Zaakceptowany koncept: świat podzielony na kilka regionów geologicznych,
granice jako zaszumiony dystans do kotwic (ta sama technika co
`border-displacement.ts` przy makroregionach) — granice **falują**, nie są
elipsami/kwadratami/liniami prostymi. Demo: `tmp/geology-regions-demo.html`,
`tmp/geology-regions.png`.

## 3. Proponowane regiony geologiczne (bez mieszania klimatu)

| Region | Charakter | Efekt |
|---|---|---|
| Szelf archipelagowy | płytkie dno, średnia gęstość/amplituda uplift, duże rozczłonkowanie | rozsiane średnie/małe wyspy, płytkie cieśniny |
| Łuk wulkaniczny | głębokie dno, rzadkie bardzo wysokie strome wyniesienia, silna szorstkość, elongacja | pojedyncze strome wyspy w łańcuchu |
| Prowincja atolowa | płytkie dno, niska amplituda, silny `rimStrength`, duże rozczłonkowanie | niskie, pierścieniowe wyspy |
| Pas orogeniczny | wysoka amplituda, silna górzystość/szorstkość, niskie rozczłonkowanie | jeden duży, zwarty górzysty ląd |
| Zatopiony basen szelfowy | dno tuż poniżej poziomu morza, bardzo niska gęstość/amplituda | głównie płytkie morze/laguna, ląd rzadko — odwrotność szelfu archipelagowego |
| Głębia abisalna | bardzo głębokie dno, znikoma gęstość uplift | głównie pusty ocean, rzadkie samotne wyspy/rafy |
| Płaskowyż kontynentalny | wysoka amplituda, dominacja pasma wielkoskalowego, minimalny detal, wąska strefa krawędziowa | płaski wierzchołek, strome krawędzie — mesy/stołowe góry |
| Krawędź ryftowa | silna asymetria wzdłuż osi, wyraźna elongacja | długie, wąskie, asymetryczne wyspy/półwyspy |

## 4. NoiseStage jako osobny etap stracił sens

Sprawdzeni realni konsumenci `noiseMap`:
1. `MacroRegionStage` — warunkowo, tylko gdy przełącznik "Border noise" wybiera
   `source: 'noise-map'` (domyślnie ma własny szum).
2. Warstwa podglądu w UI (czysto diagnostyczna).

Żaden etap terenu tego nie czyta — wszystkie mają już własne, nazwane
strumienie szumu. Mimo to `NoiseStage.execute` zawsze liczy pełny raster na
całej siatce, niezależnie czy ktokolwiek go użyje.

**Uzgodniona rekomendacja:**
1. Border noise dla makroregionów → własny nazwany strumień, niezależny od
   `NoiseStage`.
2. Podgląd surowego szumu → liczony leniwie tylko gdy user otworzy tę warstwę.
3. `NoiseStage` znika z obowiązkowego pipeline'u całkowicie.

## 5. HeightmapStage vs LandOceanStage — nie to samo, ale trzeba rozdzielić UI od pipeline'u

`LandOceanStage` **jeszcze nie istnieje** w kodzie — stąd wrażenie że to
dubluje heightmapę.

- **HeightmapStage:** jedna ciągła, skalarna wartość `H(p)` w metrach na
  komórkę. Żadnej klasyfikacji, żadnej tożsamości. Potwierdzone w kodzie:
  `reads: ['worldMask', 'geologyPlan']`, `writes: ['heightmap', 'provenanceMap']`.
- **LandOceanStage:** globalna analiza połączonych składowych na już
  policzonym `H(p)` — progowanie poziomem morza, flood-fill/union-find do
  nadania `islandId`, pochodne warstwy (`waterDepthMap`, `shelfIdMap`,
  linia brzegowa).

To dwa różne rodzaje obliczeń: lokalna funkcja punktu (równoległa,
kafelkowalna) vs globalny graf (wymaga całej siatki, obsługa szwu przy
świecie cylindrycznym). Rozdzielone też pozwalają tanio zmieniać poziom
morza bez przeliczania szumu.

**Uzgodnione rozwiązanie na "to wygląda jak to samo":** nie łączyć obliczeń,
tylko **rozprzęgnąć granulację pipeline'u od granulacji UI**. Dziś
`kolejność zakładek wynika z PIPELINE_STAGES` — sztywne 1:1. Docelowo: jedna
sekcja "Teren" w UI z jedną warstwą podglądu + przełącznik "pokaż linię
brzegową" nakładający wynik LandOcean, zamiast osobnej zakładki.

## 6. Paleta heightmapy udaje gotową klasyfikację ląd/ocean

`HEIGHTMAP_STOPS` w `palettes.ts` ma twardy próg dokładnie na `0`: niebieski
poniżej, piasek powyżej. To hipsometryczna paleta symulująca finalną
klasyfikację, mimo że `LandOceanStage` (spójność, `islandId`) nie istnieje.

**Podejrzenie:** to mogło napędzać poprzednie refaktory w złą stronę —
strojenie pola wysokości pod ładny kontur w tym konkretnym, przedwczesnym
podglądzie (naiwne `H > 0`), zamiast pod statystyczną poprawność pola. Stąd
m.in. twardy stempel elipsy — dawał czysty, przewidywalny kontur w tej
palecie kosztem naturalności.

**Rekomendacja:** neutralna, rozbieżna paleta bez semantyki wody dla warstwy
diagnostycznej HeightmapStage. Prawdziwa niebiesko-zielona paleta
ląd/ocean należy dopiero do warstwy `LandOceanStage`, gdy dane faktycznie
reprezentują sklasyfikowane, spójne wyspy.

## 7. Skala świata i rozmiar wysp

### Zdiagnozowany problem

Obecne presety:
```ts
SIZE_PRESETS = [
  { value: 'small',  sizeMeters: 1000 },
  { value: 'medium', sizeMeters: 2000 },
  { value: 'big',    sizeMeters: 4000 },
]
MAX_WORLD_SIZE = 10_000 (niewykorzystane przez żaden preset)

TERRAIN_DETAIL_OPTIONS = [0.5m, 1m, 2m, 4m] // metersPerSample
MIN_AREA_EXTENT = 0.04, MAX_AREA_EXTENT = 0.6 // ułamek świata
```

Nawet "Big" (4000m) jest za mały na cel: wyspy które mają wymuszać podróże
między nimi (nie jeden kontynent), ale są na tyle duże żeby zmieścić rzeźbę
terenu i przyszłe rzeki. Sample budget po cichu podbija `metersPerSample`
przy dużych światach, dając gorszą realną rozdzielczość niż user wybrał.

### Uzgodnione cele projektowe

- Mała wyspa surowcowa: ~150–350 m
- Wyspa "węzłowa"/baza: ~400–800 m
- Odstępy wody między klastrami: kilkaset do ~1500 m (wymusza łódź)
- Rozdzielczość wewnątrz wyspy: `cellMeters ≈ 15-20m` (żeby było miejsce na
  wzgórze i przyszły ciek wodny)

### Proponowane zmiany

**Presety wielkości świata:**
```ts
SIZE_PRESETS = [
  { value: 'small',  sizeMeters: 2000 },
  { value: 'medium', sizeMeters: 5000 },
  { value: 'big',    sizeMeters: 10000 }, // = obecny MAX_WORLD_SIZE
]
```

**Terrain detail — dodać grubsze opcje, nie zastępować drobnych:**
```ts
TERRAIN_DETAIL_OPTIONS = [0.5m, 1m, 2m, 4m, 8m, 16m]
```
Przy "Big" (10000m) + 16m/sample: `sampleWidth ≈ 625` — rozsądna siatka,
budget jej nie przytnie.

**Sample budget** — przeliczyć próg pod nowe presety, żeby rozsądny detal
(np. Big + 8-16m) nie był po cichu przycinany bez wyraźnego ostrzeżenia.

**Zakresy geologii** — `MIN/MAX_AREA_EXTENT` jako ułamek świata (0.04-0.6)
były dobrane pod świat 1000-4000m. Przy 10000m te same ułamki dają
nieproporcjonalnie duże metry. Do rozważenia: przełączyć `extent` z ułamka
świata na wartość w metrach wprost — spójnie z resztą geologii, która już
liczy w metrach (`upliftScaleMeters`, `seabedOffsetMeters`).

### Otwarta kwestia — fragmentacja jako świadomy parametr

Podejrzenie: `fragmentGain` w połączeniu z małym `upliftScaleMeters` może
rozbijać jeden obszar na wiele mikroskopijnych, niepołączonych szczytów
zamiast jednej spójnej wyspy o zamierzonym rozmiarze. Do zweryfikowania przy
wdrożeniu: pasmo `large` powinno dominować na tyle, żeby domyślnie
1 obszar = 1 spójna wyspa; `fragmentation` ma świadomie dzielić na 2-4 wyspy,
nie przypadkiem na kilkadziesiąt kropek.

## Co NIE jest jeszcze ustalone / wymaga dalszej pracy

- Dokładne wartości liczbowe nowych `MIN/MAX_AREA_EXTENT` w metrach.
- Konkretna implementacja domain warpingu w `field.ts`/`plan.ts`.
- Realne wartości parametrów per region z sekcji 3 (na razie tylko tendencje
  jakościowe, nie liczby).
- Przeliczenie sample budget pod nowe presety.
- Weryfikacja hipotezy o fragmentacji na realnych danych (nie tylko w demo).
