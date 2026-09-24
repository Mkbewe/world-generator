# Architektura `map-generator` — review

Zakres: `src/utils/map-generator` oraz te powiązania poza modułem, bez których
ocena kierunku zależności byłaby fałszywa (`map-layers`, sesja generowania,
renderer). Punkt odniesienia: `docs/world-generation-roadmap.md`, zwłaszcza
§2, §4, §7 i §9. UI, wymagania produktowe i nazewnictwo pominięte, chyba że
tną strukturę.

Ocena: **6 / 10**.

Rdzeń pipeline'u jest świadomie zaprojektowany i da się go czytać. Granice
modułu i kontrakt danych nie udźwigną pozostałych ośmiu etapów z roadmapy bez
przeróbki. To nie jest bałagan. To jest szkielet, który już przecieka, a
kolejne etapy będą te przecieki powielać.

## Co jest w porządku

- `MapStage` jest mały. `MapGenerator` nie wie, co liczą etapy, waliduje
  identyfikatory i klucze przy konstrukcji i nie renderuje.
- Kolejność etapów ma jedno źródło (`PIPELINE_STAGES`), a fabryka jest
  wyczerpująca przez `Record<PipelineStageId, …>`.
- Nazwane strumienie losowości (`RandomFactory`) są właściwym portem seeda.
- `LandmassLayoutStage` nie skanuje komórek. To jedyny etap, który skaluje się
  z liczbą struktur, nie z rozdzielczością.
- Modele `MacroRegionGeometry` i `ArchetypeRecipe` są danymi, nie hierarchią
  klas. Przy tym pipeline to właściwy poziom abstrakcji — anemiczny rekord plus
  funkcje nie są tu wadą.

## 1. Warstwy i kierunek zależności

Przyjęty podział to nie Clean Architecture. Obowiązuje zasada z roadmapy:
pipeline niezależny od renderowania i UI. Ta zasada jest już złamana, w obie
strony.

### Cykl generator ↔ katalog warstw

`types.ts` importuje `MapRasters` z `map-layers`. `MapState` to
`MapRasters & MapDomainData`. `info-definitions.ts` importuje stamtąd
`MapInfo`. `pipeline-worker.types.ts` importuje `MapRasters` jako typ danych
reużywanych przez workera.

`map-layers/catalog.ts` importuje `PIPELINE_STAGES` z generatora, żeby
posortować katalog. `map-layers/types.ts` wyprowadza `MapRasters` z katalogu.

Efekt: typ stanu generatora jest kształtem katalogu prezentacji. Nowy raster
nie istnieje w typie stanu, dopóki ktoś nie doda wpisu UI. Katalog nie może
żyć bez listy etapów. To odwrócona zależność i cykl, nie „wspólne typy”.

Szkoda: każdy kolejny etap (heightmapa, klimat, hydrologia) będzie negocjował
swój kontrakt z rejestrem rastrów, zanim powstanie jako etap. `MapRasters`
zależy od zbioru wpisów (`source` + `dataType`), nie od palet ani kolejności
katalogu. Zmiana koloru nic nie rusza. Dodanie bufora albo zmiana jego typu
rusza typ stanu, od którego zależy worker.

Powinno być odwrotnie. Generator posiada nazwy i typy swoich wyjść
(`WorldMask`, `NoiseField`, `LandmassLayout`). Katalog warstw mapuje te wyjścia
na palety i zakładki. `MapRasters` zostaje typem prezentacji.

### Publiczne API jest przypadkowe

`index.ts` eksportuje fasadę. `stages/index.ts` eksportuje dwa z czterech
etapów i nic więcej. Konsumenci i tak wchodzą w pliki implementacji:

- renderer: `createMacroRegionSampler`, `createRegionDisplacement`,
  `structureSegments`, `segmentsDistance`, `isLandmassLayout`,
- formularze: `macro-region-sizes`, `macro-region-presets`,
  `landmass-layout/archetypes`, `landmass-defaults`,
- sesja: `isLandmassLayout` plus ręczny zszywacz `landmassLayout`.

