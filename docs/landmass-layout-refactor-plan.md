# Plan przebudowy Landmass Layout

## 1. Cel

`LandmassLayoutStage` ma opisywać plan struktur geologicznych, a nie udawać
gotową mapę wysp. Etap powinien tworzyć lekką, wektorową geometrię: punkty,
połączenia, szerokości i relacje między częściami struktury. Faktyczna
powierzchnia lądu, linia brzegowa i podział na wyspy powstaną później z wysokości
i poziomu morza.

Przebudowa ma jednocześnie:

- przebudować archetypy tak, aby dawały organiczne warianty kształtów zamiast
  mechanicznie odrysowanych liter,
- wprowadzić naturalniejsze zróżnicowanie wielkości i topologii struktur,
- zastąpić kosztowny pełnowymiarowy raster lekkim podglądem wektorowym,
- rozdzielić generator, rozmieszczanie, geometrię i prezentację,
- przygotować stabilny kontrakt dla przyszłej heightmapy,
- sprawić, aby koszt layoutu nie zależał od liczby komórek świata.

## 2. Zakres i decyzje

### 2.1. Zakres bieżącej przebudowy

W bieżącym refaktorze struktury są rozmieszczane globalnie w obszarze świata.
Nie łączymy jeszcze layoutu z makroregionami i nie dodajemy zależności od
`macroRegionIdMap`, konfiguracji regionów ani deformacji ich granic.

Integracja z makroregionami będzie osobnym etapem po ustabilizowaniu nowego
modelu struktur i podglądu.

### 2.2. Ustalenia na późniejszą integrację z regionami

- Struktur może być mniej niż regionów. Wybór takiej konfiguracji jest
  odpowiedzialnością użytkownika.
- Wyspa może przechodzić przez kilka regionów; typowym zakresem jest jeden lub
  dwa regiony, wyjątkowo trzy.
- Zachowanie dla bardzo małego regionu pozostaje do zaprojektowania. Nie należy
  teraz kodować arbitralnego minimum powierzchni ani automatycznej naprawy.
- Layout będzie mógł w przyszłości kierować strukturę do regionu, ale nie może
  obiecywać finalnej wyspy. Wynurzone wyspy powstaną dopiero po heightmapie
  i zastosowaniu poziomu morza.

### 2.3. Pusty layout

Możliwość wyłączenia wszystkich archetypów i wygenerowania pustego widoku jest
tymczasowa. Nowy formularz nie będzie oferował pustej puli: poprawna konfiguracja
ma generować co najmniej jedną strukturę.

### 2.4. Strategia przebudowy

Przebudowa jest świadomie zmianą łamiącą. Nie utrzymujemy adaptera nowego modelu
do starego `LandmassDefinition`, nie generujemy równolegle starego i nowego
podglądu oraz nie wymagamy, aby aplikacja działała po każdym pośrednim kroku na
gałęzi roboczej.

Stary model, `landmassIdMap`, `createLandmassSampler` i rastrowa definicja warstwy
zostaną usunięte z aktywnego pipeline'u przed podłączeniem nowej implementacji.
Etapy w tym dokumencie opisują kolejność pracy i punkty kontroli, a nie osobne,
wdrażalne wersje produktu. Jedyną bramką kompatybilności jest kompletny,
działający stan końcowy.

Obecne persistence jest pamięciowym cache'em bieżącej sesji, a nie trwałym
formatem danych użytkownika. Stare snapshoty zostają jawnie unieważnione; nie
powstaje migrator V1 → V2 ani tymczasowa unia obu modeli. Stary
`isLandmassLayout` zostanie usunięty i zastąpiony walidacją nowego layoutu.

## 3. Docelowa odpowiedzialność etapów

### Landmass Layout

Tworzy:

- topologię każdej struktury,
- położenie i orientację,
- przebieg głównych grzbietów lub osi,
- profil szerokości,
- ogólną skalę i relacje między strukturami,
- przynależność do wspólnego szelfu, jeśli zostanie świadomie wygenerowana.

Nie tworzy:

