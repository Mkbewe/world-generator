# Review zmian — landmassy (v0.10.0)

Zakres: `LandmassLayoutStage` (#218), warstwa podglądu (#349), archetypy kształtu
(#363) oraz formularz landmassów (#350). Stan na branchu
`feat/350-add-the-landmass-settings-form`.

`check:all`: 125 plików testów, 569 testów — zielone.

## Przed mergem

1. **`pickArchetype` traktował pustą pulę jak „wszystkie archetypy".** Przy
   `archetypes: []` funkcja wracała do całej puli, co przeczy semantyce pustej
   puli („nie rysuj nic"). Nieosiągalne z UI, bo etap pomija pętlę struktur, ale
   pułapka na przyszłość. **Poprawione:** fallback tylko dla `undefined`.
2. **Brak testu kierunku odnogi Y.** Test sprawdzał jedynie odległość środka
   poprzeczki od zgięcia, więc dwusieczna mogła po cichu wrócić na złą stronę.
   **Poprawione:** test liczy kąt między odnogą a oboma ramionami (musi być
   rozwarty) dla trzech seedów.
3. **Pusta pula = skok paska postępu z 0 na 0.5.** Etap nie raportuje nic
   w pierwszej połowie, gdy nie ma struktur do wygenerowania. Kosmetyka,
   świadomie zostawiona.

## Znane niedoróbki (materiał na kolejne zadania)

1. **Struktury mogą na siebie nachodzić.** `createStructure` bierze pierwsze
   zmieszczenie w świecie i nie sprawdza sąsiadów (warunek odstępu został
   usunięty). Przy 2–4 strukturach bywa, przy 8–10 będzie regułą. Kierunek:
   rozmieszczanie z odstępem (siatka z jitterem, best-of-N albo promień konturu).
2. **Szelf i coastline roughness bez kontrolek.** Zostają w konfiguracji
   z domyślnymi wartościami; suwaki dostaną w formularzach etapów, które je
   zużywają (renderowanie wysokości, deformacja wybrzeża).
3. **Paleta 8 kolorów na 10 struktur** — kolory się powtarzają, preview przy
   wysokiej liczbie struktur robi się mylący.
4. **Niespójność formularzy**: landmass i makroregiony czytają store
   bezpośrednio, world-shape i noise przez propsy.
5. **`irregular` bez własnych asercji** (wzorzec zgięć ±, brak samoprzecięcia).
6. **`MIN_LANDMASS_SIZE = 0.25`** to założenie przy zmianie zakresu na 0.25–1
   (wcześniej 0.4–1.6) — do ewentualnego dostrojenia.
7. **Roadmapa §4.2**: zdanie „Wieloskalowy szum oraz domain warping deformują
   geometryczną bazę" jest nieaktualne — układ jest analityczny, szum wejdzie
   dopiero na etapie wysokości.

## Zmiany zachowania

- **Sync zakładek jest automatyczny** — ręczna mapa `TAB_LAYERS` zniknęła, mapa
  zakładka↔warstwa jest wyprowadzana z katalogu warstw, więc każdy przyszły etap
  z warstwą synchronizuje się bez ręcznego wpisu (pilnuje tego test).
- **Pusta pula archetypów = brak struktur** (raster samych zer, warstwa
  przezroczysta). Walidacja „co najmniej jeden archetyp" usunięta i wróci
  później.
- **`scale` → `size`** w całym łańcuchu (config, generator, store, formularz),
  zakres 0.25–1, gdzie 1 to maksimum, domyślnie 0.5.
- **Liczba struktur 1–10**, domyślnie 2; domyślny rozmiar zmniejszony do 0.5.