Współdzielenie samplerów między generowaniem a malowaniem granic jest słuszną
decyzją (jeden klasyfikator, dwa konsumentów). Zła jest lokalizacja: funkcja
siedzi w pliku etapu rastrowego, a geometria kolizji w pliku, którego nazwa
mówi „placement”. Nie ma portu domenowego. Jest import ścieżki.

Jest też drugi, ręczny port seeda. Renderer składa `createRegionDisplacement`
od nowa z tym samym seedem (`map-scene.ts`). Strumień `'macro-region'` powstaje
w `RandomFactory` poza kontekstem generatora. Zgodność granic z rastrem wisi na
powtórzonej nazwie strumienia. Przy porcie wyjść etapów trzeba to nazwać,
inaczej zmiana namespace'u w jednym miejscu rozjedzie podgląd z danymi.

`world-grid.ts`, `macro-region-sizes.ts` i presety to reguły edytora
(procenty, budżet MB, etykiety presetów) położone obok pętli rastrowej.
Ograniczenia domeny (`MAX_MACRO_REGIONS`, zakres `size`) powinny zostać przy
generatorze. Arytmetyka suwaka granic nie.

### Dwa kanały na jeden wynik

Etap zwraca `StageData` (`Record<string, unknown>`) i jednocześnie zapisuje
pola na wspólnym, mutowalnym `context.state`. Raster idzie do katalogu przez
`selectRasters`. Graf landmassów nie jest rastrem, więc sesja ma osobną gałąź:

```ts
const layout = data.landmassLayout;
if (isLandmassLayout(layout)) {
  this.updateLayoutInfo(layout);
}
```

oraz drugą przy reużyciu, bo pominięty etap nic nie emituje:

```ts
const savedLayout = cached?.info?.landmassLayout;
if (isLandmassLayout(savedLayout)) {
  info.landmassLayout = savedLayout;
}
```

`MAP_INFO_CATALOG` umie wyprowadzić dane z konfiguracji (`macroRegionLabels`,
`worldDimensions`). Nie umie przyjąć produktu etapu. Roadmapa §6.2 nazywa to
„planem B”. Plan B jest już potrzebny, a zamiast niego jest `if` w sesji.
Worker seeduje stan wyłącznie `cachedRasters`. `landmassLayout` do workera nie
wraca. Dziś nikt poniżej layoutu go nie czyta. `HeightmapStage` z roadmapy
będzie czytał — i przy selektywnym przeliczeniu zobaczy `undefined`, jeśli
layout został pominięty.

To jest najważniejsza dziura kontraktu. Nie bug na dziś. Ściana na etap 6.

## 2. Projekt obiektów

Nie ma boskiej klasy. Jest boska procedura i worek stanu.

`placement.ts` (~500 linii, kilkanaście stałych, mutowalny `PlacementContext`)
robi naraz: kotwice, wyszukiwanie, obroty, skurcze, grupy, półki i naprawę.
`topology.ts` (~420 linii) składa korytarz, redukuje węzły, liczy promień
bezpieczny dla krzywizny i dokleja odnogi. `LandmassLayoutStage` sam jest
przyzwoitym orkiestratorem — woła plan, skaluje, stawia, waliduje. Problem nie
leży w klasie etapu. Leży w tym, że wariant kształtu i wariant geometrii nie
mają zachowania, więc zachowanie wraca jako `if`.

`MapConfig` rośnie o opcjonalne pola każdego etapu. Przy czterech etapach to
jeszcze formularz, nie worek. Przy dwunastu będzie workiem, jeśli etap nie
dostanie własnego typu wejścia i wyjścia, tylko kolejny klucz na współdzielonym
stanie.

`MapStage` spełnia ISP. `StageData` i `MapState` go łamią: każdy konsument
widzi wszystko i nic nie jest sprawdzone przez typ. `summarize` landmassów
rzutuje `data.landmassLayout as LandmassLayout`. Rzutowanie w kontrakcie
pipeline'u oznacza, że kontrakt nie istnieje.