- finalnej linii brzegowej,
- identyfikatorów rzeczywistych wysp,
- szczegółowego szumu wybrzeża,
- wysokości terenu i dna,
- klasyfikacji ląd–ocean.

### Przyszłe etapy

- `IslandCharacterStage` przypisze charakter terenu i lokalne profile.
- `HeightmapStage` zamieni struktury na ciągłe pole wysokości.
- `LandOceanStage` zastosuje poziom morza i wykryje rzeczywiste wyspy,
  archipelagi, linię brzegową i wodę.

## 4. Nowy model geometrii

Pojedyncza polilinia nie wystarcza do opisania struktur rozgałęzionych i
zamkniętych. Obecne `bars` są obejściem: elipsa udaje gałąź, ale nie jest częścią
szkieletu, z którego przyszła heightmapa mogłaby wyprowadzić teren.

Punktem wyjścia powinien być graf grzbietów albo równoważny zestaw połączonych
ścieżek:

```ts
interface LandmassNode {
  id: string;
  position: WorldPoint;
  radius: number;
}

interface LandmassEdge {
  id: string;
  from: string;
  to: string;
  controlPoints?: readonly WorldPoint[];
}

interface GeologicalStructure {
  id: string;
  archetype: LandmassArchetype;
  nodes: readonly LandmassNode[];
  edges: readonly LandmassEdge[];
  shelfId: string;
}
```

`radius` oznacza zasięg wpływu struktury w węźle, a nie gotową odległość do
brzegu. Na krawędzi jest interpolowany płynnie. `controlPoints` pozwalają
prowadzić łagodne krzywe bez zagęszczania modelu dziesiątkami punktów.

Model obsłuży bez specjalnych wyjątków:

- zwartą strukturę z krótkim szkieletem,
- długi, zakrzywiony grzbiet,
- rozwidlenia,
- kilka połączonych ramion,
- zamknięty pierścień,
- asymetryczne zwężanie końców.

Layout nie definiuje jeszcze parametrów wysokości, siły depresji ani gwarancji
wody. Dla laguny i atolu zapisuje wyłącznie archetyp oraz odpowiednią topologię:
otwartą albo prawie zamkniętą krzywą dla laguny i zamknięty cykl dla atolu.
Kontrakt wysokościowy powstanie dopiero razem z projektem `HeightmapStage`.

## 5. Naturalniejsza generacja

Archetypy pozostają ważną kontrolą użytkownika. Ich zadaniem jest określenie
intencji kształtu: użytkownik ma móc poprosić o struktury bardziej okrągłe,
nieregularne, wydłużone, powyginane, lagunowe lub atolowe. Archetyp nie może być
jednak gotowym szablonem punktów odrysowującym jedną literę.

Proponowana pula archetypów użytkowych:

- `round` — zwarta, zbliżona do okrągłej, ale niesymetryczna struktura,
- `irregular` — wielopłatowa struktura z silniejszą asymetrią i zmianami
  szerokości,
- `elongated` — jeden dłuższy, łagodnie zakrzywiony grzbiet,
- `winding` — silnie wygięty przebieg; może przypominać luźne warianty `C`, `S`,
  `U` lub haczyka, ale nie odrysowuje konkretnej litery,
- `branched` — główny grzbiet z odnogami; obejmuje organiczne warianty układów
  inspirowanych `Y`, `T` lub `X`,
- `lagoon` — zakrzywiona lub prawie zamknięta struktura z intencją centralnego
  obniżenia i opcjonalnym otwarciem,
- `atoll` — zamknięty albo prawie zamknięty pierścień otaczający wolne wnętrze.

Litery mogą więc nadal służyć jako inspiracja topologiczna dla „wywijasów”, ale
nie powinny być nazwami ani sztywnymi przepisami widocznymi w modelu produktu.
Każdy archetyp korzysta ze wspólnego generatora i ustawia zakresy parametrów,
takich jak:

