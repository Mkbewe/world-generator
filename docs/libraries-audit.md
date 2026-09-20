# Audyt bibliotek: generator i renderer

Dokument sprawdza, które ręcznie napisane fragmenty generatora i renderera
można zastąpić gotowymi paczkami, ile kodu to realnie skraca i które paczki są
jakościowo bezpieczne. Stan na 20.09.2026.

Zakres: `src/utils/map-generator` (~1 700 linii bez testów),
`src/utils/map-renderer` (~2 700), `src/utils/map-layers` (~300) oraz
`src/components/map-preview/hooks/use-map-readout.ts` (~200).

Metoda: przegląd kodu, oszacowanie zysku LOC (brutto, przed odjęciem kodu
integracji) i weryfikacja wersji, licencji oraz daty ostatniego wydania
w npm.

## Wniosek

- Nie istnieje biblioteka „generator + renderer fantasy map". Gatunek dostarcza
  albo aplikacje (Azgaar — MIT, ale monolityczna; Watabou — zamknięte), albo
  klocki: szum, Voronoi/Delaunay, marching squares, boolean ops, spatial index,
  renderer GPU.
- Własny pipeline, katalog warstw, scheduling renderu, klasyfikacja
  makroregionów i model widoku to logika produktu. Nie ma ich czym zastąpić.
- Realny zysk ze wszystkich sensownych paczek to ~150–250 linii z ~4 700, czyli
  około 5%. Największa wartość paczek to nie LOC, tylko dojrzałe algorytmy,
  których jeszcze nie mamy (okresowy szum, priority queue, operacje na
  poligonach, wektoryzacja konturów).