Tańszy dług tego samego rodzaju: `PipelineStageId` istnieje, a `MapStage.id`,
`StageInfo.id`, `skipStageIds` i `dirtyStageIds` i tak są gołymi `string`.
Literówka w identyfikatorze etapu przechodzi typ. To nie jest osobny problem
architektury, tylko dociśnięcie, które powinno jechać z nazwanymi wyjściami
i z grafem zależności.

Komentarz przy `configKeys` w `stage.ts` jest nieaktualny. Mówi, że selektywne
przeliczanie rusza dany etap i każdy późniejszy. `selectDirtyStageIds` rusza
wyłącznie etapy, które same wymieniły zmieniony klucz. Kto napisze następny
etap według komentarza, zaprojektuje złe zależności.

## 3. Skalowanie

Pionowo (większa siatka) trzy etapy rastrowe są tym samym skanem wiersz po
wierszu, z sprawdzeniem `AbortSignal` raz na wiersz. To uczciwe i zgodne z
§9. Nie ma tu ukrytego algorytmu kwadratowego. Wąskie gardło pamięci
(`postMessage` kopiuje bufor przy każdym `stage-completed`) jest już opisane
w roadmapie; architektonicznie wynika z tego, że zdarzenie postępu niesie
snapshot danych. Protokół progresu i transfer masowy to jeden typ.

Poziomo jest gorzej, i to nie przez brak puli workerów.

Kolejność wykonania, zakładki ustawień i zakładki podglądu to ta sama lista.
Landmass nie czyta szumu ani makroregionów, a w pełnym przebiegu czeka na oba
pełne skany. Nie da się go uruchomić zaraz po masce, nie przestawiając zakładek.
Przy 10 000² to nie jest mikrooptymalizacja. To sprzężenie harmonogramu z UI.

Zależności danych nie są grafem. Są ręcznie wpisanymi stringami
(`'world.seed'`, `'noise'`), chodzonymi w runtime przez `reduce` i rzutowanie.
Statyczna lista nie umie powiedzieć „makroregiony zależą od `noise` tylko gdy
`source === 'noise-map'`”. Kod wybiera nadmiar: `MACRO_REGION_STAGE` zawsze
wymienia `noise`, a test to utrwala (zmiana częstotliwości brudzi
`macro-region`). Roadmapa §2.8 twierdzi coś przeciwnego: zmiana noise w trybie
`dedicated` makroregionów nie rusza. Architektura nie umie wyrazić zależności
warunkowej, więc dokument i kod rozjechały się w bezpieczną stronę — kosztem
zbędnego pełnego skanu.

OCP przy dodaniu etapu rastrowego jest dziś akceptowalne: definicja, fabryka,
klasa, wpis katalogu. OCP przy zmianie geometrii świata nie istnieje.

`containsWorld` to trójargumentowy wybór `'disc' | 'rectangle'`. Współrzędne
nie mają jednego układu:

- maska świata: −1..1, wycentrowane,
- szum, makroregiony, landmassy: 0..1,
- `createShapeSampler` przelicza między nimi w jednym miejscu,
- `distanceBetween`, pierścienie (`Math.hypot` od środka 0.5), siatka kolizji
  i kotwice zakładają płaski kwadrat bez zawijania.

§7 (cylinder, `wrapX`, krótsza droga przez krawędź, okresowy szum) nie ma
portu, w który można to włożyć. Wejdzie jako `if (wrap)` do szumu, regionów,
placementu, kolizji i geometrii albo jako późny, bolesny `Space`. Komentarz
w `world.ts` („later irregular worlds need no change here”) jest prawdziwy
tylko dla maski. Metryka i tak się zmieni. Maska tego nie ukryje.

Jednowątkowy worker jest świadomą decyzją (§9) i nie jest zarzutem. Zarzutem
jest brak zadeklarowanych wejść/wyjść etapu, bez których pula workerów i tak
nie będzie miała co dzielić.

## 4. Duplikacja i łatki

### Placement ma dwa algorytmy

