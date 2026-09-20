# Uzupełnienie review 0.7.0: granice regionów i zoom

## Zakres

Przegląd aktualnego renderera po wydaniu `v0.7.0`, na bazie commita `765fc74`.
To nie jest ponowna ocena kodu dokładnie z tagu `v0.7.0`. Podczas przeglądu w
drzewie roboczym były także niezapisane w commicie zmiany dotyczące zwalniania
bufora `stage`; poniższe przyczyny wynikają z kodu niezależnego od tej zmiany.

## 1. Błędna pozycja ostrego bufora po przybliżeniu — wysoki priorytet

Po zoomie tylko fragment mapy w lewym górnym rogu może otrzymać nową, ostrą
klatkę. Pozostała część nadal pokazuje rozciągnięty obraz zastępczy i sprawia
wrażenie, że mapa się nie odświeża.

W gałęzi `projection.cellSize >= 1` funkcja `renderTarget` ustawia początek
projekcji bufora tak (`src/utils/map-renderer/preview-targets/preview-targets.ts:82-83`):

```ts
left: view.centerX * size.width - width / 2,
top: view.centerY * size.height - height / 2,
```

Reszta renderera traktuje `left` i `top` jako **położenie komórki (0, 0) na
canvasie**, więc znaki są odwrócone. Bufor wyśrodkowany na widoku powinien mieć
`left = width / 2 - view.centerX * size.width` i analogicznie `top`. Na przykład
dla rastra 4 × 4, bufora 2 × 2 i środka `(0.5, 0.5)` poprawne wartości to
`(-1, -1)`, podczas gdy test oczekuje `(1, 1)`
(`src/utils/map-renderer/preview-targets/preview-targets.test.ts:34-40`). Test
utrwala zatem błąd.

**Do poprawy:** odwrócić oba wzory i oczekiwanie testu. Dodać przypadek ze
środkiem innym niż `(0.5, 0.5)` oraz test prezentacji, który po zakończeniu
renderu potwierdzi pokrycie całego widocznego obszaru ostrą klatką.

## 2. Schodki na kolorowych granicach regionów — problem jakości obrazu

Generator zapisuje jeden identyfikator regionu na komórkę rastra
(`src/utils/map-generator/stages/macro-region-stage.ts:41-66`). Dla palety
regionów renderer wybiera identyfikator przez `Math.floor` i nadaje każdemu
wynikowemu pikselowi dokładnie jeden kolor
(`src/utils/map-renderer/layer/catalog-layer.ts:49-86`). Nie wyznacza częściowego
pokrycia piksela przy granicy. Dlatego ukośne i pofalowane przejścia tworzą
schodki **już przy skali 1×**; zoom tylko je powiększa. Domyślna deformacja
szumem (`amplitude: 0.08`) odpowiada za zamierzone, szerokie pofalowanie, nie
za pikselowe ząbki. Zielony obrys świata wygląda inaczej, bo jest rysowany
jako ścieżka Canvas (`world-boundary-renderer.ts:49`).

**Docelowo:** wyznaczać granicę kolorów z tej samej ciągłej geometrii i szumu,
które określają region, a następnie wypełniać obszary do tej granicy z
wygładzaniem w rozdzielczości bieżącego widoku. Raster identyfikatorów może
pozostać danymi generatora; wygląd i odczyt przy samej granicy muszą być
spójne. Ta zmiana wymaga udostępnienia rendererowi deterministycznej reguły
klasyfikacji regionów albo zapisania gotowych konturów razem z mapą.

Tańsza poprawa wizualna to wyznaczanie pokrycia pikseli tylko przy granicach
na podstawie sąsiednich komórek rastra. Ukryje część schodków, ale nie odtworzy
kształtu granicy utraconego podczas próbkowania. Samo zwiększenie siatki lub
włączenie `imageSmoothingEnabled` dla całej warstwy nie daje trwałego efektu
gładkiej, ostrej krzywej.

## 3. Miejscowe rozmycie podczas zmiany widoku