- Renderera najbardziej nie da się skrócić paczkami, bo jego objętość to
  pętle pikseli, progresywne kafle, double buffer i cache — a to albo zostaje
  własne, albo wymaga przepisania na wektory/GPU (patrz sekcja „Renderer").

## Kandydaci

| Obszar | Pliki | Paczka | Zysk LOC | Kiedy |
| --- | --- | --- | --- | --- |
| Gesty pan/zoom/tap | `use-map-readout.ts` | `@use-gesture/react` | −40…−60, dochodzi pinch | przy pracach nad dotykiem |
| Obrysy z rastra | `world-boundary-renderer.ts`, `smooth-layer-painter.ts` | `d3-contour` | ~0 netto teraz, więcej przy wektorach | po #319 |
| Ramki palet | `palettes.ts` | `chroma-js` | −40…−50 | opcjonalnie, niski priorytet |
| Szum: oktawy, warp, okresowość | `noise-stage.ts`, `macro-region-stage.ts` | `fastnoise-lite` | −30 teraz, wartość przyszła | przed sekcją 7 roadmapy |
| Worker RPC | `worker/*`, `run-generation.ts` | `comlink` | −40…−60 | opcjonalnie |
| Testy gładkości #319 | testy renderera | `pixelmatch` (dev) | 0 (testy) | teraz, jeśli potrzeba |

### Gesty — `@use-gesture/react`

Zastępuje ręczny stan gestów w `use-map-readout.ts` (PointerGesture,
`TAP_MOVE_TOLERANCE_PX`, `setPointerCapture`, obsługę cancel; ~70–90 linii).
Zostaje odczyt pod kursorem (próbkowanie, przypinanie), bo to logika produktu.
Paczka pmndrs, MIT, wersja 10.3.1 (III 2024), aktywnie używana w ekosystemie
Reacta. Dodatkowo daje pinch-to-zoom na dotyku, którego dziś nie ma.

### Obrysy — `d3-contour`

`d3-contour` to marching squares z ekosystemu d3 (ISC, 4.0.2, stabilne od
2023; typy w `@types/d3-contour` 3.0.6). Zamienia raster na poligony, więc:

- obrys świata może być tym samym konturem co wypełnienie (znika problem
  rozjazdu zielonej linii i kolorowej krawędzi z #319),
- kontury nadają się do eksportu, hit-testingu i dalszych etapów (linia
  brzegowa, wyspy),
- rysowanie poligonu korzysta z wbudowanego AA canvasa zamiast ręcznego
  supersamplingu.

Cena: kontur liczony z rastra jest tak dokładny jak raster, a dzisiejszy
`SmoothLayerPainter` próbkuje ciągły klasyfikator w rozdzielczości ekranu.
Dlatego to kandydat po #319 i przy okazji wektoryzacji, nie zamiennik 1:1.
Zysk LOC netto teraz byłby bliski zeru (~110 linii paintera znika, dochodzi
obsługa geometrii).

### Palety — `chroma-js`

Interpolacja ramp i walidacja kolorów z `palettes.ts` (166 linii) to ~60 linii,
które `chroma-js` (BSD/Apache, 3.2.0, XI 2025) pokrywa z nawiązką, ale trzeba
utrzymać deterministyczne, zaokrąglone RGB i szybką ścieżkę szarości.
Niski priorytet — obecny kod jest prosty i przetestowany.

### Szum — `fastnoise-lite`

`simplex-noise` już jest paczką; ręcznie zostają pętle oktaw
(`noise-stage.ts:55-63`, `macro-region-stage.ts:259-284`, ~35 linii) i brakuje
domain warp oraz szumu okresowego. `fastnoise-lite` (MIT, 1.1.1, TS natywnie)
daje FBm z persistence/lacunarity, warping i warianty okresowe — to wprost
potrzeby sekcji 7 roadmapy (cylinder, zawijanie). Uwaga: zmiana silnika zmienia
wyniki generacji dla danego seeda; snapshoty żyją w pamięci, więc dotknie to
głównie testów etapów.

### Worker — `comlink`

Protokół wiadomości workera (`worker/*`, ~130 linii) mógłby przejść na
`comlink` (Apache-2.0, 4.4.2, XI 2024, Google). Zysk ~40–60 linii, ale obecny
protokół jest jawnie typowany i strumieniuje progres; comlink spłaszcza to do
proxy z callbackiem. Opcjonalne, nie jest to główny dług.

### Testy — `pixelmatch`

Pod kryteria akceptacji #319 (gładkość 1x/4x, brak offsetu obrysu) warto
porównywać klatki `pixelmatch` (ISC, 7.2.0) z tolerancją. Tanie i konkretne.

## Renderer: dlaczego paczki nie skrócą go mocno

Rozkład ~2 700 linii renderera (bez testów):

- warstwy i rasteryzacja: `layer/` 896,
- view i transformacja: `view/` 608 + `viewport/` 62 + `preview-targets/` 122,
- scheduling i prezentacja: `layer-presenter/` 163 + `scene/` 150,
- metryki, repository, persistence, pointer-sampling, boundary: ~260.

Trzy źródła objętości i co je realnie adresuje:

1. Pętle pikseli (`paintNearestTile`, `paintFilteredTile`,
   `SmoothLayerPainter`) — biblioteki JS ich nie zastąpią; to albo zostaje,
   albo przenosi się na GPU. Natywnym (bezpaczkowym) skrótem dla minifikacji
   byłoby wrzucenie rastra do canvasa i `drawImage` z filtrowaniem, ale jakość
   filtrów przeglądarek jest różna, a determinizm obrazu spada.
2. Progresywne kafle, double buffer, budżety pamięci i cache — to projekt
   produktu; `pixi.js`/`konva` to przepisanie całości, nie skrócenie.
3. Wektoryzacja zamiast rasteryzacji — `d3-contour` + AA canvasa usuwa ręczne
   próbkowanie, ale to re-architektura malowania, nie drop-in.

WebGL/WebGPU (`pixi.js`, `regl`) usuwa pętle pikseli i daje gładkość za darmo,
ale roadmapa (sekcja 9) słusznie odracza go do czasu pomiarów — to największa
z możliwych zmian, nie oszczędność linii.

## Co zostaje własne

- **Klasyfikacja makroregionów** (`macro-region-stage.ts`) — analityczne
  ring/band, najbliższy region i deformacja; brak odpowiednika, a Voronoi to
  inny model niż formularz pasów i pierścieni.
- **Segmenty i granice regionów** (`macro-region-sizes.ts`) — logika formularza.
- **Scheduling i kompozycja** (`layer.ts`, `layer-queue.ts`,
  `layer-presenter.ts`, `map-scene.ts`, `layer-cache.ts`, `preview-targets.ts`)
  — celowo bespoke.
- **Katalog i rejestr warstw** (`layer-registry.ts`, `catalog-layer.ts`) —
  walidacja danych, nie algorytmy.
- **`SeededRandom` + `RandomFactory`** — 61 linii; determinizm i odtwarzalność
  map, `seedrandom` nic nie daje.
- **`view-transform.ts`, `viewport.ts`, `world-dimensions.ts`** — mała,
  przetestowana matematyka; `d3-zoom` nie odwzoruje `clampHalf` (fade-in
  overscroll), więc zysk byłby ujemny po doliczeniu integracji.
- **`persistence`/`repository`** — dopóki snapshot żyje w pamięci, nie ma
  czego upraszczać.

## Kandydaci na przyszłe etapy

- Hydrologia (depression filling, flow routing): `flatqueue` 3.1.0 (ISC).
- Landmass, linie brzegowe, szelf: `polygon-clipping` 0.15.7 lub
  `martinez-polygon-clipping` 0.8.1; offset szelfu: `clipper-lib` /
  `js-angusj-clipper`.
- Lokacje, zasoby, propsy: `rbush` 4.0.1 lub `flatbush` 4.6.2.
- Hexy / siatki nieregularne: `honeycomb-grid` 4.1.5; `d3-delaunay` 6.0.4,
  jeśli pojawi się Voronoi.
- Eksport do Godota: `earcut` 3.2.3 (triangulacja), `simplify-js` 1.2.4
  (uproszczenie), `fflate` 0.8.3 (kompresja); zapis trwały: `idb-keyval`.

## Kolejność rekomendowana

1. Dokończyć #319; ewentualnie `pixelmatch` do testów akceptacyjnych.
2. `@use-gesture/react` przy okazji pracy nad gestami i dotykiem.
3. `fastnoise-lite` przed implementacją zawijania świata i domain warping
   (sekcja 7 roadmapy).
4. `d3-contour` dopiero, gdy pojawi się potrzeba wektorów (eksport, linia
   brzegowa, hit-testing), i wtedy razem z decyzją o zamianie malowania.
5. `comlink`, `chroma-js` — opcjonalnie, bez presji.

## Aneks: weryfikacja paczek

Stan npm na 20.09.2026:

| Paczka | Wersja | Licencja | Ostatnie wydanie |
| --- | --- | --- | --- |
| d3-contour | 4.0.2 | ISC | 01.2023 |
| @types/d3-contour | 3.0.6 | MIT | 08.2025 |
| @use-gesture/react | 10.3.1 | MIT | 03.2024 |
| comlink | 4.4.2 | Apache-2.0 | 11.2024 |
| fastnoise-lite | 1.1.1 | MIT | 03.2024 |
| polygon-clipping | 0.15.7 | MIT | 12.2023 |
| martinez-polygon-clipping | 0.8.1 | MIT | 12.2025 |
| chroma-js | 3.2.0 | BSD-3-Clause AND Apache-2.0 | 11.2025 |
| earcut | 3.2.3 | ISC | 07.2026 |
| flatqueue | 3.1.0 | ISC | 06.2026 |
| rbush | 4.0.1 | MIT | 08.2024 |
| flatbush | 4.6.2 | ISC | 06.2026 |
| simplify-js | 1.2.4 | BSD-2-Clause | 06.2022 |
| fflate | 0.8.3 | MIT | 07.2026 |
| pixelmatch | 7.2.0 | ISC | 04.2026 |
| d3-delaunay | 6.0.4 | ISC | 04.2023 |
| honeycomb-grid | 4.1.5 | MIT | 11.2023 |

Wszystkie paczki są permissive i mają typy TypeScript (własne albo
z DefinitelyTyped). Najstarsze wydania (`simplex-noise` już w projekcie,
`simplify-js`, `d3-delaunay`, `d3-contour`) dotyczą bibliotek stabilnych,
których API się nie zmienia — nie są porzucone.
