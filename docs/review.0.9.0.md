# Review 0.9.0: selektywne przeliczanie, spięcie zakładek i statystyki mapy

## Zakres

Przegląd zmian z milestone'a `v0.9.0` na bazie commita `76e363f` (plus zmiany
#304 z gałęzi `feat/304-...`, jeszcze niezmergowane): kolejność i zależności
etapów (#312–#314), selektywne przeliczanie (#333–#336), prezentacja pominiętych
etapów (#258), spięcie zakładek (#197), reguła podążania podglądu (#342) oraz
statystyki mapy (#304).

Cel przeglądu: uproszczenia, mniej „ifologii" i obejść, łatwiejsze utrzymanie
i rozbudowa. Ogólny wniosek: kierunek jest dobry — tryby zniknęły na rzecz
wymaganych danych i reguł, a większość nowych modułów jest mała i skupiona na
jednym zadaniu. Poniżej osiem znalezisk mojego przeglądu, uzupełnionych
recenzją kolegi (punkty 9–16), a na końcu wspólne podsumowanie.

## Co jest już dobre

- Brak opcjonalnych „trybów": `reuse` w workerze, `RunGeneration` i `skipStageIds`
  są wymagane, a `new Set(options.skipStageIds ?? [])` normalizuje wejście raz.
- Reguły zamiast flag: „ten sam rozmiar siatki → scena i widok zachowane"
  (`map-scene.ts:start`, `map-view.ts:start`) oraz „świeży podgląd podąża za
  etapami" (`world-generation-session.ts:133`).
- `stage-skipped` jako osobne zdarzenie — podgląd nie ma ani jednego warunku na
  status; konsumenci danych ignorują je z definicji.
- `planProgress` i konstruktor `ProgressTracker` dzielą jeden helper
  (`initialStage`), więc plan i ogłoszenie etapów nie mogą się rozjechać.

## 1. Sesja generowania urosła w „god object" — priorytet średni

`world-generation-session.ts` (235 linii) trzyma dziewięć pól i realizuje pięć
zadań: orkiestrację runu, planowanie selektywnego przeliczania, scalanie
statystyk, zbieranie/odtwarzanie warstw i planowanie progresu. Trzy z tych pól
opisują zapisaną mapę (`savedConfig`, `realStatistics`) albo ostatni run
(`stageInfos`, `dirtyStages`, `followRun`), a `reset()` musi o nich pamiętać
linia po linii (`world-generation-session.ts:80-89`).

**Do poprawy:** wydzielić stan i logikę selektywnego przeliczania do osobnego
modułu, np. `lib/regeneration.ts` z klasą trzymającą `config`, `stageInfos`,
`stageStatistics` i `dirty`, z metodami `plan(config)`, `reusedStages(stages)`,
`mergeStatistics(statistics)`, `remember(config)` i `reset()`. Sesja zostaje
przy runie: `renderer`, `layers`, `run`, `generation`. Efekt: jedno miejsce na
regułę „co reużywamy i za ile", krótszy `generate` i mniejsza liczba pól do
utrzymania.

## 2. `mergeStatistics` mutuje stan wewnątrz `map` — priorytet niski

`world-generation-session.ts:183-192`: funkcja przeglądająca statystyki zapisuje
przy okazji do `this.realStatistics`. Ukryty efekt uboczny w metodzie, która
wygląda jak czyste mapowanie.

**Do poprawy:** zwykła pętla z jawnym `merged.push(...)` i `continue` dla etapów,
które się liczyły (albo rozdzielenie na „zapamiętaj" i „scal"). Zachowanie bez
zmian, intencja czytelna.

## 3. `restartProgress` jest zbędny — priorytet niski

`use-world-generation.ts:60` resetuje progres przed startem, a sesja w tym samym
ticku emituje `planProgress` (`world-generation-session.ts:106-109`), który robi
to samo, tylko od razu z zaznaczonymi pominiętymi etapami. Dwa pojęcia na jedną
czynność, a `restartProgress` (`progress-state.ts:81`) nie jest już do niczego
potrzebny.

**Do poprawy:** usunąć `restartProgress`, jego test i eksport oraz reset z hooka.
Pierwszy run i tak nie ma poprzedniego progresu, więc zachowanie się nie zmienia.

## 4. Spięcie zakładek: synchronizacja wewnątrz handlera — priorytet niski

`map-preview.tsx:50-71`: `handleBaseLayerChange` jednocześnie wybiera warstwę
i raportuje ją do zakładki formularza, a `useTabSync` (który ma robić tylko
kierunek formularz → podgląd) wywołuje ten sam handler. Efekt: wywołanie
pochodzące z synchronizacji ustawia tę samą zakładkę ponownie — nieszkodliwe,
ale miesza dwa kierunki w jednej funkcji.

**Do poprawy:** rozdzielić `selectLayer(layer)` (wybór + zapis w store) od
`handleLayerChange(layer)` (akcja użytkownika: `selectLayer` + zakładka
formularza). `useTabSync` woła `selectLayer`, komponenty podglądu
`handleLayerChange`. Pętla znika u źródła, a nie przez przypadek.

## 5. Reguła „follow" opisana w dwóch modułach — priorytet niski

Ta sama reguła żyje w sesji (`followRun = !renderer?.state.displayedLayer`) i w
widoku (`continuing = matchesSize && presented`). Dziś są spójne, bo stan
renderera odzwierciedla widok, ale to sprzężenie nie jest nigdzie zapisane.

**Do poprawy:** komentarz w obu miejscach wskazujący na siebie nawzajem oraz
test, który pinuje oba warunki razem (świeża scena → przelot; zachowana scena →
brak przelotu). Bez zmian w zachowaniu.

## 6. `dirtyStageIds` to API wyłącznie dla testów — priorytet niski

Getter `world-generation-session.ts:53` jest używany tylko w testach sesji
(`world-generation-session.test.ts:176,179,182,371`). Testy mogą sprawdzać plan
przez `reuse.dirtyStageIds` przekazane do runnera, które i tak asertują.

**Do poprawy:** albo usunąć getter i oprzeć testy na `reuse`, albo zostawić go
świadomie jako czytelny widok planu (z komentarzem, że jest częścią kontraktu
sesji). Rekomendacja: usunąć — mniej publicznego API.

## 7. Dwa formatery liczb — priorytet niski

`formatNumber` (`utils/format.ts:10`) i `formatMeasure` (`utils/format.ts:27`)
mają nakładające się zadania: pierwszy wymusza stałą precyzję (`toFixed`),
drugi obcina zera i dodaje jednostkę. Statystyki używają obu.

**Do poprawy:** doprecyzować komentarze, kiedy który stosować (metryki o stałej
precyzji vs wartości fizyczne), bez łączenia ich — zachowanie testów zależy od
stałej precyzji `formatNumber`.

## 8. Dokumentacja do aktualizacji — priorytet średni

- `docs/world-generation-roadmap.md`:
  - §2.4: dopisać regułę podążania podglądu (przelot tylko dla świeżej mapy,
    przy regeneracji wybór zostaje i warstwy podmieniają się w miejscu) oraz
    przełącznik spięcia zakładek w nagłówku ustawień,
  - §2.5: progres i statystyki pokazują pominięte etapy (szary segment z tekstem
    `skipped`, licznik `2 / 3, 1 skipped`), a reużyte etapy zachowują realny czas
    i metryki z runu, który je wygenerował,
  - §2.6: zmienić status z „planowane" na „działa" i opisać wdrożony zakres,
  - §2.7: oznaczyć automatyczne odświeżanie jako odłożone do Backlogu (zależności
    #257/#258 są gotowe, decyzja produktowa),
  - §2.8: oznaczyć #257 i #258 jako zrobione i opisać mechanizm: deklaracje
    `configKeys`, brudny zbiór z diffu konfiguracji, `stage-skipped`, reużycie
    rastrów bez wysyłania ich z workera.
- `docs/generator-performance-notes.md`: w „Decyzje i otwarte kwestie" dopisać
  selektywne przeliczanie (co reużywamy, jak liczymy brudny zbiór, że pominięte
  etapy nie wracają przez `postMessage`) i usunąć nieaktualne wzmianki o
  planowanym #257/#258.

---

## Uzupełnienie: przegląd zmian pod kątem uproszczeń, ifologii i długu technicznego

Uzupełnienie przeglądu o analizę szczegółowych mechanizmów wdrożonych w milestone `v0.9.0` (commit `76e363f` względem `v0.8.1`), ze szczególnym uwzględnieniem miejsc podatnych na awarie („na ślinę i trytytki”), rozgałęzień warunkowych („ifologii”) oraz przecieków abstrakcji utrudniających dalszą rozbudowę.

### 9. Przedwczesne czyszczenie repozytorium i utrata mapy przy błędzie/anulowaniu — wysoki priorytet

- **Plik:** `src/components/world-generator/lib/world-generation-session.ts:104-105`
- **Diagnoza:**
  Na początku `generate()` sesja natychmiast czyści repozytorium mapy oraz zapisaną konfigurację:
  ```ts
  this.dirtyStages = selectDirtyStageIds(this.savedConfig, config);
  this.layers = { ...cachedRasters };
  mapRepository.clear();
  this.savedConfig = undefined;
  ```
  Zapis nowego stanu do `mapPersistence.save(...)` następuje dopiero po pomyślnym zakończeniu całego procesu (linia 153). Jeśli użytkownik kliknie **Cancel**, nastąpi błąd etapu lub zmiana widoku przed końcem runu, dotychczasowa mapa przepada bezpowrotnie. Przy ponownym wejściu na podgląd `mapPersistence.restore(renderer)` nie ma czego odtworzyć.
- **Do poprawy:**
  Usunąć `mapRepository.clear()` i kasowanie `this.savedConfig` z początku metody `generate()`. Nowy stan powinien nadpisywać repozytorium dopiero po pomyślnym ukończeniu generowania. W przypadku przerwania lub błędu użytkownik zachowuje ostatnią poprawnie wygenerowaną mapę.

### 10. Kruche wykrywanie „świeżego podglądu” przy `followRun` — średni priorytet

- **Plik:** `src/components/world-generator/lib/world-generation-session.ts:133`
- **Diagnoza:**
  ```ts
  this.followRun = !renderer?.state.displayedLayer;
  ```
  Warunek ten zakłada, że brak aktywnej warstwy w rendererze oznacza pierwszą generację świata. Jeśli jednak użytkownik wywoła generowanie z innej strony (np. Settings przed wejściem na Preview lub ze Statistics), `renderer` jest `undefined`. Wtedy `!renderer?.state.displayedLayer` ewaluuje się do `true`, mimo że w repozytorium istnieje już pełna wygenerowana mapa. W konsekwencji `receiveStage` niesłusznie wymusza zmianę aktywnej warstwy w `previewStore`.
- **Do poprawy:**
  Opierać `followRun` na danych, a nie na obecności instancji renderera: `followRun = Object.keys(cachedRasters).length === 0` (lub `!mapRepository.get()`).

### 11. Niepotrzebne tworzenie instancji generatora w `selectDirtyStageIds` — średni priorytet

- **Plik:** `src/utils/map-generator/selective-regeneration.ts:13`
- **Diagnoza:**
  `selectDirtyStageIds` wywołuje `createMapGenerator().stages` przy każdym sprawdzeniu różnic w konfiguracji. Tworzy to niepotrzebnie nowe instancje klas `WorldShapeStage`, `NoiseStage`, `MacroRegionStage` wraz z Simplex Noise i walidatorami, tylko po to, by odczytać statyczne metadane `id` oraz `configKeys`. Ponadto deklaracje `configKeys` są rozproszone po klasach etapów, zamiast być częścią ich definicji.
- **Do poprawy:**
  Przenieść deklarację `configKeys` bezpośrednio do definicji etapów w `stage-definitions.ts` (np. jako pole w `StageInfo` / `StageDefinition`). Dzięki temu `selectDirtyStageIds` staje się czystą funkcją operującą na stałych tablicach, bez alokacji klas i zależności wykonawczych.

### 12. Błąd w warunkach i powielanie kodu w interpolacji szumu granic — średni priorytet

- **Plik:** `src/utils/map-generator/stages/macro-region-displacement.ts:70-100`
- **Diagnoza:**
  W `createNoiseDisplacement` cztery narożniki są sprawdzane osobnymi instrukcjami `if`:
  ```ts
  if (topLeft !== undefined) { ... }
  if (horizontal > 0) { ... topRight ... }
  if (vertical > 0) { ... bottomLeft ... }
  if (horizontal > 0) { ... bottomRight ... }
  ```
  Dla próbki `bottomRight` (linia 91) sprawdzane jest wyłącznie `horizontal > 0`, bez weryfikacji `vertical > 0`. Choć matematycznie waga wynosi wtedy 0, jest to ewidentny błąd asymetrii i niepotrzebne wywołanie `noiseAt`. Cały blok zawiera ponadto czterokrotnie powieloną arytmetykę ważenia.
- **Do poprawy:**
  Zastąpić powielone bloki zwarłą, deklaratywną pętlą po narożnikach:
  ```ts
  const corners = [
    [left, top, (1 - horizontal) * (1 - vertical)],
    [right, top, horizontal * (1 - vertical)],
    [left, bottom, (1 - horizontal) * vertical],
    [right, bottom, horizontal * vertical],
  ] as const;
  for (const [cx, cy, weight] of corners) {
    if (weight <= 0) continue;
    const value = noiseAt(cx, cy);
    if (value !== undefined) {
      weightedValue += value * weight;
      weightSum += weight;
    }
  }
  ```

### 13. Przeciekanie abstrakcji i twarde kodowanie warstw w rendererze — średni priorytet

- **Pliki:** `src/utils/map-renderer/scene/map-scene.ts:104-124` oraz `src/utils/map-renderer/layer/catalog-layer.ts:37`
- **Diagnoza:**
  W `MapScene.add` zaszyto twarde sprawdzenia konkretnego ID warstwy:
  ```ts
  if (id === 'macro-region' && this.regionConfig?.deformation.source === 'noise-map' && !this.layers.has('noise')) ...
  ```
  oraz w kluczu cache:
  ```ts
  id === 'macro-region' && this.regionConfig?.deformation.source === 'noise-map' ? this.layers.get('noise')?.data : undefined
  ```
  Podobnie `CatalogLayer` decyduje o trybie wygładzania przez `spec.id === 'macro-region'`. Stoi to w sprzeczności z ideą deklaratywnego katalogu warstw (`LayerSpec`), który miał uniezależnić renderer od wiedzy o konkretnych identyfikatorach etapów i warstw.
- **Do poprawy:**
  Wprowadzić w `LayerSpec` deklarację wymagań geometrycznych (np. `geometryKind?: 'world' | 'region'` lub pole określające zapotrzebowanie na rastry pomocnicze). Renderer powinien podejmować decyzje na podstawie specyfikacji warstwy, a nie porównywania stringów `id === 'macro-region'`.

### 14. „Ifologia” i podwójne liczenie geometrii w `MacroRegionStage` — niski priorytet

- **Plik:** `src/utils/map-generator/stages/macro-region-stage.ts:192-265`
- **Diagnoza:**
  - `geometryCoordinate` per piksel i per region wykonuje rozgałęzienie typów: `typeof displacement === 'number'` (skalar dla `noise-map`) vs `{ x, y }` (wektor 2D dla `dedicated`), a wewnątrz sprawdza `geometry.kind === 'ring'` vs `axis`.
  - W `ownerIndex` dla regionów bazowych wywoływane jest `containsCoordinate`, a gdy warunek nie zachodzi — `distanceToCoordinate`, które ponownie liczy moduł z odległości od środka pierścienia/pasa.
- **Do poprawy:**
  Ujednolicić reprezentację przesunięcia punktu lub funkcję metryki odległości, aby wyliczać współrzędną zredukowaną tylko raz i z niej bezpośrednio wnioskować zarówno przynależność (`distance <= 0`), jak i odległość do granicy.

### 15. Kruche rzutowanie identyfikatorów w `view-sync-store.ts` — niski priorytet

- **Plik:** `src/stores/ui/view-sync-store.ts:37-44`
- **Diagnoza:**
  `layerForTab` zwraca `tab === 'general' ? undefined : tab as MapBaseLayerId`, a `tabForLayer` szuka w liście zakładek elementu o identycznej nazwie. Mechanizm działa wyłącznie dzięki zbieżności nazw stringowych etapów pipeline'u i warstw podglądu.
- **Do poprawy:**
  Zdefiniować jawną mapę mapowania lub powiązać warstwę z etapem w metadanych katalogu/definicji etapów.

### 16. „Ifologia” w maszynie stanów postępu (`progress-state.ts`) — niski priorytet

- **Plik:** `src/components/generation-progress/lib/progress-state.ts:98-135`
- **Diagnoza:**
  Pięć powtarzających się bloków `if (event.type === 'stage-...')` duplikuje przypisanie `name: event.stageName` oraz przepisywanie `statistics.durationMs`.
- **Do poprawy:**
  Uprościć `applyStageEvent` do zwartego `switch (event.type)` lub słownika aktualizacji, redukując powtarzalny kod.

---

— Antigravity

---

## Podsumowanie znalezisk

Legenda: źródło **M** — przegląd powyżej (punkty 1–8), **K** — recenzja kolegi
(punkty 9–16). Kolejność wg priorytetu.

### Przyjęte do poprawy

| # | Znalezisko | Źródło | Priorytet |
| --- | --- | --- | --- |
| 1 | Nie czyścić zapisanej mapy ani baseline'u przed sukcesem runu | K#9 | wysoki |
| 2 | Wydzielić stan i logikę selektywnego przeliczania z sesji do osobnego modułu | M#1 | średni |
| 3 | Przenieść deklaracje `configKeys` z klas etapów do `stage-definitions` | K#11 | średni |
| 4 | Interpolacja narożników w `createNoiseDisplacement` — deklaratywna pętla | K#12 | średni |
| 5 | Wymagania geometryczne w `LayerSpec` zamiast `id === 'macro-region'` w rendererze | K#13 | średni |
| 6 | Dokumentacja: roadmapa §2.4–§2.8 i notatki wydajności | M#8 | średni |
| 7 | `mergeStatistics` — jawna pętla zamiast efektu ubocznego w `map` | M#2 | niski |
| 8 | Usunąć zbędny `restartProgress` i reset progresu w hooku | M#3 | niski |
| 9 | Rozdzielić `selectLayer` od `handleLayerChange` w podglądzie | M#4 | niski |
| 10 | Reguła „follow": komentarz w obu modułach i test pinujący oba warunki | M#5, K#10 | niski |
| 11 | Usunąć `dirtyStageIds` z publicznego API sesji (testy przez `reuse`) | M#6 | niski |
| 12 | Doprecyzować komentarze `formatNumber` vs `formatMeasure` | M#7 | niski |
| 13 | Jawne mapowanie zakładek i warstw zamiast zbieżności identyfikatorów | K#15 | niski |
| 14 | Skrócić `applyStageEvent` (powielone `name` i `durationMs`) | K#16 | niski |
| 15 | Ujednolicić reprezentację przesunięcia w `geometryCoordinate` | K#14 | niski |

### Odrzucone jako niepoprawne

| Teza | Powód odrzucenia |
| --- | --- |
| K#10 — `followRun = brak cachedRasters` jako poprawka | Łamie kryterium #342: zmiana rozmiaru lub kształtu ma wracać do przelotu. Dodatkowo rozjeżdża store z canvasem — widok rysuje przelot (`progressive`), a zakładki zostają na starym wyborze. Obecna reguła jest spójna z widokiem z konstrukcji (sesja czyta `displayedLayer` po `startRenderer`). Sama uwaga o kruchości przyjęta jako #10. |
| K#11 — „`selectDirtyStageIds` tworzy instancje Simplex Noise" | Nieprawda: simplex powstaje w `execute` (`createNoise2D`), nie w konstruktorze etapu. Realny koszt to konstrukcja etapów i walidacja pipeline'u przy każdym sprawdzeniu. Kierunek — deklaracje w `stage-definitions` — przyjęty jako #3. |
| K#12 — „`bottomRight` sprawdzany bez `vertical > 0`" | Nieprawda: blok jest zagnieżdżony w `if (vertical > 0)` (`macro-region-displacement.ts:84-99`). Przyjęty sam refaktor pętli jako #4. |
| K#14 — „podwójne liczenie odległości w `ownerIndex`" | Nieprawda: `geometryCoordinate` liczy zredukowaną współrzędną raz na region, a `containsCoordinate` i `distanceToCoordinate` korzystają z tego skalara; drugiego `hypot` nie ma. Zostaje kosmetyka jako #15. |
| K#15 — „rzutowanie `tab as MapBaseLayerId` w `layerForTab`" | Nieprawda: w `view-sync-store.ts:38` nie ma castu, a `tabForLayer` filtruje po dozwolonej liście zakładek. Sama kruchość mapowania po identyfikatorach przyjęta jako #13. |

### Kolejność prac

1. #1 — nie czyścić zapisanej mapy przed sukcesem (wysoki).
2. #2 i #3 — moduł regeneracji i deklaracje etapów w `stage-definitions`.
3. #7, #8, #9, #14 — drobne porządki w sesji, progresie i podglądzie.
4. #4 i #5 — pętla narożników oraz wymagania w `LayerSpec`.
5. #10, #11, #12, #13, #15 — komentarze, test reguły „follow" i drobiazgi API.
6. #6 — dokumentacja.