- zwartość i wydłużenie,
- nieregularność profilu szerokości,
- siła i częstotliwość krzywizny,
- prawdopodobieństwo i liczba odnóg,
- stopień domknięcia,
- siła centralnego obniżenia,
- szansa pozostawienia otwarcia do laguny.

Archetyp określa topologię oraz zakres parametrów, ale nie finalny kontur.
Konkretna geometria wynika z:

- skorelowanych zmian kierunku zamiast niezależnych ostrych skrętów,
- limitów długości i kąta odnóg,
- wygładzania profilu promienia,
- niezależnego zwężania końców,
- kontrolowanej asymetrii,
- niewielkiej liczby asymetrii i zaburzeń geometrii dużej skali.

### Archetyp a finalna wyspa

`round`, `irregular`, `elongated`, `winding` i `branched` opisują układ przyszłego
wyniesienia. `lagoon` i `atoll` określają na razie wyłącznie przebieg szkieletu
otaczającego wolne wnętrze. Faktyczna depresja, woda i reguła walidacji laguny
zostają świadomie odłożone do projektu heightmapy oraz `LandOceanStage`.

### Zróżnicowanie wielkości

Jeden wspólny `size` należy zastąpić budżetem wpływu struktur i rozkładem
wielkości:

1. Pole maski świata daje `worldArea` w znormalizowanych jednostkach.
2. Ustawienie skali mapuje się na `targetArea = worldArea * targetShare`.
3. Każda struktura losuje dodatnią wagę z ograniczonego rozkładu log-normalnego;
   jego odchyleniem steruje ustawienie różnorodności.
4. Budżet dzieli się proporcjonalnie do wag:
   `structureArea[i] = targetArea * weight[i] / sum(weights)`.
5. Generator buduje geometrię jednostkową i szacuje jej pole wpływu z długości
   krawędzi oraz profilu promieni.
6. Przed rozmieszczaniem skaluje strukturę przez
   `sqrt(structureArea / estimatedArea)`.
7. Struktury są rozmieszczane od największej. Gdy konkretna struktura nie mieści
   się w dostępnej przestrzeni, może zostać zmniejszona do jawnego minimum bez
   ponownego skalowania już rozmieszczonych elementów.

`targetArea` opisuje wpływ geologicznego planu, nie gwarantowaną powierzchnię
finalnego lądu.

### Przejście archetypów z #373

Świeża praca nad archetypami nie zostaje anonimowo wyrzucona. Jej parametry,
krzywe i testy deterministyczności są materiałem wejściowym dla nowego
generatora:

| Obecny archetyp | Nowa rola |
| --- | --- |
| `round` | `round` |
| `oval` | wariant `round` albo `elongated` |
| `elongated` | `elongated` |
| `irregular` | `irregular` |
| `o` | `atoll` |
| `c` | `lagoon` albo otwarty `winding` |
| `l`, `u`, `s`, `z`, `v` | inspiracje parametrów `winding` |
| `y`, `x`, `t` | inspiracje parametrów `branched` |

Usuwamy testy dokładnego odtwarzania liter. Zachowujemy i rozszerzamy testy
deterministyczności, zmienności między seedami, poprawnej topologii i zakresów
parametrów.

### Rozmieszczanie

Rozmieszczanie pozostaje globalne, ale nie powinno maksymalizować równomiernego
rozrzutu każdej struktury. Należy rozdzielić trzy intencje:

- minimalny odstęp zapobiega przypadkowym kolizjom,
- część struktur może pozostać izolowana,
- część może świadomie należeć do luźnej grupy lub wspólnego szelfu.

Relacja grupowa musi powstać przed rozmieszczeniem jej elementów. Nie należy
najpierw rozpychać wszystkich struktur, a potem uznawać przypadkowo bliskich za
archipelag.

## 6. Podgląd: szkielet i szerokość

Podgląd `Landmass Layout` będzie wizualizacją techniczną, a nie kolorową mapą
lądu.

### 6.1. Warstwa centralna

