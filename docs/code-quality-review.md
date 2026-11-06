# Review jakości kodu — stan na 06.11.2026

> Snapshot historyczny: HEAD `74fe76c`, 167 plików testowych. Dokument nie
> opisuje aktualnego stanu `master`; służy jako lista długu i punkt odniesienia
> dla późniejszych przeglądów.

Przegląd całości `src` (34,8 tys. linii TS, 167 plików testowych na HEAD) pod
kątem jakości kodu i poprawek o niskim koszcie. Zakres: `utils/map-generator`,
`utils/map-renderer`, `utils/map-layers`, `utils/map-readout`, `components`,
`stores`, `pages`, `feature-flags`, `legacy-generator`. Nie jest to audyt
wydajności — ten wymaga osobnych pomiarów.

## Podsumowanie

Bazy są zdrowe: pipeline nie importuje UI ani renderera, niemal każdy komponent
ma test, a większość etapów ma `stage.test.ts` (poza heightmapą); stores to 11
małych spójnych jednostek. Brak `console.log`/`TODO`, ale są dwa `console.warn`
w `feature-flags-context.tsx` i jeden `eslint-disable` w legacy. Realny dług to
nie architektura, tylko:

- duplikaty wielokrotne (9× `clamp01`, 2× `createYieldToBrowser`, 3× `percent`,
  4× gramatyka geometryczna ring/band, 2× border warp, 2× flood fill,
  2× `regionBorderDistances`, 2× wrapper `region-distribution`),
- martwe API publiczne i niepodłączony konfig,
- formularzowa logika w drzewie generatora,
- kilka plików łączących kilka obowiązków naraz,
- re-render całego podglądu przy zmianie komórki pod kursorem.

## 1. Duplikaty — jedna prawda w jednym miejscu

| Duplikat | Kopie | Refactor |
| --- | --- | --- |
| `clamp01` | 9× (zweryfikowane greppem): `world-dimensions.ts:170`, `base-climate/moisture.ts:31`, `heightmap/fields.ts:19`, `relief/{compose:184,profiles:313,stamping:429,islet-relief:160}`, `forms/{placement:283,forms:434}` | jeden export w `utils/math.ts` |
| `createYieldToBrowser` | 1:1: `layer/catalog/catalog-layer.ts:16-31` vs `layer/geology/geology-yield.ts:5-20` | zostawić singleton z `geology-yield`, usunąć kopię |
| `percent` | 3×: `geology-form/lib/percent.ts:1` (kanoniczny) + `heightmap-form.tsx:17` + `region-terrain-editor.tsx:12`; dwa lokalne warianty innego kształtu: `readout.ts:423`, `timing-bar.tsx:33` | jeden helper w `components/lib/` |
| `formatDuration` | 2×, różne wyjście: `generation-progress/lib/progress-format.ts` vs `utils/format.ts` | ujednolicić lub udokumentować rozjazd |
| gramatyka ring/band | 4×: `types.ts:23-38` vs `73-88`; contain/distance `macro-region/stage.ts:219-258` vs `base-climate/sampler.ts:46-68`; walidacja w dwóch miejscach | jeden moduł `geometry.ts`: typ + contains + distance + validate |
| border warp | 2×: `macro-region/border-displacement.ts:27-53` vs `geology/partition/partition-warp.ts:40-55` — identyczny spec szumu i cel | jeden parametryzowany helper (namespace + amplituda) |
| presets geologii | 2×: `GEOLOGY_PRESETS` (index) vs hardcoded `geology-form/lib/preset-options.ts:9-14` | formularz czerpie z katalogu |
| `matchesSize` | 2×: `map-view.ts:144-146` vs `map-scene.ts:76-78` | wspólny helper |
| `regionBorderDistances` | 2×: `layer/region-preview/region-preview-raster.ts:51-63` vs `geology/partition/region-partition.ts:77-94` — dwa wrappery na ten sam `gridDistanceTransform` | wspólny helper w `grid-distance.ts` |
| flood fill (4-connectivity) | 2×: `geology/validation/partition-check.ts:64-113` vs `analysis/land-components.ts:105-134` | jeden moduł obok `grid-distance.ts` |
| projection boilerplate (`ratio → padding → project`) | 4×: `heat-zone-overlay-renderer.ts:38-48`, `moisture-overlay-renderer.ts:37-47`, `world-boundary-renderer.ts:98-116`, `preview-targets.ts:51-93` | jeden `projectWithPadding` |
| pixel → cell | `catalog-layer.ts:171,178,214,222`, `smooth-layer-painter.ts:85-161`, `region-preview-raster.ts:108,119` | jeden `cellAtPixel(projection…)` |
| Escape-to-close | `mobile-menu/hooks/use-escape-close.ts` vs linia w `use-preview-fullscreen.ts:32-49` | jeden hook `useEscapeKey` |
| region id `region-${n}` | 4×: `geology-form.tsx:37`, `heightmap-form.tsx:29`, `use-geology-selection.ts:24,35`, `geology-form/lib/region-shares.ts:12` | jeden helper pod konwencję |
| wrapper `region-distribution` | 2×: `geology-form/region-distribution/region-distribution.tsx:17-43` vs `macro-region-form/region-distribution/region-distribution.tsx:15-31` — ten sam `DistributionBar`; wersja macro już ma prop `header` | jeden wrapper z `header` |