Kontrakt `placeStructures` mówi, że kandydat wchodzi tylko wtedy, gdy niczego
nie nachodzi. Potem `validateAndRepair` robi do ośmiu przejść odpychania i
wyrzuca to, co nadal nachodzi albo wystaje. Nachodzenie nie jest próbowane:
`segmentsDistance` bierze analityczny najbliższy punkt dwóch odcinków
(`segmentDistance`) i odejmuje promienie w tych punktach. `MAX_SEGMENT_SAMPLES`
dotyczy wyłącznie `insideWorldShare` — udziału korytarza w masce świata, nie
kolizji struktur. Skoro przyjęcie kandydata już używa tej samej dokładnej
odległości i tej samej łamanej (`structureSegments`), pętla odpychania nie łata
niedokładnego testu. Redukcja korytarza do sześciu punktów kontrolnych też tego
nie tłumaczy: obie ścieżki patrzą na tę samą łamaną. Wygląda na ścieżkę obronną.
Nie wycinać jej na wiarę. Property test z licznikiem przesunięć i odrzuceń
powie, czy funkcja kiedykolwiek coś robi. Zero oznacza wycięcie. Niezero
oznacza szukanie prawdziwego rozjazdu — indeks przestrzenny, pchnięcie, błąd
zmiennoprzecinkowy — a nie próbkowania kolizji.

`shelfId: ''` nie wycieka do opublikowanego layoutu. `createGroupShelves`
pokrywa każdy zachowany indeks, a `validateLayout` widzi dopiero wynik.
Pusty string jest ucieczką typu (`shelfOf.get(...) ?? ''`), bo placement
buduje `GeologicalStructure` zamiast `PlaceableStructure`. To dług typu, nie
kontraktu. Identyfikatora półki nie da się nadać przy budowie grafu: powstaje
dopiero po grupowaniu. Naprawa to zawężenie typu w `entryOf`, nie wcześniejsze
przypisanie półki.

Rozpuszczenie grupy, gdy lider się nie mieści, jest degradacją i jest w
porządku. Drabinka skurczów (`1, 0.85, 0.7, …`) jest heurystyką wyszukiwania,
nie łatą — pod warunkiem, że zostaje w jednym miejscu, a nie obok naprawiacza.

### Przepis archetypu ma dwie semantyki

`buildCorridor` ucieka w `buildWindingCorridor`, gdy `archetype === 'winding'`.
W tym wariancie `bends` to liczba odcinków, a `wobble` to szansa na prosty
kawałek. W pozostałych `bends` to liczba półfal sinusa, a `wobble` to amplituda.
Ten sam `ArchetypeRecipe`, dwa języki. Zamknięcie w pierścień nie jest polem
przepisu. Jest progiem `CLOSED_TURN = 6.1`, który `atoll` przekracza
(6.15..6.28), a `lagoon` nie (4.2..5.6). Nowy kształt zamknięty albo łamany
to kolejny `if` i kolejna magiczna liczba, nie nowy builder.

Powinno być strategy korytarza (`integrate`, `randomWalk`, `closedRing`)
wybierane przez przepis, nie przez nazwę archetypu i próg na radianach.

### Geometria regionu jest unią bez zachowania

W `macro-region-stage.ts` są cztery funkcje z `kind === 'ring'`:
`geometryCoordinate` (dwa warianty tego samego warunku), `containsCoordinate`,
`distanceToCoordinate` i `validateGeometry`. Piąta, `geometryShare`, jest w
`macro-region-sizes.ts` i przy niezgodności układu z rodzajem zwraca `1` —
cicha łatka zamiast błędu. Operacje na wariancie warto dodać przy §6.4
(pierścienie dzielone), nie jako osobną inicjatywę. `if` na archetypie
w `topology.ts` to inna, mniejsza sprawa i §6.4 jej nie wymusi.

`ownerIndex` po deformacji może nie trafić w żaden region bazowy i wtedy bierze
najbliższy. Niezmiennik „każda komórka ma dokładnie jeden region” nie wynika
z modelu. Wynika z fallbacku. To jest łatka na przemieszczenie, które psuje
partycję.