Warstwa przechowuje obraz zastępczy całej mapy o najdłuższym boku 512 px
(`src/utils/map-renderer/layer/layer.ts:45,193-223`). Prezenter rysuje go z
wygładzaniem pod ostatnią ukończoną klatką
(`src/utils/map-renderer/layer-presenter/layer-presenter.ts:61-69,143`). Podczas
zoomu lub przesuwania obraz zastępczy może więc chwilowo być miękki. Błąd z
punktu 1 przesuwa ostrą klatkę, przez co ten miękki obraz pozostaje widoczny
na dużej części mapy nawet po próbie odświeżenia.

Po naprawie projekcji trzeba sprawdzić, czy miękkie fragmenty znikają po
zakończeniu renderu i pozostają jedynie efektem przejściowym. Miejscowego
rozmycia nie należy mylić ze schodkami z punktu 2: to dwa różne problemy.

## Kolejność prac

1. Naprawić znak projekcji bufora zoomu i poprawić testy, które utrwalają błąd.
2. Zweryfikować pokrycie całego widoku ostrą klatką po zoomie i przesunięciu.
3. Osobno zaprojektować gładkie wypełnienie kolorów regionów przy zachowaniu
   istniejącej deformacji granic.

Ten dokument jest analizą. Nie wprowadzono w nim zmian działania renderera.

---

## Uzupełnienie: review Groka (commit `765fc74`)

Niezależny przegląd tego samego zakresu, wklejony bez zmian merytorycznych
(po angielsku). Werdykt: 4 bugi, 1 sugestia, 1 nit.

### Review summary

- **Mode**: local
- **Target**: Uncommitted map-renderer rasterization (viewport-resolution layer buffers)
- **Files reviewed**: 14+ in `src/utils/map-renderer` (preview-targets, layer, catalog-layer, layer-presenter, map-view, renderer, view-transform)
- **Diff stats**: working tree moved during the review; rasterization pipeline was reviewed from the live sources, not only the first collected diff
- **Issue counts**: 4 bugs, 1 suggestion, 1 nit

#### Top issues

- [bug] preview-targets.ts:80 -- 1px/cell crop stores cell-space origin in MapProjection.left/top; paint and blit treat it as canvas-space (black holes, pan/zoom flicker)
- [bug] layer-presenter.ts:62 -- draw() clearRect wipes progressive stage tiles; only overview + committed frame are composited
- [bug] layer-presenter.ts:97 -- view-driven prepare() has no onTile and is aborted on every pan, so catch-up never paints progressively
- [bug] map-view.ts:221 -- tilePainter uses the same wrong crop transform, so generation tiles miss the viewport once left != 0
- [suggestion] preview-targets.test.ts:40 -- tests lock in left:1 and never paint a cropped buffer

### Summary

The viewport-resolution raster path is the right idea (crop or minify into a buffer, keep an overview, transform the last completed frame while a new one paints), but the 1px-per-cell crop does not use `MapProjection`. `projection.left`/`top` are filled with the crop origin in map cells, while `paintTile`, `LayerPresenter.drawSurface`, and `tilePainter` all treat those fields as canvas pixels of the map origin. That matches the reported pan/zoom flicker and black holes: samples fall out of bounds (transparent tiles) and the blit lands off-screen. Progressive drawing is then wiped because `draw()` clears the display and only composites the overview plus the last *committed* frame — in-flight `stage` tiles never participate, and view-driven `prepare()` calls omit the tile reporter.

### Issues

#### Issue 1 -- Severity: bug