## 2. Martwe API / niepodłączony konfig

- `traceErodedWorldBoundary` (`world-boundary-renderer.ts:16-41`) — zero użyć.
- `cellToCanvas` (`view-transform.ts:91-100`) — na HEAD tylko test; w working
  tree używa go niecommitowany `ocean-current-overlay-renderer.ts`.
- `sampleSize`, `cellCenterMeters`, `metersToNormalized` (`world-dimensions.ts:127-155`) — nieużywane w produkcji; `metersToCell`/`normalizedToMeters`/`normalizedToCell` służą tylko dla siebie i testów. Produkcja mapuje cell przez `WorldSpace`.
- `PipelineWorkerRequest` (`worker/pipeline-worker.types.ts:18`) — nieużywany alias.
- `PipelineGenerationEvent`/`PipelineGenerationResult`/`PipelineStageStatistics` (`map-generator/index.ts:42-47`) — eksportowane bez odbiorcy.
- `MapView.zoomed` (`map-view.ts:90-92`) — bez użycia; `MapView.ready`
  (`:98-101`) — tylko test.
- `MapRenderer.ready` (`renderer.ts:138-140`) — publiczne, ale poza testami
  bez odbiorcy (podobnie jak `MapView.ready`).
- `MapRenderer.size` (`renderer.ts:188-190`) — rzuca przed `start()`;
  konsumenci używają `currentSize`.
- `MapScene.isComplete/getLayers` (`map-scene.ts:315-329`) — tylko testy.
- `BaseClimateConfig.geologyCoupling` (`types.ts:118`) — odczytują go
  BaseClimate, Geology i Heightmap; pozostaje bez osobnego suwaka w formularzu.
- `BASE_CLIMATE_PRESETS`/`baseClimatePresetConfig` (`map-generator/index.ts:15-20`)
  — używane przez formularz Base Climate i generator.
- `AREA_COMPENSATION = 1` (`heightmap/forms/forms.ts:81`) — stała bez efektu;
  `signedBand` (`bands.ts:49-56`) — no-op wrapper.

## 3. Granice generatora

- `stages/macro-region/editor/boundary-model.ts` (215 linii edycji udziałów
  procentowych) i `editor/presets.ts:92-121` (kopie UI: "Rings + poles"…) są
  konsumowane wyłącznie przez formularz
  (`stores/form/macro-region-form/macro-region-form-store.ts:5-12`). Przenieść
  do `lib/` formularza; geologia już tak robi (`geology-form/lib/preset-options.ts`).
