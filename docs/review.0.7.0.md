# Review zmian od v0.6.0

Przegląd zakresu `v0.6.0..HEAD` — 10 commitów, około 123 zmienione pliki.

## 1. Co się zmieniło

Zmiany są skupione wokół podglądu mapy i doświadczenia fullscreen:

| Commit | Zakres |
|--------|--------|
| `6d19871` | Nowy layout podglądu: pionowe ikonowe zakładki, karta z odczytem, placeholder |
| `d8d6158` | Synchronizacja roadmapy + notatki o wydajności |
| `aab60c2` | Aliasy deploymentów w release’ach Vercel |
| `490ded7` | Fullscreen overlay, pływający panel, blokada scrolla |
| `701528d` | Refactor: podział `preview-map` → `map-preview`, `map-canvas`, `map-sidebar`, wydzielenie hooków i `utils/map-readout` |
| `b8a7ca0` | Focus trap + `inert` dla tła w fullscreenie |
| `d5a89b1` | Analityczne rysowanie granicy świata (`disc`/`rect`) |
| `0eb59f7` | Fix: blokada scrolla na `<html>` zamiast `<body>` |
| `92e2ab3` | Renderowanie mapy w rozdzielczości viewportu × DPR |
| `eaced70` | Zoom / pan w fullscreenie: `ViewTransform`, gesty mysz/touch, pin odczytu |

## 2. Zgodność z README, AGENTS.md i roadmapą

### README
Opis w README odpowiada kodowi:
- fullscreen otwierany z headera lub `Esc`,
- canvas wypełnia obszar roboczy z zachowaniem proporcji,
- zoom kółkiem / przyciskami `-`/`+`, pan przeciągnięciem, pin tapnięciem,
- `MapInfo` dla etykiet regionów i wymiarów świata.

### AGENTS.md
- Komponenty są jeden plik = jeden publiczny komponent, w osobnych folderach z testami (`map-preview/`, `map-canvas/`, `map-sidebar/`, `layer-tabs/`).
- Logika niekomponentowa trafiła do `lib/` lub `utils/` (np. `utils/map-readout/`, `map-preview/lib/layer-navigation.ts`).
- Większość komponentów mieści się w limicie ~150 linii; wyjątki to `map-view.ts` (319 — klasa renderera), `use-map-readout.ts` (198).
- Style są w `module.scss` tylko tam, gdzie potrzebne.

