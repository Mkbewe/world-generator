# Notatki: pamięć i wydajność danych generatora

Notatki z dyskusji po przeglądzie (2026-09-15). Zbierają ustalenia o tym, ile
pamięci naprawdę zajmują dane generatora, dlaczego tak wychodzi, oraz pomysły na
zmiany wraz z konsekwencjami. Roadmapa opisuje kierunek produktu — ten plik jest
technicznym zapleczem decyzji.

Numeracja sekcji: **I. Podstawy** to fakty i konkretne miejsca w kodzie,
**II. Pomysły** to opcje do wyboru, **III. Decyzje** to stan ustaleń.

---

## I. Podstawy

### I.1. Format danych (6 B na próbkę)

| Raster | Typ | B/próbkę | Rola |
| --- | --- | --- | --- |
| `worldMask` | `Uint8Array` | 1 | 0/1, obszar świata |
| `macroRegionIdMap` | `Uint8Array` | 1 | numer (indeks) regionu |
| `noiseMap` | `Float32Array` | 4 | szum 0..1 |

Stałe: `BYTES_PER_SAMPLE = 6`, `MEMORY_BUDGET_BYTES = 600 MB`,
`SAMPLE_BUDGET = 100 000 000` komórek (`src/utils/world-dimensions.ts`).

### I.2. Skalowanie kwadratowe

Detal liczony jest na obu osiach, więc podwojenie rozdzielczości to 4× pamięci:

| Świat | Próbki | Dane (6 B) |
| --- | --- | --- |
| 4 km @ 1 m | 16M | 96 MB |
| 4 km @ 0.5 m | 64M | 384 MB |
| 10 km @ 1 m | 100M | 600 MB |

### I.3. Tablice są gęste, choć świat nie

- Etapy **pomijają** komórki poza maską (`continue` w `macro-region-stage.ts`
  i `noise-stage.ts`) — nie liczą tam niczego.
- Ale alokacja jest na cały prostokąt (`Uint8Array(sampleWidth * sampleHeight)`),
  a poza maską zostają zera. Dysk marnuje `1 − π/4 ≈ 21,5%` każdej tablicy.
- Oszczędzamy więc CPU, nie RAM. Zmiana tego wymaga rzadszych struktur albo
  upakowania bitów (patrz II.6).

### I.4. Duplikaty i cache (największy mnożnik)

- Worker wysyła dane przez `postMessage`, które **kopiuje** (`generation-worker.ts:34`),
  a sam zachowuje bufory dla kolejnych etapów → dane istnieją dwa razy.
- Canvasy: od #285 warstwy i prezentacja są rasteryzowane w rozmiarze
  viewportu × DPR, a nie rastra — warstwa trzyma stabilną klatkę i mały
  `overview` całej mapy, a bufor renderu w toku (`stage`) jest zwalniany po
  commicie. Od #319 każda warstwa maluje w rozdzielczości ekranu z marginesem
  1,5× także przy powiększeniu (gładkie granice), a przy pomniejszeniu filtruje
  próbkowanie. Przy 600 × 600 CSS px i DPR 2 canvas warstwy ma ~1800 × 1800 px,
  czyli ~13 MB plus ~1 MB `overview`; rozmiar nie zależy od rastra, więc
  10 000 × 10 000 nie zajmuje już 400 MB. 4 B/piksel bez kompresji, plus kopia
  po stronie GPU.
- Cache warstw trzyma viewportowe powierzchnie nieaktywnych warstw;
  `mapRepository` trzyma ostatni przebieg do końca sesji.
- Efekt: przy dużych mapach szczyt ograniczają dane i ich kopie, nie canvasy.
  Dla 64M próbek: 384 MB danych, ~0,8 GB szczytu (maska + kopie; bufory
  viewportu są pomijalne obok dawnych pełnowymiarowych canvasów).

### I.5. Canvas to nie obrazek

PNG/JPEG są małe, bo są skompresowane (często 8-bit/paleta). Canvas trzyma
piksele bez kompresji: **4 B na piksel**, bo renderer potrzebuje losowego
dostępu. Maska i regiony to 1 B/komórkę, ale ich canvas to już 4 B/piksel
(4× więcej niż dane).

### I.6. Czym jest `macroRegionIdMap`

- Regiony macro to strefy świata z formularza (pierścienie, pasy, nakładki).
- W rastrze nie ma nazw — każdy region ma **numer** (indeks na liście): 0, 1, 2…
- `macroRegionIdMap` to odpowiedź „w jakim regionie jest ta komórka":
  ```text
  komórki: 0 0 1 1 1 2 2 3 3
  labels:  ['Region 1', 'Region 2', 'Region 3', 'Region 4']
  odczyt wartości 2 → labels[2] = 'Region 3'
  ```
