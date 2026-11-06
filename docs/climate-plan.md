# BaseClimate i Climate — plan etapów

Plan roboczy klimatu. Opisuje dwa etapy: **BaseClimate** (bazowa warstwa przed
geologią) i **Climate** (ciągłe pola oraz hydrologia po heightmapie). Biomy są
osobnym etapem.

## Nazwy etapów

- **BaseClimate** — `base-climate`, `BaseClimateStage`; strefy ciepła, bazowa
  wilgotność i bazowy kierunek prądów morskich.
- **Climate** — `climate`, `ClimateStage`; ciągła temperatura, wilgotność,
  woda i hydrologia, liczone po heightmapie.

Słowo „climate” zostaje przy drugim etapie, bo tam powstaje właściwy klimat.
BaseClimate nie udaje pełnego klimatu: daje tylko bazowy układ świata.

## Cel

BaseClimate ma być pierwszą warstwą klimatyczną świata, która:

- dzieli świat na pasma albo pierścienie z klasą ciepła,
- dostarcza geologii informację, w jakiej strefie leży region,
- buduje bazowe pole wilgotności niezależnie od stref ciepła,
- definiuje bazowy kierunek prądów morskich,
- pozwala budować różne światy przez konfigurację, nie przez gałęzie na nazwę
  presetu,
- jest deterministyczna i tania obliczeniowo.

Poza zakresem BaseClimate: ciągłe pola temperatury i wilgotności, lapse rate,
cień opadowy, rzeki, jeziora i biomy.

## Decyzja: strefy zamiast baseline'u

Nie tworzymy osobnego obiektu `WorldClimateBaseline` ani osobnej funkcji
punktowej z temperaturą, wilgotnością i wiatrem.

Zamiast tego:

- konfiguracja świata definiuje **strefy ciepła**,
- BaseClimate zapisuje **mapę stref** — numer strefy dla każdego punktu,
- strefa niesie klasę: `cold`, `temperate` albo `warm`,
- geologia czyta strefę w środku regionu,
- Climate użyje mapy stref, wilgotności bazowej i prądów.

## Model stref ciepła

Dostępne są dwa układy, jak w makroregionach:

- **pasma (belts)** — poziome albo pionowe pasy, każdy z położeniem i szerokością,
- **pierścienie (rings)** — koncentryczne pierścienie ze środkiem i promieniami.

Każda strefa ma:

- `id` i `label`,
- geometrię: pasmo albo pierścień,
- klasę ciepła: `cold`, `temperate` albo `warm`.

Kolejność i szerokość stref decydują o rozmieszczeniu ciepła. Nie ma osobnego
trybu „odwrócony pierścień”: wystarczy ułożyć pierścienie tak, żeby zewnętrzne
były ciepłe, a środkowy zimny. Analogicznie pasma mogą mieć gorąco na górze,
na dole albo w środku.

Przykładowe presety:

- **Earth-like** — zimne pasma przy krawędziach, umiarkowane w środku, ciepłe
  w pasie równikowym,
- **Ring world** — umiarkowany środek, ciepły pierścień i zimna krawędź,
- **Cold core** — zimny środek i ciepłe zewnętrzne pierścienie.

## Wilgotność bazowa

`moistureBaseMap: Float32Array` jest niezależnym polem noise — **nie jest
sprzężona geometrycznie ze strefami ciepła**.

Generowana jest jako czyste FBM z dedykowanego strumienia
`base-climate.moisture`. Kilka oktaw, duża skala przestrzenna (~0.3–0.5
szerokości świata), wartości 0..1.

To nie jest symulacja cyrkulacji. To tylko podstawa, żeby świat nie był wszędzie
tak samo wilgotny. Ręczne strefy wilgotności dochodzą dopiero w Climate.

Na start brak suwaków wilgotności; seed wystarcza. Parametry noise'u dodajemy
tylko wtedy, gdy testy wzrokowe pokażą problem.

## Prądy morskie

`oceanCurrentMap: Float32Array` przechowuje **kąt przepływu** 0..2π na komórkę,
a `oceanCurrentStrength: Float32Array` siłę 0..1. To statyczne strzałki, nie
symulacja fizyki oceanu.

Model: kilka wirów (gyres) z centrum, kierunkiem obrotu, siłą i promieniem.
Wkłady są sumowane i normalizowane. Presety:

- **Earth-like** — cztery żyroskopy subtropikalne,
- **Ring world** — przepływ od centrum do krawędzi,
- **Cold core** — przepływ od krawędzi do centrum.

Kąta nie uśredniamy między komórkami; przy podglądzie i próbkowaniu używamy
najbliższej komórki. Dzięki temu nie ma problemu z zawijaniem 0/2π.