`RegionOffset = number | { x, y }` pakuje dwie strategie przemieszczenia
w jedną funkcję z `typeof`. `createRegionDisplacement` już jest właściwym
rozwidleniem. Gałąź powinna zostać tam, a nie w liczeniu współrzędnej.

### Skopiowane pętle i drobiazgi

`WorldShapeStage`, `NoiseStage` i `MacroRegionStage` powielają skan
(dzielnik `n - 1`, abort na wiersz, raport postępu, zapis na stan, walidacja
rozmiaru bufora). Heightmapa, klimat i hydrologia skopiują go jeszcze trzy
razy, łącznie z własnym sprawdzeniem „poprzedni bufor istnieje i ma właściwą
długość”. To powinno być jedno przejście po komórkach maski i zadeklarowane
wejście etapu, nie stringowy błąd w połowie `execute`.

`isNormalized` jest w dwóch etapach. `RADIAL_EXTENT = 0.5` jest w presetach
i w `macro-region-sizes`. Tasowanie Fishera–Yatesa jest w `placement.ts`
i w `grouping.ts`. Drobne. Nie ruszają architektury. Progi i przepisy
archetypów — tak.

## 5. Konkrety

| Miejsce | Co jest nie tak | Dlaczego szkodzi | Jak powinno wyglądać |
| --- | --- | --- | --- |
| `types.ts` + `map-layers/catalog.ts` | Cykl. Stan generatora jest typem rejestru rastrów (`source` + `dataType`), nie palet. | Nowy bufor zaczyna się od wpisu katalogu. Katalog i generator nie dadzą się zmienić osobno. Paleta i kolejność zakładek typu nie ruszają. | Generator definiuje wyjścia. Katalog je konsumuje. Zero importu `map-layers` w `map-generator`. |
| `generation-worker.ts`, `world-generation-session.ts` | Reużycie niesie tylko rastry. Graf landmassów jest doszyty `if (isLandmassLayout)` w sesji. | Pierwszy etap, który czyta layout przy pominiętym `landmass-layout`, dostanie pusty stan. Każdy kolejny produkt domenowy (wyspy, biomy, lokacje) dostanie własnego `if`. | Etap deklaruje wyjścia. Kanał reużycia przywraca je wszystkie, nie tylko klucze z katalogu rastrów. Sesja nie zna `landmassLayout`. |
| `stage.ts` vs `selective-regeneration.ts` | Komentarz opisuje kaskadę „ten etap i wszystkie późniejsze”. Kod jej nie robi. | Następny autor zadeklaruje zależności pod fałszywy model. | Jeden opis: brudne są tylko etapy, które wymieniły zmieniony wycinek. Kaskada, jeśli wróci, ma być jawną krawędzią danych, nie komentarzem. |
| `stage-definitions.ts` (`MACRO_REGION_STAGE`) | `noise` jest zależnością zawsze. Roadmapa mówi, że w trybie `dedicated` nie jest. | Zbędny skan 10 000² albo, po „naprawie” ifem, cicha rozjazdówka z testem, który dziś wymaga nadmiaru. | Zależność warunkowa przy diffie konfiguracji, nie flaga dopisana w `selectDirtyStageIds` ad hoc. Test i §2.8 mają mówić to samo. |
| `PIPELINE_STAGES` | Jedna lista jest kolejnością liczenia i kolejnością UI. | Nie da się zrównoleglić ani przestawić etapu niezależnego bez ruszania zakładek. Hydrologia i erozja z §4 nie wejdą jako graf, tylko jako kłótnia o indeks. | Graf danych dla workera. Osobna, pochodna kolejność prezentacji. |
| `world-shape.ts`, `noise-stage.ts`, `macro-region-stage.ts`, `geometry.ts` | Dwa układy współrzędnych, euklidesowa odległość, brak metryki. | §7 dotknie każdego pliku, który liczy dystans albo próbkę. Powstaną lokalne `if (wrapX)`. | Port `Space`: normalizacja, odległość, próbka szumu, sąsiedztwo. Etapy dostają go z kontekstu. `containsWorld` zostaje predykatem maski, nie topologią. |
| `placement.ts` `validateAndRepair` | Drugi przebieg po kontrakcie, który już sprawdza nachodzenie analitycznie. Próbkowanie (`MAX_SEGMENT_SAMPLES`) jest tylko w `insideWorldShare`. | Nie wiadomo, czy funkcja kiedykolwiek przesuwa albo odrzuca. Wycinanie na wiarę może usunąć realny rozjazd albo martwy kod. | Zmierzyć licznikiem w property teście. Zero: wyciąć. Niezero: nazwać przyczynę (indeks, pchnięcie, float), nie próbkowanie kolizji. |
| `topology.ts` `buildCorridor` | `if (archetype === 'winding')` i próg `CLOSED_TURN`. Pola przepisu znaczą co innego zależnie od nazwy. | Nowy archetyp to edycja silnika, nie nowego przepisu. Lagoon/atoll różni magiczna stała, nie model. | `CorridorBuilder` w przepisie. Nazwa archetypu nie występuje w `if`. |
| `macro-region-stage.ts` `ownerIndex` | Fallback do najbliższego regionu, gdy deformacja wyjmie punkt ze wszystkich bazowych. | Partycja jest łatana po fakcie. Screen-space i raster muszą powielać ten sam fallback, inaczej granice kłamią. | Przemieszczenie zachowuje partycję (współrzędna liczona tak, żeby zawsze ktoś zawierał punkt) albo naprawa partycji jest nazwanym krokiem samplera, nie pętlą „na wszelki wypadek”. |
| `macro-region-stage.ts`, `macro-region-sizes.ts` | Cztery funkcje z `kind === 'ring'` w etapie, piąta (`geometryShare`) w pliku rozmiarów. | Nowy rodzaj geometrii (§6.4) to kilka edycji i ryzyko, że jedna zostanie pominięta. | Metody na wariancie przy okazji pierścieni dzielonych, nie osobny refaktor. |
| `noise-stage.ts`, `world-shape-stage.ts`, `macro-region-stage.ts` | Trzy kopie skanu i trzy ręczne sprawdzenia poprzedniego bufora. | Heightmapa skopiuje czwartą, łącznie z własnym komunikatem błędu. Wejścia etapu nie są częścią typu. | `scanMaskedCells` + zadeklarowane `requires`. Brak wejścia wyłapuje generator przed `execute`, nie środek pętli. |

