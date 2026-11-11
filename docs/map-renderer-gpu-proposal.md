# Renderer mapy na GPU — research i propozycja

Stan na 11.11.2026. Dokument opisuje możliwy kierunek przyspieszenia podglądu
mapy. To propozycja do zweryfikowania prototypem, nie decyzja o przepisaniu
renderera.

## Wniosek

Najbardziej obiecującym kierunkiem jest hybrydowy renderer oparty na WebGL:
generator nadal tworzy dane w TypeScripcie, a GPU przelicza wartości rastrów
na kolory i wyświetla je. Nie oznacza to rezygnacji z pikseli — shader nadal
oblicza wynik dla fragmentów obrazu, ale równolegle na GPU, zamiast wykonywać
główne pętle pikseli kolejno w JavaScripcie.

Warto rozważyć tę zmianę dopiero po pomiarach. Koszt przesłania danych na GPU,
kompozycja warstw i pamięć tekstur mogą ograniczyć zysk albo go zniwelować.

## Stan obecny

Renderer działa w głównym wątku i korzysta z Canvas2D. `CatalogLayer` próbuje
wartości rastra i wypełnia piksele, a `SmoothLayerPainter` dodatkowo próbuje
obszary przy granicach, żeby je wygładzić. Renderowanie jest dzielone na kafle,
co pozwala oddawać sterowanie przeglądarce w trakcie pracy, ale nie usuwa
kosztu obliczeń pikselowych na CPU.

Szczegóły implementacji znajdują się w
[`catalog-layer.ts`](../src/utils/map-renderer/layer/catalog/catalog-layer.ts),
[`smooth-layer-painter.ts`](../src/utils/map-renderer/layer/catalog/smooth-layer-painter.ts)
i [`render-metrics.ts`](../src/utils/map-renderer/metrics/render-metrics.ts).
Metryki pozwalają rozdzielić czas renderowania warstw, nakładek, prezentacji
i pierwszego kafla — przed wyborem warstwy do prototypu trzeba sprawdzić, która
z nich rzeczywiście dominuje.

## Co pokazuje research

- **WebGL** pozwala wykonywać grafikę 2D i 3D z użyciem akceleracji GPU.
  Tekstury mogą zawierać nie tylko gotowy obraz, ale też dane z tablic
  numerycznych, które shader interpretuje podczas rysowania.
- **MapLibre GL JS** jest przykładem interaktywnego renderera map używającego
  WebGL. Jego model rozdziela m.in. warstwy rastrowe i wektorowe, zamiast
  próbować przedstawiać wszystkie dane jednym sposobem.
- **Rastry i wektory rozwiązują różne problemy.** Ciągłe pola, takie jak
  wysokość, temperatura czy wilgotność, naturalnie pasują do tekstur
  rastrowych. Regiony, linie i etykiety mogą być geometrią wektorową.
- **OffscreenCanvas i worker to inny rodzaj optymalizacji.** Mogą przenieść
  pracę poza główny wątek, ale same nie gwarantują krótszego czasu renderu.
  Nie należy utożsamiać tego z przeniesieniem obliczeń pikselowych na GPU.
- **GPU ma własne ograniczenia.** Koszt wgrywania tekstur i pamięć VRAM trzeba
  mierzyć; synchroniczne odczytywanie wyników z GPU może zniwelować korzyści.
  Przykładowa tekstura RGBA zajmuje około 16 MiB przy 2048 × 2048 i 64 MiB
  przy 4096 × 4096, bez buforów pośrednich i innych kopii.

Źródła:

- [MDN: WebGL API](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API)
- [MDN: WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
- [WebGL Fundamentals: Data textures](https://webglfundamentals.org/webgl/lessons/webgl-data-textures.html)
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/)
- [MapLibre Style Specification: layers](https://maplibre.org/maplibre-style-spec/layers/#raster)
- [MDN: OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas)

## Proponowany kształt rozwiązania

1. Pozostawić generowanie świata w TypeScripcie i zachować obecne tablice
   typowane jako dane wejściowe renderera. Nie wprowadzać zależności
   renderowania do generatora.
2. Dodać eksperymentalną implementację WebGL 2 dla jednej, pomiarami wybranej
   warstwy rastrowej. Tekstura przechowuje wartości warstwy, a shader mapuje je
   na paletę, stosuje maskę i wykonuje potrzebne próbkowanie. Warstwa jest
   rysowana na obszarze mapy; przesunięcie i zoom powinny aktualizować
   transformację, nie uruchamiać ponownie pętli kolorującej piksele w JS.
3. Przechowywać tekstury między klatkami i aktualizować je dopiero po zmianie
   danych. Mierzyć osobno czas wgrywania danych i czas rysowania, żeby nie
   ukryć kosztu transferu.
4. Pozostawić Canvas2D jako działającą ścieżkę porównawczą i ewentualny fallback.
   Nie przenosić od razu wszystkich warstw, overlayów ani interakcji.
5. Jeśli prototyp się sprawdzi, przenosić kolejne typy warstw etapami. Geometrię
   regionów, granice i etykiety można rozważyć jako osobne warstwy wektorowe;
   nie ma potrzeby wektoryzować wszystkich pól rastrowych.

WebGL 2 jest rozsądniejszym pierwszym prototypem niż WebGPU: ogranicza zakres
zmiany i pozwala sprawdzić główną hipotezę bez jednoczesnego projektowania
nowego pipeline'u generowania obliczeń. WebGPU można ocenić później, jeśli
konkretny profil obliczeń uzasadni jego dodatkową złożoność.

## Plan prototypu i kryteria decyzji

1. Zapisać baseline dla reprezentatywnego świata i rozmiaru okna: czas każdej
   warstwy, pierwszego kafla, pełnego renderu, prezentacji oraz użycie pamięci.
2. Wybrać najwolniejszą warstwę rastrową z pomiaru, a nie zakładać z góry,
   która warstwa będzie najlepszym kandydatem.
3. Wykonać tę samą warstwę przez Canvas2D i WebGL 2 dla identycznych danych,
   rozdzielczości i ustawień. Osobno zmierzyć pierwszy render, kolejne
   renderowanie, zmianę zoomu/przesunięcia oraz koszt aktualizacji tekstury.
4. Porównać obrazy, w tym maski mapy, palety, wygładzanie granic i zachowanie
   przy różnych DPR. Różnice jakościowe powinny być jawnie zaakceptowane,
   a nie wynikać przypadkowo z innego filtrowania.
5. Kontynuować tylko wtedy, gdy prototyp daje istotny zysk na docelowych
   urządzeniach bez nieakceptowalnego zużycia pamięci, pogorszenia obrazu
   ani utraty responsywności. Konkretne progi wydajności należy ustalić na
   podstawie baseline'u.

Nie należy na tym etapie przepisywać generatora, dodawać wielu workerów ani
wprowadzać MapLibre jako zależności. To oddzielne kierunki, które nie usuwają
bezpośrednio kosztu obecnych pętli pikselowych w rendererze.