- Każdy węzeł jest widoczną kropką.
- Krawędzie są liniami lub łagodnymi krzywymi łączącymi węzły.
- Węzły rozgałęzień mogą być nieco większe od punktów pośrednich.
- Kolor rozróżnia niezależne struktury, nie typ powierzchni.

### 6.2. Wireframe szerokości

Szerokość można pokazać tym samym językiem kropek i linii:

1. Dla każdego węzła wyznaczamy lokalny kierunek i normalną.
2. Po obu stronach węzła odkładamy `radius`, tworząc dwa mniejsze punkty
   szerokości.
3. Punkty szerokości łączy cienka linia poprzeczna.
4. Punkty po tej samej stronie kolejnych węzłów łączą się w boczne prowadnice.
5. Obszar między prowadnicami dostaje bardzo delikatne, półprzezroczyste
   wypełnienie.

Powstaje czytelny „druciany” korytarz: centralny szkielet pokazuje przebieg,
poprzeczki pokazują lokalną szerokość, a boczne prowadnice pozwalają szybko
ocenić zwężenia i proporcje. Nie należy interpretować prowadnic jako przyszłej
linii brzegowej.

W miejscu rozwidlenia prowadnice poszczególnych krawędzi mogą się nakładać.
Podgląd ma wyjaśniać dane, nie konstruować poprawny wielokąt obrysu.

### 6.3. Tło mapy

Podgląd powinien mieć stałe tło:

- wewnątrz maski świata: spokojny, ciemny kolor oceanu,
- poza maską: neutralne tło aplikacji o innym odcieniu,
- granica świata: obecny wyraźny obrys,
- opcjonalnie bardzo subtelna siatka lub znaczniki skali, o ile nie konkurują
  ze szkieletem.

Tło ma od razu komunikować, gdzie znajduje się obszar świata, nawet gdy layout
zawiera tylko kilka cienkich linii.

### 6.4. Interakcja

Odczyt pod kursorem nie potrzebuje pełnego `landmassIdMap`. Trafienie można
wyznaczać względem ograniczonej liczby krawędzi z użyciem ich bounding boxów.
Kliknięcie może wyróżnić całą strukturę, jej węzły, promienie i wspólny szelf.

## 7. Architektura kodu

Nie należy najpierw dzielić obecnych 966 linii na mniejsze pliki i zachowywać
wszystkich obecnych abstrakcji. Najpierw powstaje nowy model, a stary kod jest
usuwany w trakcie przebudowy.

Proponowany podział:

```text
stages/landmass-layout/
  landmass-layout-stage.ts   # orkiestracja etapu
  types.ts                   # wewnętrzny model i wyniki
  archetypes.ts              # archetypy intencji i zakresy parametrów
  topology.ts                # wspólny generator i budowa grafu
  geometry.ts                # krzywe, odległości, bounds, normalne
  size-distribution.ts       # skale i profile promienia
  placement.ts               # globalne rozmieszczanie i kolizje
  grouping.ts                # świadome grupy i wspólne szelfy
  validation.ts              # niezmienniki wyniku
  index.ts
```

Kod podglądu powinien być osobnym rendererem geometrii wektorowej, a nie kolejną
odmianą `SmoothLayerPainter`. Wspólny renderer rastrowy pozostaje dla warstw,
które rzeczywiście są rastrami.

Katalog warstw musi przestać zakładać, że każdy wpis ma `dataType`, paletę
i typed array. `LayerSpec` stanie się unią rozłączną co najmniej dwóch wariantów:

```ts
type LayerSpec = RasterLayerSpec | VectorLayerSpec;
```

`VectorLayerSpec` określa źródło danych domenowych, clipping do świata i fabrykę
warstwy, ale nie ma palety rastrowej. `LayerRegistry` waliduje każdy wariant
osobno, `MapScene` buduje właściwą klasę `MapLayer`, a presenter nadal operuje na
gotowych buforach canvas. Statystyki wektorowe raportują liczbę węzłów i krawędzi
zamiast fikcyjnej rozdzielczości źródłowej. Readout korzysta z hit testingu
wektorowego i zwraca identyfikator struktury.

## 8. Etapy realizacji