- Potrzebny rendererowi (paleta `discrete`), odczytowi pod kursorem
  (`MapInfo.macroRegionLabels`, #255) i dalszym etapom po `danger`.
- Jest **cache'em**: wynika wprost z geometrii regionów i szumu deformacji.

### I.7. Dlaczego macro regiony są ~2× wolniejsze od noise

Per komórka wewnątrz maski:

- `NoiseStage`: 3 wywołania simplex (octaves 3) w ciasnej pętli na liczbach.
- `MacroRegionStage`: 4 wywołania simplex (dwa strumienie deformacji × octaves 2)
  przy domyślnym źródle `dedicated`; źródło `noise-map` zamienia je na do 4
  odczytów z interpolacją. Do tego `ownerIndex` → `contains`/`distanceTo`
  z `Math.hypot` liczonym nawet 2× na region, iteracja po tablicy obiektów
  i sprawdzanie `role` (string).
- `Math.hypot` jest w V8 wolniejsze od `Math.sqrt(dx*dx + dy*dy)` i nie jest
  inline'owane; obiekty i branch po `geometry.kind` psują monomorficzność pętli.

---

## II. Pomysły

### II.1. Noise jako źródło deformacji regionów — wdrożone (#313)

Domyślnie deformacja korzysta z własnego, deterministycznego szumu (dwa kanały,
częstotliwość 3, dwie oktawy). Pole `macroRegionDeformation.source` pozwala
wybrać `noise-map` bez zmian w klasyfikacji regionów lub rendererze. Wariant
`noise-map` ma następujące właściwości:

- deformacja korzysta z gotowego pola szumu zamiast liczyć osobny szum w etapie
  makroregionów; interpolacja wymaga do czterech odczytów na próbkę,
- etapy działają w kolejności `world-shape → noise → macro-region` (#312),
  a zmiana Noise zmienia regiony tylko przy źródle `noise-map`,
- `Irregularity` regionu nakładanego nadpisuje wspólną amplitudę
  (`irregularity ?? globalnaAmplituda`),
- `macroRegionDeformation.frequency/octaves/seed` pozostają poza konfiguracją;
  własny szum ma stałe parametry i korzysta z seedu świata,
- `noiseMap` pozostaje liczone tylko wewnątrz maski świata; interpolacja pomija
  komórki poza maską, zamiast odczytywać ich zera jako szum,
- jedna wartość `noiseMap` z zakresu 0..1 jest mapowana na −1..1 i przesuwa
  promień pierścieni lub współrzędną pasa; nie ma przesuniętej drugiej próbki,
- próbki między komórkami są interpolowane dwuliniowo, ponieważ podgląd rysuje
  granice w rozdzielczości ekranu,
- domyślna amplituda 0.08 zostaje; wybór źródła zapisuje się z geometrią mapy,
  więc podgląd odtwarza te same granice.

### II.2. Rzadsza krata deformacji + interpolacja (alternatywa dla `dedicated`)

Nadal aktualne dla domyślnego źródła `dedicated`: zostawić niezależny szum
deformacji, ale liczyć go co N komórek (np. 8) i interpolować bilinearne. Koszt
spada 4 simplex → ~0,06/komórkę, bez sprzężenia z Noise. Zachowuje pełną
kontrolę nad charakterem granic.

### II.3. Mikro-optymalizacje geometrii

- `Math.sqrt(dx*dx + dy*dy)` zamiast `Math.hypot`,
- policzyć odległość raz na region (dziś `contains` + `distanceTo` liczą ją
  podwójnie),
- spłaszczyć regiony do tablic liczb przed pętlą (bez obiektów i `role`).

### II.4. Lżejszy format danych

| Wariant | B/próbkę | 16M | 64M | 100M |
| --- | --- | --- | --- | --- |
| teraz (`Float32` noise) | 6 | 96 MB | 384 MB | 600 MB |
| noise `Uint16` | 4 | 64 MB | 256 MB | 400 MB |
| noise `Uint8` | 3 | 48 MB | 192 MB | 300 MB |

- `Uint8` = 256 poziomów: dobre do podglądu, ryzykowne dla pochodnych
  (wysokość, spadki, erozja) — mogą powstać „schodki",
- `Uint16` = 65k poziomów, wciąż 2× mniej niż teraz; bezpieczniejszy domyślny
  wybór, jeśli heightmapy będą liczone z szumu,
- zmiana dotknie etapów, palet, renderera, testów i `BYTES_PER_SAMPLE`.

### II.5. Zero-copy z workera

- Transfer buforów per etap **nie wchodzi w grę** — worker potrzebuje
  `worldMask` i `noiseMap` w kolejnych etapach.
- `SharedArrayBuffer` (worker pisze, główny wątek czyta) usuwa kopię, ale
  wymaga nagłówków COOP/COEP na Vite i Vercel oraz przepisania alokacji.
- Jednorazowa wysyłka na końcu zamiast streamingu usuwa duplikat, ale tracimy
  progresywne rysowanie warstw w trakcie generowania.

### II.6. Rasteryzacja do viewportu i budżet cache

- Zrobione (#285, #315, #319): warstwy renderują się w buforze viewportu × DPR
  z marginesem, bez pośrednich obrazów w pełnej rozdzielczości; każda warstwa
  maluje w rozdzielczości ekranu także przy powiększeniu (gładkie granice),
  próbkowanie szumu jest filtrowane przy pomniejszeniu, a statystyki pokazują
  rozdzielczości i rozmiary buforów.
- Zostało (#158, odłożone do większej liczby warstw): budżet pamięci cache
  i przygotowywanie nieaktywnych warstw tylko w budżecie.
- Koszt: każde odświeżenie widoku maluje widoczny obszar od nowa
  w rozdzielczości ekranu (~1800 × 1800 px bufora z marginesem przy 600 × 600
  CSS px i DPR 2), niezależnie od rozmiaru rastra; przy pomniejszeniu dochodzi
  filtr kilku próbek na piksel, a przy powiększeniu praca bywa większa niż przy
  dawnym buforze 1 px na komórkę.

### II.7. Rastry pochodne liczone na żądanie

`macroRegionIdMap` nie musi leżeć w pamięci przez całą sesję — można go
policzyć z configu przy malowaniu warstwy, a pod kursorem raz na komórkę.
Oszczędność: 1 B/próbkę (64 MB przy 64M, 100 MB przy 100M). Koszt: warstwa nie
ma gotowego rastra, więc jej ponowne wygenerowanie/pomalowanie trwa tyle, ile
etap; odczyt jednej komórki jest pomijalny.

### II.8. Sparsyfikacja i bit-packing — odrzucone na teraz

Maska potrzebuje 1 bitu, regiony 4 bitów, ale typed arrays adresują bajtami.
Upakowanie bitów albo lista komórek wewnątrz kształtu oszczędza 20–87% pamięci
kosztem przesunięć bitowych i komplikacji w każdym etapie, rendererze
i próbkowaniu. Wracamy do tematu tylko, jeśli pomiary pokażą, że to konieczne.

---

## III. Decyzje i otwarte kwestie

- Kolejność etapów ustawiona na `world-shape → noise → macro-region` (#312)
  i zdefiniowana raz w `PIPELINE_STAGES` (`stage-definitions.ts`); formularz
  i warstwy podglądu korzystają z tej samej listy.
- `macroRegionDeformation.source` (#313, II.1) wybiera źródło deformacji granic:
  domyślnie `dedicated` (własny szum, mapy bez zmian), opcjonalnie `noise-map`
  (sprzężenie z Noise). W formularzu makroregionów służy do tego przełącznik
  „Border noise", a wybór jedzie z geometrią mapy do podglądu i widać go
  w statystykach. `frequency/octaves/seed` zniknęły z konfiguracji i UI.
- `Irregularity` per region nadpisuje wspólną amplitudę.
- Selektywne przeliczanie etapów (#257, #258) działa na deklaracjach
  `configKeys` w `stage-definitions.ts`: brudny zbiór to pierwszy zmieniony etap
  i wszystko za nim, worker seeduje stan rastrami zapisanej mapy i pomija czyste
  etapy zdarzeniem `stage-skipped`. Reużyte rastry zostają w głównym wątku — nie
  wracają przez `postMessage` — a podgląd nie przygotowuje ich ponownie. Zapisana
  mapa i jej baseline żyją do udanego runu, więc anulowanie nic nie kasuje.
- Otwarte: czy `noise-map` ma stać się domyślnym źródłem — wymaga wizualnego
  retuningu i pomiaru czasu etapu.
- Otwarte: format szumu (`Uint8` vs `Uint16`, II.4), czy wchodzimy w
  `SharedArrayBuffer` (II.5), czy `macroRegionIdMap` ma być liczony na żądanie
  (II.7).
- Powiązane zadania: #158 (budżet cache i zwalnianie `stage`), #286 (tło
  dekoracyjne — niezależne). #285 i #315 są wdrożone.