## Rekomendacje

Kolejność to kolejność szkody przy dopisywaniu etapów z roadmapy, nie kolejność
łatwości.

1. **Rozciąć cykl i nazwać wyjścia etapu.** Generator nie importuje
   `map-layers`. Każdy etap deklaruje typowane wejścia i wyjścia. `MapState`
   składa się z tych wyjść, a nie z rejestru rastrów. Sesja i worker reużywają
   ten sam zestaw, rastry i dane domenowe. Znika `if (isLandmassLayout)` w
   sesji. Identyfikatory etapów zwęzić do `PipelineStageId`. Strumień
   `'macro-region'` przestaje być ręcznie odtwarzany w rendererze.
2. **Wprowadzić port przestrzeni zanim powstanie topologia z §7.** Jeden układ
   współrzędnych, jedna odległość, jedna normalizacja próbki. Maska świata
   zostaje predykatem. Bez tego cylinder będzie serią łatek w szumie, regionach,
   placementcie i kolizji.
3. **Oddzielić graf zależności od kolejności UI.** `configKeys` zostają, ale
   diff musi umieć zależeć warunkowo (noise tylko przy `noise-map`), a wykonanie
   nie może być tożsame z kolejnością zakładek. Poprawić komentarz w `stage.ts`
   i zdanie w §2.8, żeby nie opisywały dwóch różnych reguł.