Etapy są logicznymi porcjami pracy na jednej gałęzi. Nie wymagamy zielonego
builda między nimi; pełna bramka jakości obowiązuje po zakończeniu całej
przebudowy.

### Etap 0 — zatwierdzenie projektu i baseline

- Włączyć ten dokument do repozytorium przed rozpoczęciem implementacji.
- Zapisać przykładowe seedy, obrazy oraz czasy dla kilku rozdzielczości świata.
- Potwierdzić nazwy archetypów i minimalny zestaw ustawień formularza.

### Etap 1 — odcięcie starej implementacji

- Usunąć `landmassIdMap` z wyniku etapu i katalogu warstw.
- Usunąć `createLandmassSampler`, analityczne granice landmassu w rendererze,
  pomiar pokrycia z rastra oraz stare przepisy literowe.
- Usunąć stary `isLandmassLayout` i unieważnić snapshot poprzedniego formatu.
- Usunąć lub tymczasowo wyłączyć testy utrwalające stary kontrakt.

Po tym etapie aplikacja może pozostawać niedomknięta do czasu podłączenia nowego
modelu i warstwy.

### Etap 2 — model, archetypy i generator

- Dodać model węzłów, krawędzi, promieni i walidację jego niezmienników.
- Zaimplementować archetypy `round`, `irregular`, `elongated`, `winding`,
  `branched`, `lagoon` i `atoll` jako zakresy parametrów wspólnego generatora.
- Generować organiczną krzywiznę, prawdziwe odnogi, cykle i gładkie profile
  promienia.
- Zaimplementować budżet wpływu oraz rozkład wielkości opisany w sekcji 5.
- Dodać testy właściwości dla większej puli seedów.

### Etap 3 — rozmieszczanie i grupowanie

- Rozmieszczać struktury globalnie, bez zależności od makroregionów.
- Użyć boundsów i indeksu przestrzennego do lokalnych testów kolizji.
- Generować świadome grupy i wspólne szelfy przed rozmieszczeniem ich członków.
- Zezwolić na kontrolowane wyjście części struktury poza granicę świata.

### Etap 4 — infrastruktura warstw wektorowych

- Rozdzielić `LayerSpec` na wariant rastrowy i wektorowy.
- Rozszerzyć `LayerRegistry`, `MapScene`, cache, readout i statystyki o dane
  domenowe oraz warstwy bez typed array i palety.
- Dodać wektorową warstwę layoutu do zwykłej nawigacji i prezentera.
- Zaimplementować hit testing struktur.

### Etap 5 — wizualizacja i formularz

- Narysować węzły, krawędzie i wireframe szerokości.
- Dodać tło oceanu wewnątrz świata i osobne tło poza nim.
- Zachować clipping, panoramowanie, zoom i fullscreen.
- Usunąć możliwość pustej puli archetypów.
- Udostępnić wybór archetypów, liczbę struktur, typową skalę i różnorodność
  wielkości; nie dodawać jeszcze ustawień makroregionów.

### Etap 6 — integracja i bramka jakości

- Podłączyć nowy layout do sesji generowania, selektywnej regeneracji,
  statystyk i pamięciowego persistence.
- Usunąć wszystkie pozostałości starego modelu i tymczasowe wyłączenia testów.
- Zaktualizować roadmapę, dokument wydajnościowy i budżet pamięci.
- Porównać wynik z baseline'em pod kątem czasu, pamięci i różnorodności.
- Uruchomić pełne `pnpm run check:all`.

Kryterium zakończenia: nowy layout jest jedyną implementacją, podgląd działa we
wszystkich trybach, dokumentacja odpowiada kodowi, a wszystkie kontrole projektu
przechodzą.

## 9. Kryteria akceptacji całej przebudowy