- `GeologyStage` deklaruje `reads: []`, a `region-partition.ts:32-46`
  re-rasteryzuje `worldMask`, który `world-shape` już wyprodukował (identyczna
  matematyka). `reads: ['worldMask']` usuwa pętlę i czyni kontrakt uczciwym, ale
  wymaga przeciągnięcia maski przez `buildGeologyPlan` do `region-partition` —
  sama zmiana deklaracji nie wystarczy.

## 4. Re-render storm (największy smell w UI)

- `use-map-readout.ts:238` → `setReadout` przy zmianie komórki pod kursorem
  (`refreshReadout`, `:85-94`; `trackReadout` wcześnie wychodzi dla tej samej
  komórki), a state trzyma `MapPreview` — całe poddrzewo (LayerTabs, MapCanvas,
  MapMeasure, ScaleBar, MapSidebar + sekcje) re-renderuje się przy ruchu myszki.
  Jedyny `memo` w drzewie: `BaseRegionCard`.
- `map-preview.tsx:45` liczy `navigation.toViewState` bez `useMemo` przy każdym
  renderze (alokacje set/map/tablic).
- `world-generator.tsx:14-41` przekazuje globalne store'y (seed/size/shape
  — 8 selektorów) przez propsy do `SettingsPanel`; każde keystroke re-renderuje
  też MapPreview.
- Fixy tanie: najpierw stabilne referencje — `useCallback` na handlerach,
  `useMemo` na `navigationState`, `items`, `inspector` i `children` — dopiero
  potem `memo(MapCanvas)` i `memo(CursorReadout)`; samo `memo` bez tego nic nie
  da. `SettingsPanel` czyta store'y sam.

## 5. Stores

- `isGenerating` (`use-world-generation.ts:31-33,62,79`) — ręcznie
  utrzymywany duplikat statusu z `useGenerationProgressStore`; może się
  rozjechać. Sesja dopuszcza równoległe runy, a zastąpiony run czyści `progress`
  (`:66-67`) i ustawia `isGenerating(false)` (`:79`), więc stary run może
  nadpisać stan nowego.
- `totalDurationMs` to jedna wartość z workera, ale prezentowana w trzech
  miejscach (progress tracker `world-generation-session.ts:166`, statistics
  store `use-world-generation.ts:71`, statistics page `:48-50`); panel generacji
  liczy dodatkowo `max(stageTotal, totalDurationMs)`, a panel mapy pokazuje
  `rendering.elapsedDurationMs`, więc liczby mogą się różnić.
- `useMapConfigStore` trzyma cały `MapConfig`, a czytany jest tylko
  `config.world` (`use-statistics-snapshot.ts:14`).
- `use-geology-selection.ts:26-30` naprawia clamp write-backiem w `useEffect`;
  clamp powinien żyć w jednym miejscu zapisu (`view-sync-store.ts:38`).
- `nextRegionNumber` (`macro-region-form-store.ts:51`) — licznik module-level
  poza stanem; w produkcji nie ma akcji „restore defaults", więc na razie to
  głównie ukryty stan i problem testowy.
- Dla równowagi: selektory atomiczne, pojedyncze stores — struktura jest dobra.

## 6. Pliki ponad normę (~150 soft / 200 hard)

Wszystkie liczby to linie fizyczne na HEAD (bez pomijania pustych linii i
komentarzy); wcześniejsza wersja tabeli mieszała obie metody liczenia.

| Plik | Linie | Problem |
| --- | --- | --- |
| `utils/map-readout/readout.ts` | 429 | 5 obowiązków: matematyka pomiarów, readout items, formatowanie, walidacje, per-layer providers |
| `components/map-preview/hooks/use-map-readout.ts` | 322 | FSM gestów (pan/measure/tap) + wheel + klawiatura + readout state; to controller canvasa, nie hook |
| `world-generator/lib/world-generation-session.ts` | 250 | singleton-orchestrator runów w komponentach; imperatywny zapis `usePreviewStore` (`:196`); łączy się z `generation-progress` |
| `heightmap/forms/forms.ts` | 436 | suwaki formularza i rasteryzacja w jednym pliku |
| `heightmap/relief/stamping.ts` | 431 | `stampForm` ~104 linie; brak unitów |
| `heightmap/relief/profiles.ts` | 315 | czyste funkcje, zero unitów |
| `map-renderer/renderer.ts` | 393 | composition root; `emptyRenderState()` (`:53-70`) buduje overlay options równolegle do `MapView.overlayOptions` (`map-view.ts:103-115`). Wspólne defaulty overlayów naprawiono w #220. |
| `layer/catalog/catalog-layer.ts` | 371 | painting + polityka minifikacji + BFS edge-fill + walidacja rastra + prywatny duplikat yieldu |
| `utils/map-generator/types.ts` | 364 | 4 obowiązki: konfiguracja, stan, eventy, opcje; najczęściej importowany plik |