- File: src/utils/map-renderer/preview-targets/preview-targets.ts:80
- Description: When `projection.cellSize >= 1`, `renderTarget()` builds a 1px-per-cell crop with `left: view.centerX * size.width - width / 2` (and the same for `top`). That value is the leftmost *map cell* covered by the buffer. `MapProjection` documents `left`/`top` as the canvas rectangle of the whole map (pixel position of cell 0). `CatalogLayer.paintNearestTile` samples `floor((pixel + 0.5 - projection.left) / cellSize)`, and `LayerPresenter.drawSurface` / `MapView.tilePainter` place the buffer with `view.left - source.left * scale`. Those formulas are correct only for canvas-space origins. At fit on a full-map buffer `left` is 0, so the first frame looks fine; any pan or zoom makes `left != 0`, paint writes mostly transparent pixels (out-of-bounds cells), and `drawImage` destinations jump off the viewport. That is the black regions and the flicker when a catch-up crop replaces a transformed full-map frame. Tests currently lock the bug in: `preview-targets.test.ts` expects `{ cellSize: 1, left: 1, top: 1 }` for a 4x4 map at 4x on an 8px view — under a real `MapProjection` that origin is `left: -1`.
- Suggestion: Keep a single `MapProjection` for every buffer. For a 1px-per-cell crop of size `width`×`height` centred on the view: `cellSize: 1`, `left: -(centerCellX - width / 2)`, `top: -(centerCellY - height / 2)`, `width: size.width`, `height: size.height` (map size in pixels at 1px/cell). Update the magnified-buffer test to expect `left/top: -1` (or equivalent) and add a paint test that a cropped target with non-zero origin samples the centre cells, not the origin or empty.
- Status: open

#### Issue 2 -- Severity: bug

- File: src/utils/map-renderer/layer-presenter/layer-presenter.ts:62
- Description: `draw()` always `clearRect`s the display canvas, then blits `overview` and the last committed `layer.canvas` from `renderedTargets`. Progressive tiles are written only onto the display via `MapView.tilePainter` (from `layer.stage`) and `renderedTargets` is updated only after `prepare()` resolves. Any pan, zoom, or `ResizeObserver` `refresh()` therefore wipes in-flight tiles and replaces them with the overview (or with nothing if overview is not ready). That is why progressive fill dies as soon as the view moves, and can die on the first layout pass after `begin()` sets `presented`.
- Suggestion: While `layer.busy`, composite `layer.stage` with `layer.renderingTarget` on top of the overview the same way the committed frame is drawn — or stop clearing the display and let `tilePainter` keep painting. `markRendered` should not be the only way a buffer is eligible for `draw()`.
- Status: open

#### Issue 3 -- Severity: bug

- File: src/utils/map-renderer/layer-presenter/layer-presenter.ts:97
- Description: View-driven catch-up calls `layer.prepare(controller.signal, target)` with no `onTile`. Combined with Issue 2, a zoom/pan rerender is invisible until it fully commits. `ensure()` also aborts the in-flight view render on every subsequent `ensure()` (`this.viewRender.abort()`), and `MapLayer.render` yields after every tile (`TILES_PER_AXIS`² = up to 100). Rapid pan/zoom therefore cancels catch-up before `commit()`, so the display stays on a stale or mis-projected frame and never shows progressive tiles for the new view.
- Suggestion: Pass a tile reporter into this `prepare()` (the same compositing path as generation). Coalesce aborts to the next animation frame instead of aborting on every pointer sample, and/or paint the transformed previous frame plus overview until the new buffer actually commits (already attempted, but currently wrong because of Issue 1).
- Status: open

#### Issue 4 -- Severity: bug

- File: src/utils/map-renderer/view/map-view.ts:221
- Description: `tilePainter` uses the same `offset = view.projection.left - render.projection.left * scale` placement against `layer.renderingTarget`. During generation this is the 1px-per-cell crop from Issue 1, so even the initial progressive `drawImage` of `layer.stage` lands at the wrong screen rect once the view is not a centred full-map buffer. Generation at 1x on a map that fills the buffer (`left === 0`) can still look progressive; the same code path fails as soon as the crop origin is non-zero.
- Suggestion: Fix Issue 1 so this offset is a real canvas-space transform. After that, tile dest rects are `offset + tilePx * scale` and should match `drawSurface`.
- Status: open

#### Issue 5 -- Severity: suggestion

