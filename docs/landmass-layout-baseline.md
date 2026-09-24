# Baseline przebudowy Landmass Layout

## 1. Cel

Punkt odniesienia dla kolejnych etapów przebudowy opisanej w
`docs/landmass-layout-refactor-plan.md`. Baseline nie zmienia zachowania
generatora: ustala przypadki porównawcze i zapisuje obecne koszty, żeby po
refaktorze dało się je zestawić tym samym poleceniem i tym samym seedem.

## 2. Przypadki porównawcze

- seed benchmarku: `17`,
- seedy podglądu i zrzutów: `17`, `42`, `99`,
- rozdzielczości benchmarku: `256²`, `512²`, `1024²`, `2048²` komórek,
- zrzuty aplikacji: domyślny świat `1000²`, viewport `600²`, pixel ratio `1`,
- świat: `disc`, domyślne noise i makroregiony,
- landmassy: `DEFAULT_LANDMASS_CONFIG` (10 struktur, cała pula archetypów).

## 3. Pomiar generatora (Node)

`pnpm run bench` uruchamia `src/utils/map-generator/stages/landmass-layout.bench.ts`
(vitest bench, seed 17). Wartości średnie z 2026-09-22:

Środowisko pomiaru: Windows, Node v26.5.0, AMD Ryzen 5 7500F, 32 GB RAM. Liczby
są orientacyjne — liczy się rząd wielkości i porównanie tego samego benchmarku
na tej samej maszynie.

| Składnik                              |   256² |   512² |   1024² |    2048² |
| ------------------------------------- | -----: | -----: | ------: | -------: |
| Budowa layoutu (10 struktur)          | 0.33 ms (nie zależy od rozdzielczości) |
| Cały etap (`LandmassLayoutStage`)     | 146 ms | 569 ms | 2205 ms | 10211 ms |
| Rasteryzacja id mapy (etap − budowa)  | 146 ms | 568 ms | 2205 ms | 10211 ms |

Wniosek: budowa layoutu jest pomijalna, a cały koszt siedzi w przebiegu po
komórkach świata (~2.4 µs/komórkę). To jest koszt, który przebudowa ma usunąć.

## 4. Pomiar w aplikacji

Zrzuty paneli dla seedów `17`, `42`, `99` (świat `1000²`, viewport `600²`):
`baseline/<seed>a.png` to Generation statistics, `baseline/<seed>b.png` to
Rendering statistics. Wartości z 2026-09-22:

| Miara                                |  seed 17 |   seed 42 |         seed 99 |
| ------------------------------------ | -------: | --------: | --------------: |
| Całkowity czas generowania           |   2.42 s |    2.64 s |          2.30 s |
| Etap `Landmass layout generation`    |   2.17 s |    2.40 s |          2.06 s |
| Pierwsza kafelka (`First tile`)      | 286.7 ms |  718.2 ms |        285.2 ms |
| Warstwa `Landmasses` (Rendering)     | 316.3 ms |  299.8 ms | — (brak zrzutu) |
| Prezentacja (`Presentation`)         |   0.6 ms |    0.2 ms |          0.4 ms |
| Czas poza pomiarem renderingu        |   2.77 s |  687.5 ms |        923.4 ms |
| Bufory RGBA                          |    21 MB |     21 MB |           16 MB |
| Dane generowania                     |     7 MB |      7 MB |            7 MB |
| Pokrycie lądem                       |    14.4% |     15.6% |           12.7% |
| Szelfy                               |        5 |         4 |               3 |

Podział składników, którego nie mierzy benchmark:

| Składnik          | Źródło                                                      |
| ----------------- | ----------------------------------------------------------- |
| budowa + raster   | wiersz etapu `Landmass layout generation` (jeden czas)      |
| przesłanie danych | `First tile` / `Additional time outside measured rendering` |
| utworzenie warstwy| `Landmasses` w panelu Rendering                             |
| overview          | brak osobnego licznika; część przygotowania warstwy         |
| render viewportu  | `Presentation` w panelu Rendering                           |