## 7. Kontrakty i id jako stringi

- `OVERLAY_LAYERS` (`map-renderer/types.ts:36-40`) miesza namespace'y: `source`
  bywa layer-id (`'world-shape'`) i data-key (`'heatZoneMap'`). Stąd branch
  `id === 'world-boundary'` w `map-view.ts:110-113` i `masks.get(...)` na polu
  o dwóch znaczeniach (`:154`). Podział pola na `maskLayer` + `source` usuwa gałąź.
- `readout.ts:221-236` switch po id warstw, w pliku który ma wzorzec
  provider-map (`:112-120`) — `describeValue` powinno być wpisem `RASTER_READOUTS`.
- `MapInfo` stringly-typed (`map-layers/catalog/types.ts:15`) — konsumenci
  walidują `unknown` lokalnie; heat-zone'y korzystają ze wspólnego
  `isHeatZoneInfoList`, ale `macroRegionInfo` (`readout.ts:324-339`) i
  `worldDimensions` (`:406`) mają własne walidatory. Walidatory przy typie, nie
  przy konsumencie.
- `LayerCache` cast bez guardu (`layer-cache.ts:24`);
  `stage-outputs.ts:151` cast bez walidacji wartości; worker cast
  (`worker/pipeline.worker.ts:3`) bez type guard — każdy unieważnia regułę
  boundary z AGENTS.md.
- `catalog.ts:107-111` — podwójny `as unknown as T` w sortowaniu;
  typowany comparator usunąłby cast.

## 8. Testowalność

- `space.ts` — port „jednego układu współrzędnych" — nie ma własnego testu
  (round-trip `cellToNormalized`/`normalizedToCell`, `cellToMask` ↔
  `containsNormalized`, anizotropia `distanceMeters`).
- `relief/profiles.ts`, `relief/compose.ts`, `relief/stamping.ts` — czysta
  matematyka bez unitów; pokryta tylko pośrednio przez `field.test.ts`.
  `stages/heightmap` nie ma `stage.test.ts` (pozostałe 4 etapy mają).
- Cennym ubezpieczeniem przed większym refaktorem są testy `space.ts` + relief
  units — czysta matematyka, łatwa do testowania.

## 9. Drobiazgi

- Sentinela w polu liczbowym: `RegionShape.lagoon.cavityFloorShare = -0.06`
  obsłużona jako boolean w 5 miejscach (`forms.ts:177`, `placement.ts:92,102`,
  `stamping.ts:206`, `profiles.ts:82`) — nazwane pole `buildsReef` usuwa 5
  gałęzi po znaku.
- `geology-plan-vector-layer.ts` — walidacja w 3 miejscach (factory `supports`,
  `create`, scene), choć `vector-layer-factory.ts:24-26` mówi, że granicą jest
  factory; wystarczy jedna.
- `analysis/land-components.ts:178-189` — `neighbours()` nie pilnuje
  `y < height - 1` (bezpieczne tylko dzięki kolejności testów), podczas gdy
  `partition-check.ts:106-111` pilnuje wszystkie 4 strony.
- `header.tsx:79-89` — toggle theme bez `aria-label` (sąsiad ma oba).
- `RegionTabs` ręcznie robi tablist bez roving-tabindex, gdy Radix Tabs jest
  już w użyciu w dwóch innych tabach.