Na start prądy są tylko danymi bazowymi. Climate może ich użyć jako lekkiego
dodatku do wilgotności; bez lokalnej symulacji blokowania przez wyspy.

## Wyjścia BaseClimate

| Wyjście | Typ | Opis |
| --- | --- | --- |
| `heatZoneMap` | `Int16Array` | indeks strefy ciepła per komórka; poza światem −1 |
| `moistureBaseMap` | `Float32Array` | bazowa wilgotność 0..1 z niezależnego FBM |
| `oceanCurrentMap` | `Float32Array` | bazowy kierunek prądów (kąt 0..2π) |
| `oceanCurrentStrength` | `Float32Array` | siła prądu 0..1 |

## Kontrolki

W zakładce **BaseClimate**:

- wybór układu stref: pasma albo pierścienie,
- lista stref ciepła: dodaj, usuń, przesuń, zmień szerokość,
- dla każdej strefy wybór klasy: zimna, umiarkowana, ciepła,
- wybór presetu startowego,
- `geologyCoupling` 0..1 — jak mocno geologia ma podążać za strefami.

`geologyCoupling` działa tak:

- `0` — geologia ignoruje strefy i używa dzisiejszych przepisów,
- `1` — wygląd wyspy w pełni podąża za strefą regionu,
- wartości pośrednie osłabiają przesunięcia pól przepisu.

Na start nie ma ręcznego edytora żyroskopów ani parametrów FBM. Wilgotność
i prądy wchodzą przez preset. Osobny edytor można dodać później.

## Overlays

Wszystkie trzy nakładki BaseClimate są w jednym etapie:

- **Heat zones** — kolory klas ciepła z `heatZoneMap`,
- **Moisture baseline** — `moistureBaseMap`,
- **Ocean currents** — strzałki z `oceanCurrentMap` i siły.

Overlaye końcowe **Temperature** i **Moisture** pojawiają się dopiero po etapie
Climate.

## Pipeline

Kolejność prezentacyjna:

`World shape → Macro region → BaseClimate → Geology → Heightmap → Climate`

- **BaseClimate** działa po `world-shape` i przed geologią.
- **Wejście:** wymiary świata, maska świata i konfiguracja `baseClimate`.
- **Wyjście:** `heatZoneMap`, `moistureBaseMap`, `oceanCurrentMap`,
  `oceanCurrentStrength`.
- **Strumienie:** `base-climate.moisture` dla pola wilgotności; strefy ciepła
  i żyroskopy nie potrzebują noise'u.
- **Statystyki:** liczba stref, udział powierzchni każdej klasy ciepła, pokrycie
  świata, brak nieprzypisanych komórek wewnątrz maski.
- **Cache:** zmiana configu stref lub rozmiaru świata przelicza BaseClimate
  i zależną geologię.

Kolejność wykonania stage'ów nadal wynika z deklarowanych wejść i wyjść, a nie
z kolejności na liście prezentacyjnej.

## Geologia

Geologia wybiera wygląd regionu na podstawie strefy w **środku regionu**.
Nie próbkuje osobno każdej wyspy — to ewentualne rozszerzenie, jeśli testy
wzrokowe pokażą problem na granicy stref wewnątrz jednego regionu.

Typ regionu pozostaje procesem geologicznym. Strefa wybiera wariant
`RegionShape`, bez gałęzi na nazwę typu. Warianty są przesunięciami istniejących
pól przepisu, a nie nowym algorytmem wysp:

| Typ | Ciepła strefa | Umiarkowana strefa | Zimna strefa |
| --- | --- | --- | --- |
| lagoon | atol: pierścień, płytka laguna, motu | wyspy barierowe i mierzeje, częściowa niecka | szkiery: wiele małych niskich wysp, bez niecki |
| fjord | wąskie cieśniny, słabe i nieliczne koryta, niższe szczyty | riasy: krótsze, rozgałęzione zatoki | dzisiejszy fiord: głębokie równoległe koryta |
| volcanic | wysokie stożki i kaldery, wąski szelf | te same stożki, mocniej zmiękczone przez wiek | szersze tarcze, niższa amplituda, krater zostaje |
| ordinary | szerszy szelf, niższe klify | dzisiejszy ordinary | porozrywany archipelag, zaokrąglone grzbiety |

To są przesunięcia pól takich jak `cavityShare`, `chuteCount`, `amplitudeFactor`,
`maxForms`, `shelfFactor` i `ridgeShare`. `ordinary` i `volcanic` zmieniają się
najmniej.

Geologia może lekko woleć ciepłe kotwice dla `lagoon` i zimne dla `fjord`.
To **bias wagi, nie filtr**. Forma, która nie pasuje do strefy, i tak powstaje,
ale dostaje wariant z tabeli. Przy `geologyCoupling = 0` bias też jest zero.