- File: src/utils/map-renderer/preview-targets/preview-targets.test.ts:40
- Description: The magnified-buffer test (and MapView's "one pixel per cell and scales it up") only assert buffer size and a centred `left: 0` blit. Nothing paints a cropped target (`left != 0`) or checks that the display dest rect covers the viewport after pan/zoom. That is why the projection mix-up survived.
- Suggestion: Add: (1) `renderTarget` pan/zoom cases that assert canvas-space `left/top`; (2) a CatalogLayer prepare against that crop that expects the centre source cells; (3) a LayerPresenter test that after zoom the committed dest rect intersects the view canvas rather than lying entirely at a negative origin.
- Status: open

#### Issue 6 -- Severity: nit

- File: src/utils/map-renderer/preview-targets/render-target.ts:3
- Description: The comment says "Viewport-sized output buffer together with the projection it was drawn with." The 1px-per-cell path is not viewport-sized and its `projection` is not a `MapProjection` in the sense `view-transform.ts` defines. That mismatch is what made Issue 1 easy to miss.
- Suggestion: Document that `projection` must always be a `MapProjection` (canvas pixels, cell 0 at `left/top`), including for cropped 1px buffers.
- Status: open

---

## Zastrzeżenia do propozycji z #319 (ocena)

Ocena propozycji „Render region and world boundaries from the shared geometry"
(#319): wspólny klasyfikator regionów z `MacroRegionStage`, próbkowanie
pokrycia przy granicach, ujednolicenie zielonego obrysu z wypełnieniem oraz
zapis konfiguracji regionów i deformacji w mapie.

### Na plus

- Diagnoza jest trafna: granice regionów są rasteryzowane per komórka
  (`Math.floor`), więc krzywa ginie między komórkami i żadne wygładzanie
  gotowego obrazu tego nie naprawi.
- Wspólna geometria obrysu i wypełnienia to właściwy kierunek; dziś overlay
  jest analityczny, a wypełnienie obcinane rastrem, stąd rozjazd przy
  zielonej linii.
- Coverage sampling tylko przy granicach (kilka próbek na piksel, ~1 px
  wygładzania) plus szybka ścieżka w jednolitych obszarach to standardowe
  rozwiązanie: gładka krzywa bez szerokiego rozmycia.
- Zapis konfiguracji regionów i deformacji jest potrzebny, aby renderer
  odtworzył tę samą krzywą po przywróceniu mapy (dziś snapshot niesie rastry
  i `MapInfo`, a config żyje w store sesyjnym).

### Ryzyka i zastrzeżenia

- Koszt: klasyfikator per punkt (geometria + simplex) razy kilka próbek na
  piksel. Konieczne ograniczenie do pikseli przy granicy, odrzucanie po bbox
  i pomiary; inaczej 4× na 4K jest nie do utrzymania. To argument za
  przeniesieniem renderu do workera w przyszłości.
- Determinizm: wspólny klasyfikator musi być czystą funkcją z configu i seeda,
  a raster i renderer muszą stosować te same offsety szumu — inaczej granice
  dalej się rozjadą.
- „Rysować w rozdzielczości ekranu także po przybliżeniu" cofa częściowo
  data-limited buffer z #315. Pamięciowo nadal OK (viewport × DPR), ale dla
  małych map wracamy do buforów ~viewport, więc budżet cache (#158) zyskuje na
  znaczeniu.
- To nie naprawi czarnych obszarów ani zanikania progresywnego rysowania —
  propozycja sama to zaznacza. Najpierw muszą wejść bugi z tego dokumentu
  (znak projekcji, czyszczenie w presenterze, brak `onTile`/abort co event),
  żeby jakość granic oceniać na poprawnej klatce.
- Zakres jest duży (generator + renderer + persistence); sensowny podział to
  dwa PR-y: (a) wspólny klasyfikator i coverage regionów przy granicy,
  (b) ujednolicenie granicy świata z obrysem i zapis configu.

### Sprostowanie do wcześniejszych opisów

- Migotanie ekranu nie jest już aktualnym objawem: zostało rozwiązane
  wcześniej (double buffer, overview, abort/settle). Błąd znaku z punktu 1
  objawia się teraz jako ostra klatka próbkująca złe komórki i lądująca poza
  viewportem, przez co widoczna pozostaje rozmyta mapa zastępcza — nie jako
  migotanie. Określenie „pan/zoom flicker" w review Groka należy traktować
  jako historyczne.

### Werdykt

Kierunek słuszny i zgodny z wariantem C omawianym przy granicach, ale to
feature z realnym kosztem wydajnościowym i sprzężeniem generator–renderer,
a nie szybka poprawka. Kolejność: naprawa projekcji i testu przyciętego
bufora, potem kafelki i planowanie renderów, na końcu #319.