## 5. Pomiar po przebudowie (2026-09-24)

Ten sam benchmark (`pnpm run bench`, seed 17) na nowym modelu; środowisko jak
w sekcji 3, a liczby traktujemy orientacyjnie — lokalnie mogą wyjść o kilka ms
inne, ale nie zmienia to wniosku o braku zależności od rozdzielczości.

| Składnik                          |   256² |   512² |   1024² |   2048² |
| --------------------------------- | -----: | -----: | ------: | ------: |
| Cały etap (`LandmassLayoutStage`) | 23.7 ms | 23.7 ms | 22.6 ms | 22.8 ms |

Porównanie z baseline:

| Rozdzielczość |   przed |      po |  zysk |
| ------------- | ------: | ------: | ----: |
| 256²          |  146 ms | 23.7 ms |  ~6× |
| 512²          |  569 ms | 23.7 ms | ~24× |
| 1024²         | 2205 ms | 22.6 ms | ~98× |
| 2048²         | 10211 ms | 22.8 ms | ~448× |

Etap nie zależy już od rozdzielczości: nie ma przebiegu po komórkach świata ani
rastra identyfikatorów. Koszt to budowa geometrii (10 struktur), plan rozmiaru
i placement. Pamięć: id mapa (1 B/komórkę, czyli 1 MB przy 1024² i 4 MB przy
2048²) zniknęła, a layout trzyma wyłącznie węzły i krawędzie. „Pokrycie lądem"
z baseline'u nie ma odpowiednika — jego miejsce w statystykach etapu zajmują
struktury, szelfy, węzły, krawędzie i liczba odrzuconych kandydatów.

Różnorodność dla seedów ze zrzutów (1024², domyślna konfiguracja):

| Miara                 | seed 17   | seed 42   | seed 99   |
| --------------------- | --------- | --------- | --------- |
| Struktury             | 10        | 10        | 10        |
| Szelfy                | 6         | 8         | 9         |
| Węzły / krawędzie     | 98 / 93   | 72 / 62   | 87 / 78   |
| Odrzucone kandydaty   | 0         | 0         | 0         |
| Extent (min..max)     | 0.09..0.60 | 0.10..0.52 | 0.16..0.56 |
| Mieszanka archetypów  | irregular:1 atoll:5 winding:1 round:2 branched:1 | winding:3 irregular:2 round:3 elongated:1 branched:1 | elongated:4 lagoon:2 round:1 irregular:1 branched:1 atoll:1 |

Zrzuty paneli aplikacji dla tych seedów trzeba odtworzyć tym samym poleceniem
(sekcja 4); do tego czasu tabela w sekcji 4 opisuje stary model. Różnica
widoczna od razu: wiersz `Landmass layout generation` spada z ~2 s do kilku ms,
a warstwa `Landmasses` renderuje geometrię zamiast rastra identyfikatorów.
Status: zrzuty do uzupełnienia.

## 6. Potwierdzone nazwy i ustawienia

- archetypy docelowe: `round`, `irregular`, `elongated`, `winding`, `branched`,
  `lagoon`, `atoll` (plan §5),
- minimalny formularz: pula archetypów (multi-select), liczba struktur, typowa
  skala i różnorodność wielkości (plan, Etap 5),
- bez ustawień makroregionów w tym refaktorze (plan §2.1).

## 7. Powtórzenie

1. `pnpm run bench` — pełny przebieg trwa kilka minut, bo `2048²` dominuje;
   do szybkich porównań można zawęzić listę rozdzielczości w pliku bench.
2. W aplikacji: seed z listy, domyślny świat `1000²` i viewport `600²`,
   domyślne pozostałe etapy, warstwa `Landmasses`; odczyty z paneli wg tabeli z
   sekcji 4 i porównanie ze zrzutami w `docs/baseline/`.