- Ten sam seed i konfiguracja zawsze tworzą identyczny layout.
- Liczba struktur zgadza się z konfiguracją i jest większa od zera.
- Struktury mają zauważalnie różne rozmiary.
- Węzły, krawędzie i profile promieni są skończone oraz poprawnie połączone.
- Rozgałęzienia i cykle są częścią szkieletu, a nie doklejonymi elipsami.
- Podgląd pokazuje kropki, linie, wireframe szerokości i tło mapy.
- Podgląd nie sugeruje, że wireframe jest finalnym brzegiem wyspy.
- Generowanie layoutu nie skanuje wszystkich komórek świata.
- Renderowanie layoutu zależy od liczby elementów geometrii i rozmiaru
  viewportu, nie od pełnej rozdzielczości danych.
- Zmiana rozdzielczości świata nie zmienia układu struktur dla tego samego seedu.
- Kod etapu jest podzielony według odpowiedzialności i nie zawiera jednego
  wielofunkcyjnego modułu podobnego do obecnego `landmass-layout.ts`.

## 10. Ryzyka i kwestie otwarte

- Kontrakt wysokościowy `lagoon` i `atoll` pozostaje poza tym refaktorem; obecny
  model gwarantuje tylko odpowiednią topologię szkieletu.
- Należy dobrać rozkład wielkości tak, aby nie dawał zawsze jednej dominującej
  struktury ani zestawu prawie równych obiektów.
- Wireframe szerokości przy bardzo ostrych zakrętach może się przecinać. Jest to
  dopuszczalne w podglądzie technicznym, ale nie może utrudniać odczytu.
- Usunięcie `landmassIdMap` wymaga zastąpienia odczytu pod kursorem lekkim hit
  testingiem wektorowym.
- Stare snapshoty są unieważniane; świadomie nie powstaje ścieżka migracji ani
  kompatybilności wstecznej.
- Reguły dla bardzo małych makroregionów zostają świadomie nierozstrzygnięte do
  czasu osobnego etapu integracji regionów.

## 11. Kontrakt geometrii i podglądu technicznego — doprecyzowanie

Ta sekcja doprecyzowuje i zastępuje wcześniejsze, zbyt ogólne założenia o
wireframe. Wszystkie poniższe reguły są częścią obecnego refaktoru; nie należy
odkładać ich do etapu heightmapy lub finalnych coastlines.

### 11.1. Jedna kanoniczna oś struktury

Każda krawędź ma dokładnie jeden przebieg geometryczny. Z niego muszą wynikać:

- rendering szkieletu,
- lokalne styczne i normalne,
- przekroje szerokości,
- corridor używany do kolizji i placementu,
- przyszłe próbkowanie wysokości.

Renderer nie może samodzielnie wygładzać osi inną krzywą niż używa generator.
W szczególności nie wolno rysować skeletonu splajnem Catmull–Rom, gdy kolizje i
wireframe korzystają z łamanej przez te same control pointy: podgląd wtedy
pokazuje inną strukturę niż dane.

Na obecnym etapie rekomendowany jest najprostszy i jednoznaczny wariant:
zaokrąglona łamana przechodząca po kanonicznych punktach krawędzi. Jeżeli
produkt wymaga krzywych gładkich, spline musi zostać wprowadzony do modelu
domenowego wraz ze wspólnym, deterministycznym samplerem używanym przez każdy
konsument geometrii.

Każda transformacja struktury (skalowanie, obrót, przesunięcie) obejmuje nody,
ich promienie oraz wszystkie control pointy. Testy muszą chronić ten invariant:
po skalowaniu każdy punkt osi ma współrzędne pomnożone przez ten sam faktor.

### 11.2. Język wizualny podglądu

Podgląd jest rysunkiem konstrukcyjnym przyszłej wyspy, a nie stylizowanym
obrysem lądu:

1. spokojny ocean w obrębie świata i neutralne tło aplikacji poza nim;
2. tylko rzeczywiste `LandmassNode` jako widoczne kropki;
3. cienka oś łącząca kropki, nad wszystkimi pomocniczymi elementami;
4. dokładnie jedna krótka poprzeczka szerokości na node, prostopadła do jego
   lokalnej stycznej;