### Roadmapa (`docs/world-generation-roadmap.md`)
**Nie rozjechaliśmy się roadmapą.** Zmiany realizują to, co było zaplanowane:
- Sekcja 2.4 — podgląd fullscreen, zoom, pan, inspekcja: ✅ [działa]
- Sekcja 2.9 — odświeżenie wyglądu shella: ✅ częściowo (kompaktowy header, karty `surface`, panel translucent); pozostało scalenie nawigacji z headerem / dekoracyjne tło.
- Sekcja 9 — wydajność: ✅ częściowo; prezentacja (kopiowanie na canvas viewportu) działa, ale **wciąż planowana jest prawdziwa rasteryzacja warstw do rozmiaru viewportu** (#285) — dane warstw nadal są trzymane w pełnej rozdzielczości rastra.

Sekcje nadal planowane (2.6, 2.7, 2.8, 4–8) nie zostały ruszone, co jest zgodne z kolejnością z roadmapy.

## 3. Mocne strony

1. **Dobra separacja warstw.** Renderer (`utils/map-renderer`) nie zależy od Reacta; UI jest cienką warstwą nad nim. Dodanie nowego etapu pipeline’u i nowej warstwy wciąż wygląda na proste.
2. **ViewTransform w normalizowanych współrzędnych.** `scale` + `centerX/centerY` niezależne od pikseli i DPR to solidna podstawa pod zoom/pan i przyszłe eksporty.
3. **Analityczna granica świata.** `WorldBoundaryRenderer.strokeShape` rysuje dysk/prostokąt w rozdzielczości ekranu, a trace po pikselach jest tylko fallbackiem.
4. **Dostępność fullscreenu.** Focus przenoszony do overlaya, `Esc` wychodzi, tło jest `inert`, focus wraca do triggera — zgodnie z dobrymi praktykami.
5. **Testy pokrywają kluczowe ścieżki.** Zoom/pan, focus, gesty touch, pin odczytu, fullscreen, granica świata.
6. **CI/release.** Alias `wg-<wersja>.vercel.app` zabezpiecza stare release’y przed polityką retencji Vercel.

## 4. Znalezione problemy i rekomendacje

### 🔴 Do poprawy wkrótce

1. **`LayerNavigation` nie reaguje na zmiany `layerTree` z store**
   - `src/components/map-preview/map-preview.tsx:31-33`
   - Nawiigacja jest tworzona raz w `useState`:
     ```ts
     const [navigation] = useState(
       () => new LayerNavigation(layerRegistry.tree, usePreviewStore.getState().layerTree)
     );
     ```
   - Jeśli `layerTree` w store zostanie zaktualizowane z zewnątrz, komponent użyje starego drzewa. Choć obecnie `select()` modyfikuje stan wewnętrznie, lepiej zsynchronizować to z storem (np. `useEffect` lub re-inicjalizacja przy zmianie drzewa), aby uniknąć cichego desynchronu.

2. **`samplePointer` w `utils/map-readout/readout.ts` jest mylący**
   - Funkcja jest eksportowana, ale w UI używany jest `MapView.samplePointer`, który rozumie zoom/pan. `readout.ts/samplePointer` działa tylko w prostokącie CSS i nie nadaje się do obecnego podglądu. Jest testowana, ale wprowadza ryzyko, że ktoś użyje jej w nowym miejscu. **Rekomendacja:** oznaczyć jako test-only / usunąć i przenieść testy do `MapView.samplePointer`, albo wyraźnie nazwać `samplePointerFromRect`.

3. **Warningi `act(...)` w `world-generator.test.tsx`**
   - Testy przechodzą, ale Vitest zgłasza:
     > “An update to WorldGenerator inside a test was not wrapped in act(...)”
   - Warto opakować interakcje/async aktualizacje w `act` / `waitFor`, żeby output testów był czysty.

### 🟡 Do przemyślenia

4. **Niepersystowany stan panelu w fullscreenie**
   - `MapSidebar` trzyma `collapsed` i `position` w lokalnym `useState`. Po zamknięciu i ponownym otwarciu fullscreenu ustawienia resetują się. To może być celowe, ale jeśli użytkownik woli panel złożony na dole, będzie musiał to ustawiać za każdym razem.

5. **`WorldBoundaryRenderer.traceCells` może być wolny jako fallback**
   - Jest to O(width × height) po pikselach. Dla fullscreen 1920×1080 @ DPR=2 to ~4M operacji przy każdym renderze. Skoro `shape` jest teraz wymagane w konfiguracji (`MapMetadata.shape`), fallback może być rzadko używany, ale warto go monitorować.

6. **`LayerTabs` traci type-safety przy ikonach**
   - `LAYER_ICONS: Record<string, ReactNode>` — lepiej `Record<MapBaseLayerId, ReactNode>` lub `satisfies`.

7. **Mieszanie natywnych i Reactowych listenerów w `useMapReadout`**
   - Wheel jest natywny (`addEventListener`), pointer events są Reactowe. Uzasadnione przez `passive: false`, ale warto dodać krótki komentarz, dlaczego tak jest.

8. **`CursorReadout` — klucze w `flatMap` oparte na `line.label`**
   - Jeśli kiedykolwiek pojawi się więcej niż jeden item z `lines` o powtarzającym się labelu, React będzie krzyczał o duplikatach kluczy. Lepiej użyć `${item.id}-${line.label}`.

## 5. Czy kod jest gotowy na rozbudowę?

Tak, z małymi zastrzeżeniami:
- Dodanie nowej nakładki wymaga rozszerzenia `OverlayController` i `OVERLAY_LAYERS` — jest tam jeden punkt wejścia.
- Dodanie nowego etapu pipeline’u i warstwy nadal wygląda na proste: stage + wpis w katalogu + `pipeline-factory`.
- Fullscreen i renderer są na tyle ogólne, że przyszłe warstwy (heightmap, biomy) powinny dziedziczyć zoom/pan za darmo.
- Największym wyzwaniem pozostaje sekcja 9 roadmapy: **rasteryzacja danych do viewportu**, bo obecnie każda warstwa wciąż trzyma pełnowymiarowy canvas.

## 6. Werdykt

Zmiany są **spójne z README, AGENTS.md i roadmapą**, dobrze przetestowane i architektonicznie sensowne. Nie ma rozjazdu z roadmapą — zrobiono to, co było zaplanowane w sekcjach 2.4, 2.9 i częściowo 9, a reszta pozostała w backlogu.

Główne rzeczy do załatania przed kolejnym releasem:
1. Synchronizacja `LayerNavigation` z `previewStore.layerTree`.
2. Rozstrzygnięcie losu `samplePointer` w `utils/map-readout`.
3. Wyciszenie warningów `act(...)` w `world-generator.test.tsx`.

Mniejsze poprawki (type-safety ikon, klucze w readout, komentarz przy wheel listenerze) można wrzucić w cleanup PR.

## 7. Weryfikacja

Uruchomiono:

```text
pnpm run check:all
```

Wynik:

- TypeScript: bez błędów,
- ESLint: bez błędów,
- Stylelint: bez błędów,
- Prettier: bez błędów,
- Vitest: 95 plików testowych i 398 zaliczonych testów.

## 8. Uzupełnienie recenzji — opencode

Niezależny przegląd tego samego zakresu (`v0.6.0..HEAD`, 10 commitów, 123 pliki,
+3436/−1077). Ocena ogólna i brak blokera są zbieżne z powyższą recenzją. Poniżej
korekty faktów oraz znaleziska, których powyżej nie było.

### Korekty do powyższej recenzji

1. **`Esc` nie otwiera fullscreenu.** Podsekcja README powtarza za
   `README.md:73` i `docs/world-generation-roadmap.md:112`, że podgląd otwiera
   się przełącznikiem w nagłówku „lub `Esc`”. `use-preview-fullscreen.ts:37-40`
   obsługuje `Escape` wyłącznie do wyjścia z trybu. Oba dokumenty wymagają
   poprawki (przy okazji: pin odczytu działa też poza fullscreenem, czego README
   nie precyzuje).

2. **Sekcja 2.9 roadmapy nie jest „częściowo” zrealizowana.** Header jest
   kompaktowy tylko w trybie fullscreen, a `panelBackground` to nadal `solid`
   (`src/theme/theme-provider.tsx:28`); `Card variant='surface'` nie jest
   odpowiednikiem `panelBackground='translucent'`. #289/#290 to odświeżenie
   layoutu podglądu i placeholder — roadmapa sama opisuje placeholder jako
   poza zakresem #288 (`docs/world-generation-roadmap.md:214-215`), więc ta
   notka jest już nieaktualna, ale status 2.9 słusznie pozostaje `[planowane]`.

3. **Jest jednak rozjazd dokumentacyjny w sekcjach 3 i 9.** Od `92e2ab3` (#305)
   canvas prezentacji jest w rozmiarze viewportu × DPR
   (`src/utils/map-renderer/view/map-view.ts:277-291`), a nie rastra.
   `docs/world-generation-roadmap.md:254-256` nadal twierdzi, że „canvas
   warstwy i canvas prezentacji ma pełny rozmiar rastra”, a
   `docs/generator-performance-notes.md:49-51` powtarza to z nieaktualnym
   odnośnikiem `map-view.ts:59`. Opis sekcji 3 i szacunek szczytu pamięci
   wymagają korekty (rasteryzacja warstw, #285, pozostaje aktualna).

4. **`traceCells` to nie tylko kwestia wydajności.** Fallback ma inny kolor niż
   ścieżka analityczna: turkus `(100, 255, 218, 230)` w `paintDisc`
   (`world-boundary-renderer.ts:109-130`) kontra `rgba(49, 155, 0, 0.9)` w
   `strokeShape` (`:6`). Jest też praktycznie nieosiągalny — każde wywołanie
   `MapRenderer.start/load` przekazuje `shape` (`renderer.ts:111`,
   `map-view.ts:94`) i snapshot też go niesie — więc sensowniej usunąć fallback
   i wymusić `shape`, niż go optymalizować.

5. **Klucze w `CursorReadout` — niższe ryzyko niż opisano.** Wiersze `lines` są
   dziećmi jednego `<Text key={item.id}>` (`cursor-readout.tsx:31-41, 56-69`),
   więc kolizja wymaga dwóch wierszy o tym samym labelu w jednym itemie.
   Dodanie `item.id` do klucza tego nie rozwiąże; bezpieczniej użyć indeksu
   wiersza albo pilnować unikalności `label`.

### Znaleziska spoza powyższej recenzji

6. **AGENTS.md rozjeżdża się z konwencją folderów.** `AGENTS.md:18`: „hooks
   live in a `lib/` folder”, a ten zakres przeniósł hooki do `hooks/`
   (`map-preview/hooks`, `world-generator/hooks`, `generation-progress/hooks`,
   `mobile-menu/hooks`, `world-shape-form/hooks`). Kod jest spójny — do
   aktualizacji jest AGENTS.md.

7. **Mutacja stanu w `LayerNavigation`.** Poza brakiem synchronizacji ze storem
   (punkt 1 powyżej) `select()` zmienia `root.selectedChild` w miejscu
   (`map-preview/lib/layer-navigation.ts:51`). Działa, bo `renderer.select`
   synchronicznie emituje `setPreview`; wybór bez dotknięcia renderera nie
   odświeży UI. Warto trzymać niemutowalny wybór albo jawnie wersjonować.

8. **Odczyt łapie komórki poza mapą.** `MapView.samplePointer` klampuje `u`/`v`
   do 0..1 (`map-view.ts:181-196`), więc w fullscreenie nad letterboxem obok
   mapy panel pokazuje skrajną komórkę. Wcześniej canvas pokrywał się z mapą,
   więc to nowe, kosmetyczne zachowanie — przy okazji warto zwracać `undefined`
   poza rzutem.

9. **Nakładki są mniej data-driven niż warstwy bazowe.** `MapView.mask` jest
   pojedyncze i zaszyte na `OVERLAY_LAYERS['world-boundary'].source`
   (`map-view.ts:108-111`), a `OverlayController` na sztywno tworzy
   `WorldBoundaryRenderer` (`overlay-controller.ts:24`). Warstwy bazowe mają
   katalog i rejestr — przed nakładkami numerycznymi z 2.4 (temperatura,
   wilgotność, przezroczystość, paleta) warto dać nakładkom analogiczny rejestr,
   inaczej każda nowa zahaczy o `MapView`, `OverlayController` i `types.ts`.

10. **Ukryte stałe i drobiazgi konstrukcyjne.** `--fullscreen-header-offset:
    4.25rem` (`main-layout.module.scss:10`) musi ręcznie zgadzać się z
    wysokością headera (`header.module.scss:7`). `MapView` ma cztery parametry
    pozycyjne konstruktora (`map-view.ts:54-59`), choć `MapRenderer` używa już
    `MapRendererOptions`. `OverlayController` łyka każdy błąd granicy bez śladu
    w statystykach (`overlay-controller.ts:71-73`).

### Zbieżne wnioski

- `samplePointer` w `utils/map-readout` faktycznie jest martwy — `useMapReadout`
  używa `MapRenderer.samplePointer` (`use-map-readout.ts:58`); usunięcie
  funkcji, eksportu (`utils/map-readout/index.ts:1`) i testu jest bezpieczne.
- `use-map-readout.ts` (198 linii) miesza rozpoznawanie gestów ze stanem
  odczytu — przy kolejnym geście warto rozbić.
- `pnpm run check:all` zielone (95 plików, 398 testów); jedyny szum to trzy
  warningi `act(...)` z `world-generator.test.tsx`, czyli punkt 3 powyższej
  recenzji.

### Proponowana kolejność

1. Poprawki dokumentacji: `README.md:73`,
   `docs/world-generation-roadmap.md:112, 214-215, 254-256`,
   `docs/generator-performance-notes.md:49-51`, `AGENTS.md:18`.
2. Usunięcie martwego `samplePointer`.
3. `shape` obowiązkowy w `WorldBoundaryRenderer` (usunięcie `traceCells`).
4. Niemutowalny `LayerNavigation` i synchronizacja z `previewStore`.
5. Reszta (punkty 8-10) w cleanupie.

## 9. Porównanie obu recenzji — skrót

Zbieżne (niezależnie potwierdzone przez obie recenzje):

- `samplePointer` w `utils/map-readout` — martwy/mylący, do rozstrzygnięcia.
- Warningi `act(...)` w `world-generator.test.tsx`.
- `LayerNavigation` wymaga poprawy — pierwsza recenzja: brak reakcji na
  `layerTree`; uzupełnienie: dodatkowo mutacja stanu w miejscu.
- `traceCells` jako problematyczny fallback — pierwsza: wydajność; uzupełnienie:
  inny kolor i praktyczna nieosiągalność.
- `use-map-readout.ts` przy miękkim limicie rozmiaru.

Skorygowane w uzupełnieniu:

- `Esc`: pierwsza recenzja uznaje opis README za zgodny; `Esc` tylko zamyka
  fullscreen, więc README i roadmapa wymagają poprawki.
- Sekcja 2.9: pierwsza ocenia ją jako częściowo zrealizowaną; w kodzie nadal
  `[planowane]` (`panelBackground='solid'`, kompaktowy header tylko w trybie
  fullscreen).
- Rozjazd dokumentacji: pierwsza mówi „nie rozjechaliśmy się roadmapą”; canvas
  prezentacji jest już viewportowy, a roadmapa i notatki nadal opisują pełny
  raster.
- Klucze `CursorReadout`: ryzyko niższe niż opisano — kolizja może wystąpić
  tylko w obrębie jednego itemu.
- Reset panelu w fullscreenie: `MapSidebar` nie jest odmontowywany przy
  przełączaniu trybu, więc `collapsed`/`position` przeżywają; resetują się
  dopiero przy nawigacji.

Poza zakresem pierwszej recenzji (tylko uzupełnienie): AGENTS.md vs `hooks/`,
mutacja `LayerNavigation`, odczyt komórek poza mapą, rejestr nakładek, offset
headera, konstruktor `MapView`, cichy `catch` w `OverlayController`.

Tylko w pierwszej recenzji, warte zachowania: `LAYER_ICONS` bez type-safety,
komentarz przy natywnym wheel listenerze, ewentualna persystencja panelu.
