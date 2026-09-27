# Plan wdrożenia heightmapy

Zakres planu: `HeightmapStage` (#57) jako pierwszy etap zależny od stref
charakteru. Dokument rozwija story #359 (etap + warstwa + formularz) i opisuje
konkretną kolejność, kontrakty i szczegóły implementacji. Status: propozycja,
nic z tego nie jest jeszcze zaimplementowane.

Punkty odniesienia: roadmapa §4.1, §4.4, §4.5, §4.6; `docs/character-zones-analysis.md`;
`docs/structure-character-plan-2026-09-27.md` (pkt 7 odłożony na ten etap).

## Zasady, których etap nie może złamać

- zero importów z `map-layers`, `map-renderer`, komponentów i store'ów,
- jedna ramka i jedna odległość: wszystko przez `spaceOf(context)` i
  `planarDistance`, żadnych lokalnych dzielników ani drugiego `Math.hypot`,
- etap deklaruje wejścia i wyjścia, nie czyta nieprzypisanych kluczy `state`,
- strefy czyta wyłącznie przez wspólny port `createZoneSampler`, nie odtwarza
  geometrii po swojemu,
- brak drugiej normalizacji i `wrap`-branchy; topologia wchodzi tylko przez `space.ts`,
- form-only policy (copy suwaków) zostaje w UI; limity domenowe (`MAX_*`) w generatorze.

## Rola etapu

Etap zamienia **zamiar** (szkielet, szelf, strefy charakteru) na **ciągłą
wysokość** w metrach. Nie tnie poziomem morza, nie liczy wysp, nie robi
hydrologii. Tworzy jeden raster `Float32Array` oraz metadane potrzebne
`LandOceanStage`.

Wysokość = baza profilu (strefy) × maska wpływu (szkielet) + szum + szelf,
w metrach, spójna między strukturami, deterministyczna dla seeda.

## Kontrakty danych (etap 1)

### 1.1 Konfiguracja `HeightmapConfig`

Nowy wycinek `MapConfig`, obok `structureCharacter`:

```ts
export interface HeightmapConfig {
  /** Rzeźba terenu: 0 = płasko, 1 = bardzo górzysto. Skaluje amplitudy lądu. */
  readonly relief: number;
  /** Wielkość form terenu; wpływa na rozmycie wypaczenia domeny, nie na liczbę oktaw. */
  readonly featureScale: number;
}
```

Domyślne wartości w `defaults.ts` etapu (kolokowane z limitami):

```ts
export const MIN_RELIEF = 0;
export const MAX_RELIEF = 1;
/** Płaskie, stałe dno oceanu. Mapa czytana jest z góry, więc głębokość nie ma znaczenia. */
export const OCEAN_DEPTH_METERS = 100;
export const DEFAULT_HEIGHTMAP_CONFIG: HeightmapConfig = {
  relief: 0.5,
  featureScale: 0.5,
};
```

Szelf (`width`, `targetDepth`, `falloff`, `irregularity`) zostaje w
`LandmassConfig.shelf`; `HeightmapStage` tylko go konsumuje przez
`layout.shelves`.

**Jednostki i jedna rola każdego parametru** (rozstrzygnięcie zastrzeżenia 3):

| Parametr | Jednostka | Rola |
|---|---|---|
| `shelf.width` | znormalizowana | odległość od krawędzi korytarza do granicy szelfu |
| `shelf.targetDepth` | metry (zmiana kontraktu) | głębokość na wewnętrznej krawędzi szelfu, jako wartość dodatnia; zapis w `heightmap` to `-targetDepth` |
| `shelf.falloff` | 0..1 | kształt zbocza wewnątrz pasa szelfu (od `-targetDepth` do dna oceanu) |
| `shelf.irregularity` | 0..1 | zaburzenie krawędzi szelfu, sterowane `noiseMap` |
| `OCEAN_DEPTH_METERS` | metry, stała | płaskie dno poza szelfem (`100`); mapa jest czytana z góry, więc głębokość nie jest parametrem |
| `HeightmapConfig.shelfFalloff` | — | **usuwać** — duplikuje `shelf.falloff`; zostaje jeden właściciel |

`targetDepth` przechodzi z 0..1 na metry (domyślnie `60`, czyli płytka woda
szelfowa nad dnem na `-100`), bo i tak jest to wielkość głębokości, a przeliczanie
0..1 × głębokość oceanu tworzyło drugą skalę. Zmiana dotyka `ShelfDefinition`,
`ShelfConfig`, `shelves.ts`, testów szelfu i kopii w `LandmassLayoutStage`.

### 1.1a Datum i wartość poza światem (rozstrzygnięcie zastrzeżenia 7)

- **Datum**: `heightmap = 0` to domyślny poziom morza. Ląd dodatni, dno ujemne.
  `HeightmapStage` nie zna poziomu morza — `LandOceanStage` (parametr własny)
  wykona cięcie i ustali, gdzie faktycznie jest woda.
- **Poza maską świata**: `heightmap = 0` i `shelfIndexMap = -1`, czyli wartości
  skończone. `NaN` odpada — `assertStageOutput` i statystyki nie muszą wtedy
  odfiltrowywać, a zapis JSON rastra przez typed array i tak zostaje binarny.
  Komórki poza maską są pomijane w statystykach po `worldMask`, jak w `NoiseStage`.
- **Nakładające się szelfy**: mimo zakazu nakładania struktur (poza grupą)
  granice szelfów mogą się stykać. Reguła wyboru jednego indeksu: pierwszy szelf
  w kolejności `layout.shelves`, który pokrywa punkt. `shelfIndexMap` jest
  źródłem prawdy o szelfie do czasu, aż `LandOceanStage` (#58) zbuduje wynikowy
  `shelfIdMap` z roadmapy §4.4 — ten etap nie tworzy drugiej geometrii.

### 1.2 Nowe wyjścia `MapState`

```ts
/** Produced by the heightmap stage. Wysokość lądu i dna względem poziomu morza, w metrach. */
heightmap?: Float32Array;
/** Produced by the heightmap stage. Śledzi przynależność do szelfu; -1 = poza szelfem. */
shelfIndexMap?: Int16Array;
```

- `heightmap` — wysokość w metrach. Wartości > 0 to ląd, ≤ 0 to dno, zero to
  domyślny poziom morza (patrz §1.1a). `LandOceanStage` dostanie poziom morza
  jako własny parametr i samo wykona cięcie,
- `shelfIndexMap` — indeks szelfu z `layout.shelves` albo `-1`. `Int16Array`,
  bo indeksów szelfów jest co najwyżej tyle, ile struktur z grupy (limit 20).
  Pozwala `LandOceanStage` rozpoznać wodę szelfową bez drugiego liczenia
  zasięgu wpływu — czyli bez drugiej geometrii,- oba wychodzą przez `commitStageWrites`; `selectDomainOutputs` nie dotyczy, to rastry.

### 1.3 Klucze rastrowe i ścieżka zapisu

`RASTER_OUTPUT_KEYS` w `pipeline/stage-outputs.ts` rośnie o `heightmap` i
`shelfIndexMap`. **Sam wpis w tej liście nie sprawia, że dane trafiają do sesji**
(rozstrzygnięcie zastrzeżenia 5):

1. worker emituje `stage-completed.data` z surowym `StageData`,
2. `worldGenerationSession.receiveStage` filtruje je przez `selectRasters`, które
   zachowuje **wyłącznie źródła obecne w `RASTER_CATALOG`**,
3. `this.layers` zasila `mapPersistence.save`,
4. `send`/`replay` pchają tylko warstwy znane w `layerRegistry.presentIn`.

Skutek: `heightmap` i `shelfIndexMap` bez wpisu w katalogu **nie są zapisywane ani
renderowane** — zostają tylko w `MapState` danego przebiegu. Dlatego:

- wpis w `LAYER_CATALOG` jest częścią kontraktu etapu (zadanie 1), a nie tylko
  zadania 4; `shelfIndexMap` może nie mieć warstwy, więc jego zapis wymaga
  własnego śladu w sesji (dodać do `selectRasters` albo trzymać jako pole `MapState`
  świadomie bez persystencji — decyzja niżej),
- **decyzja**: jeśli `shelfIdMap` ma przetrwać restart, musi mieć warstwę lub
  jawny zapis; inaczej traktujemy go jak dane jednego przebiegu i odtwarzamy go
  po wygenerowaniu. Rekomendacja: warstwa diagnostyczna szelfu (`shelf`), bo
  koszt jest zerowy, a `LandOceanStage` i tak potrzebuje danych w `MapState`,
- `hasCurrentRasterSources(data)` zwraca `true`, gdy w zapisie **nie ma** kluczy
  spoza katalogu — nie wymaga nowych kluczy. Zdanie z poprzedniej wersji planu
  („odrzuca snapshoty bez heightmapy po dodaniu warstwy") było nieprawdziwe;
  starszy zapis bez nowej warstwy przechodzi kontrolę i po prostu nie ma tej
  warstwy. `hasCurrentRasterSources` trzeba **rozszerzyć o wymagane dane etapu**
  (np. brak `heightmap` przy istniejącym `structureZones` oznacza zapis do
  przebudowy), inaczej selektywna regeneracja uzna heightmapę za czystą.

### 1.4 Definicje etapu i fabryka

`stage-definitions.ts`:

```ts
export const HEIGHTMAP_STAGE = {
  id: 'heightmap',
  name: 'Heightmap generation',
  configKeys: [
    'world.seed', 'world.shape', 'world.dimensions',
    'noise', 'landmasses', 'structureCharacter', 'heightmap',
  ],
} as const satisfies DeclaredStage;
```

Dopisany do `PIPELINE_STAGES` po `STRUCTURE_CHARACTER_STAGE`. Kolejność na liście
jest prezentacyjna (zakładki, warstwy), wykonanie i tak wynika z grafu odczytów.

`pipeline-factory.ts`: `heightmap: () => new HeightmapStage()` w `STAGE_FACTORIES`.

`MAP_CONFIG_KEYS` w `stage-definitions.ts` rośnie o `'heightmap'` (lista jest
zamknięta i walidowana w `pipeline-factory` przez `knownConfigKeys`).

`assertStageOutput` w `pipeline/stage.ts` zna tylko `'uint8' | 'float32'`;
`Int16Array` (`shelfIndexMap`) wymaga rozszerzenia tego kontraktu.

`selective-regeneration.test.ts` i `regeneration.test.ts` mają zaszyty oczekiwany
zestaw `dirtyStageIds`; dołożenie etapu **zmienia te oczekiwania** (dopisanie
`'heightmap'`). Trzeba je zaktualizować w tym samym commicie.

### 1.5 Budżet pamięci (rozstrzygnięcie zastrzeżenia 6)

`BYTES_PER_SAMPLE = 6` (mask 1 + noise 4 + region 1) zasila `SAMPLE_BUDGET` i
`summarizeWorldGrid`. Nowe rastry dodają:

- `heightmap` — `Float32Array`, 4 B na komórkę,
- `shelfIndexMap` — `Int16Array`, 2 B na komórkę,

razem **+6 B na komórkę**, czyli podwojenie obecnego szacunku. Do zmiany:
`BYTES_PER_SAMPLE` (12), `SAMPLE_BUDGET` i komunikat o koszcie siatki w
formularzu świata (`grid-summary-field`). Wartość jest szacunkiem dla UI i
walidacji, więc może zostać jednym „worst case" zamiast liczenia per etap.

## Fizyka i skala

- `landmassSize` rośnie z `sizeMeters` (`widthMeters`/`heightMeters` świata).
  Amplitudy terenu muszą rosnąć razem z rozmiarem świata, inaczej duży świat
  wychodzi płaski: `landAmplitude = f(worldSize, relief)`.
- Do wyliczenia: `baseLandMeters` (wysokość typowego lądu) i
  `peakAmplitudeMeters` (dodatek górzysty). Proponowany start:
  `baseLandMeters = clamp(worldSize * 0.004, 20, 200)`,
  `peakAmplitudeMeters = relief * clamp(worldSize * 0.02, 100, 1500)`.
  Wartości w jednej stałej tabeli w `defaults.ts`, nie rozsiane po pętli.
- Ocean: `heightmap = -OCEAN_DEPTH_METERS` (`100`) poza szelfem, przejście do
  `-shelf.targetDepth` w paśmie szelfu.

## Pole wysokości jako przekrój (rozstrzygnięcie zastrzeżeń 1 i 2)

Sam `insideFactor` (wysoko na osi, nisko na brzegu) wymusiłby jeden układ i nie
wyraził ani niskiego grzbietu otoczonego wyższymi obrzeżami, ani odcinków
wybrzeża o różnym charakterze. Dlatego wysokość liczymy jako **przekrój**, a nie
jeden spadek.

### Zapytanie punkt–korytarz

Potrzebujemy trzech liczb, których dziś żadna funkcja nie zwraca razem:

- odległość od najbliższej osi (`distance`),
- lokalny promień wpływu (`radius`),
- identyfikator najbliższej struktury (`structureId`).

`segmentsDistance` mierzy odstęp dwóch list segmentów i nie nadaje się do tego.
`structureSegments` + lokalne liczenie najbliższego punktu już istnieje w
`zone-influence.ts` (`nearestOnSegments`) i w `mask-sampler.ts`
(`insideWorldShare` liczy to samo po swojemu na potrzeby share'u) — dwa razy.
Dodajemy **jedno** współdzielone zapytanie w warstwie przestrzennej:

```ts
// src/utils/map-generator/stages/landmass/influence.ts
export interface StructureHit {
  readonly structureId: string;
  readonly distance: number;  // odległość od najbliższego odcinka osi
  readonly radius: number;    // promień wpływu w tym punkcie
  readonly along: number;     // 0..1 pozycja wzdłuż osi (dla przekroju, patrz niżej)
}

/** Najbliższy punkt każdej osi; iteruje prefiltrowane segmenty po bounds. */
export function nearestStructure(entries, point): StructureHit | undefined
```

- wejście: rekordy struktur z segmentami i bounds (prefiltrowane raz na strukturę),
- pętla po komórkach używa `bounds` do pominięcia struktur daleko od punktu,
- funkcja zwraca `undefined`, gdy punkt leży poza wszystkimi korytarzami —
  a wtedy liczy się tylko szelf i ocean,
- bez alokacji na komórkę: rekordy struktur powstają raz (przebieg A), zapytanie
  czyta je i zwraca prymitywy. `zone-influence.ts` przeszedł na wspólne
  `nearestOnSegment`, żeby nie trzymać drugiej projekcji punkt–odcinek.
  `insideWorldShare` **zostaje** na własnych próbkach wzdłuż segmentu: mierzy
  pokrycie korridoru normalnymi, a nie najbliższy punkt, więc to inne zapytanie
  (korekta wcześniejszej zapowiedzi migracji).

### Przekrój: wysokość z profilu strefy, nie z odległości

Wysokość w poprzek struktury steruje **profil strefy**, a odległość od osi
wyznacza tylko pozycję w przekroju:

1. `normalized = clamp01(distance / radius)` — 0 na osi, 1 na krawędzi wpływu,
2. `crossSection(t, profile)` — funkcja przekroju zależna od strefy:
   - `plains` — płaski lub lekko wypukły (elevation dominuje),
   - `hills` — łagodne wybrzuszenie, `hillStrength` steruje amplitudą,
   - `mountains` — szczyt przy osi, `mountainStrength` steruje wysokością
     i stromością zbocza,
   - `plateauStrength` — wypłaszczenie górnej części przekroju (spłaszczony szczyt),
   - `rim` z charakterem `hills`/`mountains` daje **odwrócony** przekrój: nisko
     na osi, wyżej przy krawędzi. To realizuje „niski grzbiet otoczony wyższymi
     obrzeżami" i jest wyborem layoutu, nie skutkiem kolejności stref.
3. `elevation = baseLand + peakAmplitude * crossSection`,
4. `roughness` i `erosionStrength` modulują szum i zaokrąglenie zboczy,
5. strefy `chain`/`spine`/`rim` działają tylko na swoich odcinkach — przerwa w
   `rim` zostawia fragment brzegu bez pasa, co jest wymagane w §4.1.

To wymaga, żeby `createZoneSampler.profile` zwracał profil punktu (już zwraca),
a `influence` mówił, która strefa dominuje — bez tego przekrój nie wie, czy
odwrócić zbocze. Test wariantów przekroju jest częścią zadania 2, nie strojenia.

## Szum (rozstrzygnięcie zastrzeżenia 4)

`noiseMap` to **jedna próbka na komórkę** (suma oktaw `NoiseStage`), więc „dwa
odczyty tego samego rastra" dają ten sam wzór, a nie dwie skale. Konkretny plan:

- **Drobrny szum wybrzeża**: odczyt `noiseMap` w bieżącej komórce, amplituda w
  metrach `noiseAmplitude(relief, worldSize)`; steruje wcięciami brzegu.
- **Duże wypaczenie domeny**: nie drugi odczyt, tylko **próbkowanie tego samego
  rastra w przesuniętej i przeskalowanej współrzędnej** (dziedzina `warpedPoint`
  liczona z `featureScale`). To jest legalne, dopóki jest jednym jawnym wzorem,
  a nie „drugim generatorem": `sample = noiseMap[cell(warped)]`.
- **`featureScale`**: im większe, tym większy krok wypaczenia (rozległe pasma),
  mniejsze — drobne zakłócenia. Ma mierzalny wpływ na rozmiar form; test na to
  należy do zadania 2.
- **Ograniczenie**: jeśli okaże się, że jeden raster nie daje potrzebnych pasm,
  **nie dokładamy drugiego generatora w tym etapie** — czekamy na `StageNoise`
  (#356) i wtedy zmieniamy kontrakt źródła szumu (osobny strumień per etap).
  Wtedy `featureScale` mapuje się na częstotliwość tego strumienia, a nie na
  przesunięcie próbki.

## Algorytm etapu

Jedna pętla po komórkach `worldMask`, przebieg przygotowawczy raz na strukturę,
żadnych alokacji na komórkę.

### Przebieg A — rekordy struktur (raz na strukturę)

Dla każdej struktury:

1. `structureBounds` / `structureExtent` z `influence.ts` (już są) — do prefiltrу
   w pętli,
2. `structureSegments` i `structurePaths`,
3. `createZoneSampler(structure)` — port stref,
4. indeks szelfu tej struktury z `layout.shelves`.

Rekord jest płaski (bez `Map` na wierzchu), bo pętla odpytuje go o każdą komórkę.

### Przebieg B — pole wysokości (główna pętla)

Dla każdej komórki poza maską: `heightmap = 0`, `shelfIndexMap = -1`.
Dla każdej komórki w masce:

1. `space.cellToNormalized(x, y)`,
2. `nearestStructure(entries, point)` — distance, radius, id (patrz „Przekrój"),
3. jeśli trafienie: `sampler.influence(...)` daje pozycję w przekroju, a
   `crossSection(t, profile)` — wysokość lądu; profil z `sampler.profile`,
4. szum wg sekcji „Szum",
5. jeśli punkt jest poza korytarzem, ale w paśmie szelfu struktury: interpoluj
   dno od `-shelf.targetDepth` do `-OCEAN_DEPTH_METERS` po `shelf.falloff` i
   zapisz indeks szelfu,
6. poza szelfem: `heightmap = -OCEAN_DEPTH_METERS`, `shelfIndexMap = -1`,
7. `heightmap[index] = ...`.

Zmiana `relief` i `featureScale` nie dotyka `worldMask`, `noiseMap` ani stref —
dlatego selekcja rekompiluje tylko ten etap.

### Wydajność

- brak `Math.hypot` w pętli — `planarDistance` albo odległości z `structureSegments`,
- brak tworzenia obiektów na komórkę,
- anulowanie przez `signal.aborted` co rząd (jak `NoiseStage`),
- raport postępu co rząd (`report((y + 1) / sampleHeight)`).

## Walidacja i statystyki

`validate(state, config)`:

- `worldMask` i `noiseMap` mają poprawny rozmiar,
- `landmassLayout` i `structureZones` istnieją (przez `isLandmassLayout`, `isStructureZones`),
- `heightmap` i `shelfIndexMap` mają `sampleWidth * sampleHeight`,
- w komórkach maski wszystkie wysokości są skończone (`Number.isFinite`);
  komórki poza maską są pomijane, bo i tak mają datum `0`.

`summarize`:

- `samples`, `min`, `max`, `mean`, `stdDev` (wzór jak w `NoiseStage`),
- `landShare` — udział komórek `> 0` w masce (bez cięcia poziomem morza),
- `bytes` = `heightmap.byteLength + shelfIndexMap.byteLength`.

`validateConfig`: zakresy `relief` (0..1) i `featureScale` (0..1); `shelfFalloff`
odpada razem z duplikatem (§1.1), a `OCEAN_DEPTH_METERS` jest stałą, więc nie ma
czego walidować. Komunikat `RangeError` w stylu `StructureCharacterStage`.

## Mapa zadań (kolejność i zależności)

| # | Zadanie | Zależy od | Zakres |
|---|---|---|---|
| 1 | Kontrakt heightmapy (#57, cz. 1) | — | `HeightmapConfig`, datum i wartość poza maską, `targetDepth` w metrach, pola `MapState`, klucze rastrowe, `int16` w `assertStageOutput`, `heightmap` w `MAP_CONFIG_KEYS`, definicja etapu, fabryka, budżet pamięci, aktualizacja testów selekcji |
| 2 | Etap wysokości — ląd (#57, cz. 2) | 1 | wspólne zapytanie punkt–korytarz, przekrój z profilu, strefy przez port, szum, walidacja, statystyki |
| 3 | Szelf i batymetria (#57, cz. 3) | 2 | pasmo szelfu, `shelfIndexMap`, `OCEAN_DEPTH_METERS`, `shelf.falloff`, przejścia |
| 4 | Warstwa podglądu heightmapy (#353) | 1, 3 | wpis w `LAYER_CATALOG` z paletą hipsometryczną, readout w metrach, testy |
| 5 | Formularz heightmapy (#418) | 3 | `heightmap-form-store`, sekcja ustawień, `generation-config`, kontrolki szelfu, testy |
| 6 | Weryfikacja i strojenie (#359) | 4, 5 | zestaw kształtów i seedów, przekroje, spójność z warstwami, docelowe amplitudy, docs i roadmapa |

Zadania 4 i 5 można robić równolegle po 3.

### Zadanie 1 — kontrakt (szczegóły)

- `src/utils/map-generator/types.ts`: `HeightmapConfig` (bez `shelfFalloff`) +
  pola `MapState`; `ShelfDefinition.targetDepth` w metrach,
- `shelf.targetDepth` 0..1 → metry: `shelves.ts`, `ShelfDefinition`, kopia w
  `LandmassLayoutStage`, testy szelfu; domyślnie `60` m,
- `src/utils/map-generator/stages/heightmap/`: `defaults.ts`, `index.ts`,
  `heightmap-check.ts` (guardy danych) — `stage.ts` **nie wchodzi do fabryki**
  w tym punkcie; patrz „Wdrożenie etapu jako całość funkcjonalnej",
- `stage-definitions.ts`: `HEIGHTMAP_STAGE` + `heightmap` w `MAP_CONFIG_KEYS`,
- `pipeline/stage.ts`: `assertStageOutput` obsługuje `Int16Array`,
- `stage-outputs.ts`: `RASTER_OUTPUT_KEYS` o `heightmap` i `shelfIndexMap`,
- `world-dimensions.ts`: `BYTES_PER_SAMPLE` 6 → 12 i `SAMPLE_BUDGET`; komunikat
  w `grid-summary-field`,
- `selective-regeneration.test.ts` i `components/world-generator/lib/regeneration.test.ts`:
  dopisać `'heightmap'` do oczekiwań po dołożeniu etapu (punkt 2/3),
- testy: `heightmap-check.test.ts` (guardy), testy konwersji `targetDepth`.

### Zadanie 2 — ląd (szczegóły)

- `influence.ts`: wspólne `nearestOnSegment` i `nearestStructure` (distance,
  radius, id); `zone-influence.ts` przechodzi na wspólny nearest, a
  `insideWorldShare` zostaje na własnych próbkach wzdłuż segmentu (inne zapytanie),
- `fields.ts`: `crossSection(t, profile, inverted)` z `isInvertedGeometry`
  po stronie stref, `noiseAt(warpedPoint, featureScale)`,
- `stage.ts`: pętla, rekordy struktur (segments + bounds + sampler + shelf index),
  prefiltr po bounds,
- testy przekroju (wymagane, nie „na końcu"):
  - wysoka oś (mountains na `spine`),
  - **niska oś z wyższymi obrzeżami** (plains na osi, hills/mountains na `rim`),
  - fragmentaryczny `rim` — pas kończy się w połowie ramienia i wraca dalej,
  - kilka stref wzdłuż jednej ścieżki z ciągłym przejściem wysokości,
- testy: determinizm seeda, wysokości skończone, maska poza światem = `0` / `-1`,
- test wydajnościowy w `stage.bench.ts` (jak w landmassach), tylko czas, bez progu.

### Zadanie 3 — szelf (szczegóły)

- pasmo szelfu liczone z `layout.shelves` i `shelf.width`, bez drugiej geometrii:
  zasięg korytarza + `width` wyznacza granicę szelfu,
- `shelfIndexMap` wypełniane tylko wtedy, gdy punkt należy do szelfu; przy
  styku szelfów pierwszy w `layout.shelves` wygrywa,
- wysokość dna: `-targetDepth` na wewnętrznej krawędzi → `-OCEAN_DEPTH_METERS` na
  zewnętrznej, kształt po `shelf.falloff`, krawędź zaburzona `shelf.irregularity`,
- testy: ciągłość wysokości przez ląd → szelf → ocean (brak skoków większych niż
  tolerancja), głębokość oceanu poza szelfem, indeksy w zakresie i `-1` poza,
  wspólny szelf archipelagu ma jeden indeks.

### Zadanie 4 — warstwa (#353) (szczegóły)

- `catalog.ts`: nowy wpis `heightmap` (`kind: 'raster'`, `dataType: 'float32'`,
  `clipTo: 'world-shape'`, paleta hipsometryczna) **oraz** wpis diagnostyczny
  `shelf` dla `shelfIndexMap` (paleta dyskretna, `skipValue: -1`), jeśli
  zdecydujemy, że indeksy mają przetrwać restart (patrz §1.3),
- paleta w `palettes/palettes.ts` jako `HEIGHTMAP_STOPS` (głębia → nizina →
  wzgórza → góry) i eksport przez `map-layers/index.ts`,
- readout: nowy case w `describeValue` (albo osobna funkcja) pokazujący
  wysokość w metrach przez `formatMeters`; bez udawania klasyfikacji z #58,
- testy: katalog zawiera wpis, paleta rośnie monotonicznie, readout formatuje metry.

### Zadanie 5 — formularz (#418) (szczegóły)

- `stores/form/heightmap-form-store.ts` wg wzoru `structure-character-form-store.ts`
  (`DEFAULT_HEIGHTMAP_CONFIG`, settery per pole),
- `components/settings-panel/forms/heightmap-form/` + nowa zakładka w
  `settings-panel.tsx` (kolejność z `PIPELINE_STAGES`),
- **kontrolki szelfu** (`width`, `targetDepth`, `falloff`, `irregularity`) w tej
  samej sekcji, ale zapisywane do `landmasses.shelf`, bo tam należy własność;
  #418 tak przewiduje. Etykieta musi mówić, że to szelf, nie heightmapa,
- `components/world-generator/lib/generation-config.ts`: `heightmap` w `MapConfig`
  i w `GenerationConfigInput`,
- `use-world-generation.ts`: czyta `heightmap` ze store'a,
- testy: pola, commit do store'a, `generation-config` przekazuje wycinek.

### Wdrożenie etapu jako całość funkcjonalnej (rozstrzygnięcie zastrzeżenia 8)

Zarejestrowanie etapu zwracającego zera nadałoby mu prawidłowe wyjścia: walidacja
by przeszła, sesja zapisałaby „wysokości", a selektywna regeneracja uznałaby je
za aktualne. Dlatego:

- typy, `defaults.ts`, guardy i wspólne zapytanie przestrzenne można przygotować
  osobno (część zadania 1 i 2),
- etap wchodzi do `STAGE_FACTORIES` / `PIPELINE_STAGES` dopiero razem z realną
  wysokością **i** szelfem (koniec zadania 3), w jednym commicie,
- do tego czasu nic nie pokazuje heightmapy w UI, więc pusty etap nie ma jak
  trafić do zapisu.

### Zadanie 6 — weryfikacja (#359) (szczegóły)

Zestaw, na którym oceniamy wynik (roadmap §4.1–4.6):

- wyspa okrągła, długa wygięta, rozgałęziona, atol,
- struktura jednolita, dwustrefowa i trójstrefowa,
- porównanie profilu w strefach: profil zmienia się wzdłuż ścieżki, `rim`
  zostawia przerwę, `chain` nie łączy ramion,
- spójność: `heightmap` zgodna co do znaku z przyszłym `LandOceanStage`,
- statystyki: udział struktur jednolitych i wielostrefowych na zestawie seedów,
- docs: roadmapa §4.5/§4.6 → `[działa]`, `island-character-redesign.md` i
  `character-zones-analysis.md` §6 — dopisać, że heightmapa korzysta z portu stref,
- `pnpm run check:all` raz, na końcu.

## Ryzyka i decyzje do podjęcia

Wszystkie punkty z sekcji „Zastrzeżenia po przeglądzie" są już wcielone do
kontraktów i zadań powyżej. Zostają do potwierdzenia liczby:

1. **Amplitudy w metrach.** Bez decyzji o `baseLandMeters`/`peakAmplitudeMeters`
   duży świat wyjdzie płaski. Liczby w sekcji „Fizyka i skala" to punkt startowy,
   do potwierdzenia; struktura przekroju jest już rozstrzygnięta (nie „naprawiamy
   geometry w zadaniu 6").
2. **`targetDepth` w metrach.** Domyślnie `60` m przy dnie na `-100` m; zostaje
   jedna liczba i jedna rola, bez przeliczania z procentów w UI.
3. **Persystencja `shelfIndexMap`.** Warstwa diagnostyczna (rekomendacja) czy
   dane jednego przebiegu i odtworzenie po generowaniu. Wpływa na zadanie 4.
4. **Szelf a struktura bez szelfu.** Zawsze jest szelf (jeden na strukturę lub
   grupę), więc brak szelfu to błąd danych, nie przypadek do obsługi.
5. **Wymieszanie z szumem.** Ile brzegu bierze przekrój, a ile szum — strojenie
   w zadaniu 6 na liczbach, nie na kontrakcie.

## Poza zakresem

- cięcie poziomem morza i klasyfikacja wysp (`LandOceanStage`, #58),
- woda, rzeki i jeziora (`HydrologyStage`, #59),
- biom (`BiomeStage`, #60) i formacje (`TerrainFeaturesStage`, #61),
- cięcie szumu osobnym strumieniem dla etapu (`StageNoise`, #356) — na razie
  wspólny `noiseMap`, mechanizm przygotuje #356.

## Zastrzeżenia po przeglądzie planu

Poniższe punkty korygują wcześniejsze założenia. Wymagają rozstrzygnięcia przed
implementacją, a nie dopiero podczas strojenia wyniku w zadaniu 6.

1. **Przekrój struktury jest zbyt jednolity.** Sam `insideFactor` malejący od osi
   do brzegu wymusi wysoką oś i niskie obrzeża. Nie wyrazi niskiego grzbietu
   otoczonego wyżynami ani odcinków wybrzeża o różnym charakterze. Profil strefy
   musi wpływać na rozkład wysokości w poprzek struktury; `rim` ma działać tylko
   na swoich odcinkach, z przerwami wynikającymi z geometrii strefy.
2. **Brakuje zapytania punkt–korytarz.** `segmentsDistance` mierzy odstęp między
   dwiema listami segmentów. Nie zwraca najbliższego punktu osi, lokalnego
   promienia i odległości potrzebnych w kroku B. Obecne `cellToNormalized` i
   `createZoneSampler.profile` tworzą obiekty podczas próbkowania. Obietnica
   „bez alokacji na komórkę” nie zgadza się więc z opisanym API.
3. **Jednostki i własność parametrów szelfu są niejasne.** `targetDepth` ma obecnie
   zakres 0..1, a `oceanDepthMeters` jest w metrach. `ShelfDefinition.falloff`
   oraz proponowany `HeightmapConfig.shelfFalloff` opisują zbliżony efekt.
   Plan nie określa też użycia `irregularity`, zachowania wspólnego szelfu kilku
   struktur ani ciągłego przejścia od lądu przez płytkie dno do oceanu.
4. **Dwa odczyty `noiseMap` nie dają automatycznie dwóch skal.** Raster zawiera
   już sumę oktaw w jednej próbce na komórkę. Nie wiadomo, gdzie i jak próbkujemy
   go ponownie, jak uzyskujemy duże wypaczenie domeny oraz jak działa
   `featureScale`. Bez definicji szum może tylko dodać drobne zakłócenia albo
   powtórzyć ten sam wzór w obu efektach.
5. **Zapis rastrów opisano błędnie.** `selectRasters` zachowuje wyłącznie źródła
   obecne w `RASTER_CATALOG`. Sam wpis w `RASTER_OUTPUT_KEYS` nie sprawi, że
   `heightmap` i `shelfIndexMap` trafią do zapisywanej sesji; zadania 1–3
   potrzebują rozwiązania tego kontraktu, zanim regeneracja zacznie używać tych
   danych. `hasCurrentRasterSources` odrzuca nieznane klucze, lecz nie wymaga
   nowych kluczy w starym zapisie. Zdanie z §1.3 o odrzucaniu snapshotów bez
   nowej heightmapy po dodaniu warstwy jest nieprawdziwe.
6. **Budżet pamięci wymaga aktualizacji.** `BYTES_PER_SAMPLE = 6` szacuje obecne
   rastry. `Float32Array` wysokości i `Int16Array` indeksów dodają razem 6
   bajtów na komórkę, zanim powstaną kolejne warstwy. Trzeba zaktualizować
   budżet, walidację rozmiaru siatki i informację o koszcie w formularzu.
7. **Kontrakt wyjścia i UI są niedomknięte.** `assertStageOutput` obsługuje dziś
   `uint8` i `float32`, ale nie `int16`. Poza maską świata plan dopuszcza `NaN`
   albo `0`, choć równocześnie wymaga skończonych wysokości. Zgłoszenie #418
   przewiduje kontrolki szelfu w formularzu etapu konsumującego szelf; zadanie 5
   wymienia tylko parametry `HeightmapConfig`.
8. **Pusty etap z zadania 1 wygląda jak poprawny wynik.** Rejestracja etapu
   zwracającego zera nada mu prawidłowe wyjścia i może zapisać je jako mapę.
   Brak podglądu nie zabezpiecza pipeline ani późniejszej regeneracji.

## Proponowana korekta wdrożenia

Wszystkie punkty poniżej są już wcielone do kontraktów i zadań powyżej; sekcja
zostaje jako źródło i uzasadnienie, nie jako lista do zrobienia.

1. **Domknąć kontrakt przed kodem rastra.** Ustalić datum wysokości (`0 m`),
   skończoną wartość poza maską i sposób jej ignorowania przez statystyki.
   Określić przeliczenie `targetDepth` na ujemne metry oraz jedną rolę dla
   każdego z parametrów `falloff`. Zapisać regułę wyboru indeksu przy
   nakładających się szelfach i relację `shelfIndexMap` do przyszłego
   `shelfIdMap` z roadmapy §4.4. Uzupełnić `MAP_CONFIG_KEYS` i walidację `int16`.
   → wcielone: §1.1 (jednostki), §1.1a (datum, poza maską, wybór szelfu),
   §1.4 (klucze, `int16`), §1.5 (budżet), zadanie 5 (kontrolki szelfu).
2. **Zdefiniować pole wysokości jako ciągły przekrój.** Wspólne zapytanie
   przestrzenne powinno zwracać odległość od najbliższej osi, lokalny promień
   i identyfikator struktury. Znormalizowana odległość od osi określi pozycję
   w przekroju, a profil strefy przez `createZoneSampler` określi wysokość osi,
   zboczy, obrzeża i lokalnych form. Potrzebny jest test wariantów: wysoka oś,
   niska oś z wyższymi brzegami, fragmentaryczny `rim`, kilka stref wzdłuż osi.
   Złączenie lądu, szelfu i dna oceanu ma zachować ciągłość wysokości.
   → wcielone: „Zapytanie punkt–korytarz" i „Przekrój", zadanie 2.
3. **Sprecyzować szum przed zadaniem 2.** Opisać współrzędne i interpolację
   próbek `noiseMap`, amplitudy w metrach, skalę zaburzenia brzegu oraz sposób
   uzyskania dużego wypaczenia bez niejawnego drugiego generatora. Jeśli jeden
   raster nie daje potrzebnych pasm, zmienić kontrakt źródła szumu zamiast
   nazywać dwie próbki niezależnymi skalami. `featureScale` musi mieć mierzalny
   wpływ na rozmiar form.
   → wcielone: sekcja „Szum", zadanie 2 (test wpływu `featureScale`).
4. **Wdrożyć etap jako całość funkcjonalną.** Można przygotować typy i funkcje
   pomocnicze osobno, lecz etap dodać do fabryki dopiero wtedy, gdy generuje
   rzeczywistą wysokość oraz szelf. Jednocześnie zapewnić zachowanie obu rastrów
   w sesji i przy selektywnej regeneracji. Skorygować logikę zgodności zapisanych
   map na podstawie wymaganych danych etapu, nie samej listy kluczy katalogu.
   → wcielone: „Wdrożenie etapu jako całość funkcjonalnej", §1.3, zadanie 1.
5. **Dopiero potem podgląd i formularz.** Warstwa #353 pokazuje surowe wysokości
   w metrach, bez udawania klasyfikacji z #58. Formularz #418 udostępnia także
   parametry szelfu, choć nadal należą do konfiguracji landmassów. Oba zadania
   można wykonać równolegle po działającym etapie.
   → wcielone: zadania 4 i 5 (zależne od 3).
6. **Weryfikować wynik na przekrojach i mapach.** Oprócz determinizmu sprawdzić
   ciągłość na brzegu korytarza i szelfu, zmienność brzegu na różnych odcinkach,
   wspólne szelfy archipelagów, zakresy indeksów, pamięć oraz czas dla dużej
   siatki. Strojenie amplitud z zadania 6 powinno zmieniać liczby, nie naprawiać
   nieokreślonej geometrii lub kontraktu danych.
   → wcielone: zadanie 3 (ciągłość, wspólny szelf) i zadanie 6 (przekroje,
   pamięć, czas).

## Przegląd zmian tej wersji

- usunięty `HeightmapConfig.shelfFalloff` (duplikat `shelf.falloff`),
- `ShelfDefinition.targetDepth` przenosi się na metry (domyślnie `60`),
- dopisane „Zapytanie punkt–korytarz" i „Przekrój" w miejsce `insideFactor`,
- szum opisany konkretnie (jedna próbka + wypaczenie domeny), bez drugiego
  „niezależnego generatora",
- zapis rastrów opisany poprawnie: katalog jest środkiem persystencji,
  `selectRasters` filtruje po `RASTER_CATALOG`, `hasCurrentRasterSources` do
  rozszerzenia o wymagane dane etapu,
- `assertStageOutput` obsługuje `int16`, `MAP_CONFIG_KEYS` rośnie o `heightmap`,
- etap wchodzi do fabryki dopiero z realną wysokością i szelfem (zadanie 3),
- budżet pamięci `6 → 12` B/komórkę jako część zadania 1.