5. opcjonalny, bardzo delikatny fill między sąsiednimi przekrojami;
6. branch node większy od zwykłego node'a, bez powielania jego poprzeczki przez
   każdą krawędź.

Control pointy są niewidocznymi parametrami przebiegu, a nie dodatkowymi
kropkami lub przekrojami. Kolor może rozróżniać struktury, ale fill i pomocnicze
linie muszą mieć wyraźnie mniejszy kontrast niż skeleton. Podgląd przy dużym
zoomie ma pozostać równie czytelny jak przybliżony szkic: kropki, oś, krótkie
przekroje, a nie mozaika paneli.

### 11.3. Szerokość na zakrętach i rozwidleniach

Proste odsunięcie punktów osi o promień nie tworzy poprawnego korytarza na
ciasnym łuku: po stronie wewnętrznej offset sam się przecina, a po zewnętrznej
rozchodzi. Dlatego pełne rails i fill można pokazać tylko dla odcinka, który
spełnia warunek bezpiecznej krzywizny. Szerokość musi być ograniczona przez
lokalny promień krzywizny (konserwatywnie `width <= 0.4 * curvatureRadius`) albo
ten odcinek pokazuje wyłącznie oś i przekroje.

Nie wolno tworzyć osobnych, niezależnych poligonów fill dla każdej krawędzi i
oczekiwać, że złączą się poprawnie w node'ach. Dopuszczalne strategie to:

- połączyć sąsiednie przekroje jednym kontrolowanym trapezem lub kapsułą;
- stosować połączenia `round` albo `bevel` z limitem mitera;
- pominąć fill i rails, gdy test poprawności offsetu nie przejdzie.

W branchu oś każdej odnogi pozostaje niezależna, ale centralny node ma tylko
jeden widoczny marker. Ewentualne fill między odnogami nie jest częścią tego
etapu; nie wolno go udawać przypadkowym nakładaniem paneli.

### 11.4. Granica świata jest kontraktem placementu

Preview nie może maskować problemu placementu samym clippingiem. Zwykła
struktura wraz z całym korytarzem wpływu ma znajdować się wewnątrz maski świata
(`inside share = 1`, z niewielką tolerancją numeryczną). Kandydat, który nie
mieści się w świecie, jest zmniejszany albo odrzucany.

Struktura celowo przecięta granicą może powstać dopiero jako jawny typ lub flaga
domenowa z osobnym znaczeniem. Nie może być skutkiem ubocznym ustawienia
`inside share = 0.5`, ponieważ daje w podglądzie ucięte, niezrozumiałe szkielety
i fałszuje obszar przyszłego lądu.

### 11.5. Gęstość node'ów i archetypy

Liczba node'ów jest semantyką modelu, więc nie może być przypadkowym skutkiem
wyłącznie promienia bazowego. Reguła generatora powinna uwzględniać długość,
krzywiznę i topologię archetypu:

- prosta struktura: 2–6 node'ów;
- struktura wygięta: 4–8 node'ów;
- pierścień, laguna lub atoll: co najmniej 8 node'ów;
- branch: jeden node centralny i 2–5 node'ów na każdej odnodze.

Granice nie są celem estetycznym samym w sobie, lecz zapewniają, że podgląd
komunikuje podobną ilość informacji dla struktur o podobnej złożoności. Testy
seedów powinny sprawdzać zarówno zakres liczby node'ów, jak i brak
samoprzecięcia osi oraz korytarza wpływu.

### 11.6. Kryteria odbioru wizualizacji

- Na prostym grzbiecie widać kolejno: kropki, jedną oś i pojedyncze krótkie
  przekroje.
- Na ciasnym łuku nie ma nakładających się pól ani przecinających się rails.
- Na branchu nie ma zwielokrotnionych crossbarów ani fill udającego połączenie
  odnóg.
- Żadna zwykła struktura nie jest ucięta przez granicę świata.
- Skeleton, hit testing, kolizje i placement opisują ten sam przebieg.
- Przy zoomie 1× i dużym przybliżeniu podgląd nie zamienia się w wachlarze,
  trójkąty ani przypadkowe panele.