Nie ma twardego odrzucania typu regionu. Zimny atol staje się szkierami, ciepły
fiord dostaje wariant ciepły. Na start wybieramy **jeden wariant na region**
i nie mieszamy całych przepisów liniowo na granicy stref.

## Późniejszy etap: Climate

Climate jest poza bieżącym zakresem.

Po heightmapie powstanie etap Climate. Dostanie `heatZoneMap`,
`moistureBaseMap`, prądy i heightmapę, a także własny układ stref wilgotności
(suche/neutralne/mokre) ustawiany pasmami i pierścieniami. Policzony zostanie:

- lapse rate — temperatura spada z wysokością,
- ciągła temperatura z gradientem między strefami ciepła,
- wilgotność z `moistureBaseMap`, stref wilgotności, prądów, wiatru i cienia
  opadowego,
- hydrologia: rzeki, jeziora i zlewiska z wysokości i wilgotności.

Hydrologia jest częścią Climate, nie osobnym etapem. `moistureBaseMap` nie jest
zastępowany — jest punktem wyjścia, który kolejne warstwy modyfikują.

## Wnioski z recenzji (Grok, Antigravity)

Przyjmujemy:

- tabelę wariantów `RegionShape` zależną od strefy,
- miękki bias zamiast twardego odrzucania typów,
- próbkowanie strefy w środku regionu na start,
- `geologyCoupling` 0..1 z domyślną wartością 1,
- brak sztucznego ocieplania okolicy atolu po fakcie,
- brak drugiego algorytmu wysp — tylko przesunięcia istniejących pól,
- brak liniowego mieszania całych przepisów na granicy stref,
- wilgotność bazową jako niezależne pole FBM,
- prądy jako statyczne strzałki, nie symulację.

Odrzucamy:

- osobny `WorldClimateBaseline` jako funkcję lub obiekt,
- twarde kryterium „zimny atol i ciepły fiord są odrzucane”,
- próbkowanie każdej wyspy osobno w pierwszej wersji,
- hydrologię jako osobny etap,
- zadanie #486 i starą sekcję walidacji pól klimatu.

## Kryteria akceptacji

- każda komórka wewnątrz maski świata ma przypisaną strefę ciepła,
- poza światem `heatZoneMap` ma `-1`,
- presety Earth-like i Ring world dają czytelnie różne mapy,
- pierścienie pozwalają ustawić ciepło na zewnątrz bez osobnego trybu,
- zmiana stref zmienia mapę i warianty wysp w geologii,
- `geologyCoupling = 0` przywraca dzisiejsze przepisy,
- `geologyCoupling = 1` w pełni podąża za strefą środka regionu,
- `moistureBaseMap` jest w zakresie 0..1, bez NaN i bez dziur,
- `moistureBaseMap` nie ma widocznych granic zgodnych ze strefami ciepła,
- `oceanCurrentMap` i `oceanCurrentStrength` są w zakresie i deterministyczne,
- wynik jest deterministyczny,
- testy pokrywają mapy, presety, pokrycie świata i wpływ na geologię.

## Zadania

Epic: **#220 Implement BaseClimate and Climate**, milestone **v0.13.0**.

| Zadanie | Zakres |
| --- | --- |
| #490 | kontrakt BaseClimate i mapa stref ciepła |
| #494 | edytor stref ciepła i presety BaseClimate |
| #489 | warianty `RegionShape` per strefa, próbkowanie środka regionu, `geologyCoupling` |
| #495 | `moistureBaseMap` — niezależny FBM w BaseClimate |
| #496 | `oceanCurrentMap` i siła — statyczne żyroskopy w BaseClimate |
| #488 | overlaye BaseClimate: Heat zones, Moisture baseline, Ocean currents |
| #491 | pole temperatury w Climate |
| #485 | wilgotność i hydrologia w Climate |
| #486 | zamknięte, usunięte z planu |

Kolejność: #490 → #494 → #489 → #495/#496 → #488.
#491 i #485 czekają na etap Climate.

#492 i #493 nie należą do klimatu: #492 to zamknięte zadanie wydajności
heightmapy, a #493 to jego zmergowany PR.

## Otwarte

- czy edytor stref ma współdzielić kontrolki z makroregionami, czy dostać własny,
- czy granice stref mają od razu dostać noise, czy zostać czyste w MVP,
- dokładne wartości przesunięć pól przepisu dla każdego wariantu,
- czy `geologyCoupling` ma być w zakładce BaseClimate, czy w Geology,
- czy żyroskopy prądów mają kiedyś dostać edytor, czy zostać przy presetach,
- jak dokładnie działa edytor stref wilgotności w Climate.