4. **Placement: zmierzyć naprawiacz, potem zdecydować.** Kolizja
   odcinek–odcinek już jest dokładna — nie mylić jej z próbkowaniem maski
   (`insideWorldShare`). Property test z licznikiem przesunięć i odrzuceń.
   Zero: wyciąć `validateAndRepair`. Niezero: nazwać przyczynę, nie dodawać
   trzeciego algorytmu. Osobno zawęzić `entryOf` do `PlaceableStructure`,
   żeby `shelfId: ''` nie był ucieczką typu.
5. **Właściciel zachowania i nazwa od rzeczy, nie klasa na każdą funkcję.**
   Geometria regionu, builder korytarza i przemieszczenie granicy stają się
   obiektami. Reszta zostaje danymi i funkcjami. Przy tym samym ruchu pliki
   dostają foldery etapów i nazwy z sekcji 6. Sam rename worków jest zabroniony.
   Geometria regionu wchodzi przy §6.4. `if (archetype === 'winding')` jest
   osobną, mniejszą sprawą i §6.4 jej nie załatwi.

Nie ruszać teraz: jednowątkowego workera, rekordów konfiguracji i węzłów,
`MapStage` jako kontraktu etapu, nazwanych strumieni losowości. To nie jest
dług. Nie zamieniać każdej funkcji na klasę.

## 6. Pliki, nazwy, właściciel zachowania

Dużo plików i mimo to kilka worków. Sam podział na pliki nic nie dał, bo cięcie
nie szło po odpowiedzialności, a nazwy nie mówią, co jest w środku.

Największe pliki bez testów: `placement.ts` (~460), `topology.ts` (~390),
`geometry.ts` (~280), `macro-region-stage.ts` (~270), `types.ts` i
`collision.ts` (~210). `landmass-layout/` ma trzynaście plików i nadal trzy
z nich są procedurami, nie modułami.

Nazwy, przy których nie wiadomo, co otworzyć:

- `world.ts` — sampler maski, nie świat,
- `types.ts` w landmassach — przepis i szkic struktury; typy domeny są w
  rodzicu, też `types.ts`,
- `topology.ts` — budowa korytarza, nie topologia świata z §7,
- `geometry.ts` — przesunięcia, odcinki, odległość i promienie naraz,
- `collision.ts` — indeks, odstęp, udział w masce i walidacja placementu,
- `grouping.ts` — półki, nie grupy w sensie ogólnym,
- `macro-region-sizes.ts` — arytmetyka suwaka, nie rozmiar rastra,
- `world-grid.ts` — szacunek kosztu dla formularza,
- `selective-regeneration.ts` — wybór brudnych etapów,
- `stage.ts` obok `stage-definitions.ts` — kontrakt i katalog, łatwo pomylić.

Funkcyjny styl nie jest tu wadą sam w sobie. Wadą jest zachowanie bez
właściciela: pięć `if (kind)`, `if (archetype)`, `typeof` na przemieszczeniu.
To dlatego wszystko ląduje w wolnych funkcjach w pliku o ogólnej nazwie.
Klasa na pętlę rastrową albo na `distanceBetween` zrobi boski obiekt i nic nie
uporządkuje. Obiekt ma powstać tam, gdzie wariant już powinien nieść
zachowanie: geometria regionu, builder korytarza, przemieszczenie granicy.
`LandmassNode`, konfiguracja i bufor zostają danymi.

Docelowy kształt, nazwa od rzeczy, nie od czasownika:

- `pipeline/` — generator, kontrakt etapu, fabryka,
- `stages/world-shape/`, `stages/noise/` — etap i jego typy obok siebie,
- `stages/macro-region/` — etap, `region-geometry`, `region-sampler`,
  `border-displacement`; arytmetyka suwaka i presety poza pętlą rastra,
- `stages/landmass/` — etap, `corridor`, `influence` (odcinki i odległość),
  `placement` (tylko wyszukiwanie), `shelves`, `mask-sampler`, `layout-check`.

Nie robić osobnego przejścia „tylko rename”. Przeniesienie worków pod ładniejsze
nazwy utrwala bałagan. Porządek idzie razem z właścicielem zachowania: jak
geometria regionu dostaje metody, plik przestaje nazywać się `sizes` albo
`stage`.