- `ExportDialog` `useState(formats[0]?.id)` (`:29`) — latentny brak syncu z props
  przy zmianie formatów.
- `legacy-generator` (~650 linii + strona + testy) — równoległa implementacja
  generacji, routowana na `/legacy-generator` i linkowana w nawigacji; jeśli
  przestarzała, usunąć albo odłączyć (decyzja produktowa).
- `isGeologyPlan` (`config/geology-check.ts:62-77`) — `WeakSet` cache w walidatorze;
  działa, ale czyni walidator stanowym (czysta funkcja byłaby prostsza).
- Komentarze: `base-climate/sampler.ts:6` — literówka „tssigns". `space.ts`
  jest poprawnym UTF-8; wcześniejszy „mojibake" w `§7: cylinder … hooks ??? never"
  był artefaktem narzędzia czytającego UTF-8 jako ANSI.

## 10. Priorytety — kolejność zadań

| # | Zadanie | Koszt | Efekt |
| --- | --- | --- | --- |
| 1 | dedup primitives: `clamp01`, yield, `percent`, `formatDuration`, `matchesSize`, `useEscapeKey`, `projectWithPadding`, `cellAtPixel`, flood fill, geometry ring/band | 1 PR ~2-3 h | −200 linii, jedna prawda, gotowe do reużycia |
| 2 | purge martwe API + `geologyCoupling` + przeniesienie `boundary-model`/presets z generatora | 1 PR ~1-2 h | zgodność granic z AGENTS.md, mniejszy public surface |
| 3 | memo/useMemo w map-preview + SettingsPanel czyta store'y sam | 1 PR ~1-2 h | koniec re-render storm |
| 4 | shared template progressive paint w rendererze + cache `targetKey` | 1 PR ~4 h | dwa największe paintery −80…120 linii, szybszy pan/zoom |
| 5 | split `readout.ts` i `use-map-readout.ts`; jasne miejsce dla sesji generacji | 1-2 PR | testowalność, limity 150/200 |
| 6 | kontrakty: podział namespace w `OVERLAY_LAYERS`, provider map zamiast switch, walidatory przy typach, `reads: ['worldMask']` | 1-2 PR | znika branch po id/ścieżkach stringowych |
| 7 | testy: `space.test.ts` + relief units (`profiles`, `compose`, `stamping`) | 1 PR | ubezpieczenie przed refaktorem numeryki |
| 8 | ESLint boundaries: wymuszenie kierunku importów (generator ← renderer ← UI) | 1 PR | granice egzekwowane zamiast review człowieka |
| 9 | rozważyć usunięcie/odłączenie `legacy-generator` (decyzja produktowa) | <1 PR | mniejszy surface, mniej mylenia dwóch generacji |

## 11. Biblioteki obliczeniowe

Nie ma potrzeby dodawania nowych zależności. Większość kodu to autorskie
algorytmy rastrowe/geometryczne (distance transform, integral image, partition
growth, canvas painting), których biblioteka nie zastąpi — to właśnie jest
produkt. `simplex-noise` wystarcza; `heapify`/`tinyqueue` zamiast `FrontierHeap`
(80 linii) może być wolniejszy, a `zod` odwróciłby proporcje walidacji, która
jest jawnie typowana. Jeśli coś, to dopiero po realnym profilowaniu.

## Pozytywy

- Konwencje komponent/folder/test z AGENTS.md przestrzegane niemal perfekcyjnie;
  żaden komponent nie przekracza limitu 200 linii (eslint `max-lines`).
- Rodzina statystyk (statistics-panel + 3 panele + timing-bar) — kompozycyjny
  shared-shell bez copy-paste.
- `useBoundaryDraft` + `BaseRegionCard` memo pokazują świadome zarządzanie
  drag UX; stores są w porządku, problem nie jest strukturalny.
- Brak `console.log`, TODO i komentarza z zamkniętym kodem; są dwa `console.warn`
  w `feature-flags-context.tsx` (dozwolone przez `no-console`) i jeden
  `eslint-disable` w `legacy-generator/world-controls.tsx`.
