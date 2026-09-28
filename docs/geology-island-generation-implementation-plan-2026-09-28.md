# Plan wdrożenia: Geologia i nowy generator wysp

Data: 2026-09-28. Decyzje i uzasadnienie są w
`island-generation-final-plan-2026-09-28.md`. Ten dokument dzieli wdrożenie na
zadania nadające się do przeniesienia do GitHub Issues. Ten dokument jest po
polsku; przy tworzeniu issue zarówno tytuł, jak i opis będą po angielsku.
Granice kodu i kolejność przełączenia opisuje
`geology-generator-technical-implementation-2026-09-28.md`.
Źródło decyzji projektowych to plan docelowy; ten plik określa zakres issue,
a plan techniczny — kontrakty i odbiór kodu. Zadania nie są jeszcze utworzone
na GitHubie. Przed ich utworzeniem sprawdzić
zakres i status istniejących #356 (szum), #58/#360 (ląd i ocean) oraz #355
(poziom morza), żeby nie zakładać duplikatów.

## Cel i granice

Zastępujemy obecny sposób tworzenia wysp. Użytkownik ustawia w formularzu
„Geologia” obszary geologiczne, a preset może wypełnić ich edytowalną listę.
Obszar określa szanse, skalę, zagęszczenie i charakter form oraz typ dna; nie
rysuje obrysu ani nie ustala liczby wysp. Jeden etap planuje obszary i ich
lokalne strefy. Heightmapa tworzy ciągłe pole lądu i dna z niezależnych pasm
szumu; później `LandOceanStage` wyznacza rzeczywiste wyspy.

Obecny generator i jego obrazy nie są punktem odniesienia do akceptacji.
Oceniamy nowy wynik według jawnych kryteriów jakości na ustalonych seedach i
rozdzielczościach. Nie implementujemy równolegle drugiego algorytmu ani
warstwy naprawiającej gotową heightmapę. Wiek geologiczny, ścisłe uzależnienie
atoli od klimatu, hydrologia i erozja fizyczna pozostają poza tym wdrożeniem.
Tymczasowe wyłączenie limitu próbek jest zadaniem wdrożeniowym GEO-05C; ten
plan nie zmienia jeszcze działania aplikacji.

## Kolejność i zależności

| ID | Przyszły tytuł issue | Etykiety | Wymaga |
|---|---|---|---|
| GEO-01A | Define geological area and field contracts | `area:generator`, `enhancement` | — |
| GEO-01B | Define measurable island generation acceptance criteria | `area:generator`, `documentation` | GEO-01A |
| GEO-02 | Provide deterministic stage-local noise fields | `area:generator`, `refactor` | GEO-01A |
| GEO-03 | Replace landmass and character stages with geology planning | `area:generator`, `refactor` | GEO-01A |
| GEO-04 | Generate one continuous land and seabed heightfield | `area:generator`, `refactor` | GEO-01A, GEO-02, GEO-03 |
| GEO-05A | Persist generator outputs outside the preview catalog | `area:generator`, `refactor` | GEO-03, GEO-04 |
| GEO-05B | Settle field parameters, shelf ownership and stage inputs | `area:generator`, `refactor` | GEO-01A, GEO-04 |
| GEO-05C | Temporarily remove the sample cap with a cost warning | `area:generator`, `enhancement` | GEO-01B |
| GEO-06A | Wire the Geology form minimally for the cutover | `area:ui`, `enhancement` | GEO-01A, GEO-03 |
| GEO-06B | Build the full editable Geology editor and presets | `area:ui`, `enhancement` | GEO-06A |
| GEO-07 | Validate island variety, continuity and performance | `area:generator`, `test` | GEO-01B, GEO-04, GEO-05A–05C |
| GEO-08 | Classify islands and water from the heightfield | `area:generator`, `enhancement` | GEO-07 |
| GEO-09 | Measure peak memory and design the new sample budget | `area:generator`, `perf` | GEO-01B, GEO-04, GEO-05C |

Zależności opisują kontrakty danych, nie samą kolejność zakładek w
`PIPELINE_STAGES`. Kod domenowy i podgląd można przygotować osobno;
przełączenie pipeline'u wymaga spójnej integracji przed commitem lub PR.
GEO-03, GEO-04, GEO-05A–05C oraz minimalne podłączenie GEO-06A tworzą wspólny
punkt przełączenia. W trakcie przebudowy aplikacja może być niedziałająca; przed
zakończeniem przebudowy pipeline, formularz i zapis muszą znów używać jednego
kontraktu. Nie utrzymujemy dwóch działających generatorów jako rozwiązania
docelowego. Podział na issue nie wymaga osobnego merge po każdym kroku.
Podczas refaktoru pomijamy uruchamianie i naprawianie testów starego kontraktu.
Przed uznaniem całej integracji za zakończoną aktualizujemy testy i uruchamiamy
pełną weryfikację raz. Hook pre-commit nadal uruchamia typecheck i testy,
więc nie planować commitu ze świadomie zepsutym pipeline'em. Prace można
prowadzić bez pośrednich commitów aż do spójnego punktu przełączenia.

Na początku przebudowy oznaczyć obecne `LandmassLayoutStage` i
`StructureCharacterStage` oraz ich konfigurację jako `@deprecated` w kodzie.
W UI oznaczyć zakładki i kontrolki `Landmasses`/`Structure character` jako
przestarzałe oraz zapowiedzieć ich zastąpienie przez „Geologię”. Oznaczenie
informuje o przejściowym statusie istniejącej ścieżki; nie jest nowym trybem
generowania. Po przełączeniu pipeline'u, formularza i podglądu na nowy kontrakt
usunąć oba stare etapy, ich konfigurację i kontrolki wraz z oznaczeniami.

## GEO-01A — Define geological area and field contracts

**Zakres:** ustalić typ `GeologicalArea`, konfigurację listy obszarów i
wariantów oraz własność parametrów: położenie, zasięg i kierunek obszaru,
rozmiar i gęstość potencjalnych wyniesień, rozczłonkowanie, typ batymetrii,
lokalne profile rzeźby. Preset jest wartością tej samej konfiguracji. Zapisany
obszar może dać 0, 1 lub wiele wysp; kilka obszarów może współtworzyć jedną.
Ustalić reguły rozmieszczenia, nakładania, identyfikacji pochodzenia i
zgłaszania obszarów, które nie mieszczą się na mapie. Niewykonalna ręczna
konfiguracja blokuje generację z błędem przypisanym do wpisu; nie zmniejszać
ani nie pomijać obszaru po cichu. Kolejność listy nie stanowi priorytetu
wysokości ani nie rozstrzyga właściciela pochodzenia; remisy rozstrzyga
reguła niezależna od kolejności (np. stabilne ID). Ustalić relację globalnej
bazy oceanu do lokalnego poziomu dna obszaru oraz właściciela kontrolek.
Ustalić, czy pochodzenie zapisuje dominujący
obszar w komórce, czy pełen rozkład wkładów; identyfikator wyspy pozostaje
osobnym wynikiem. Ustalić operator łączenia wkładów, semantykę wartości poza
`worldMask`, model pozycjonowania szumu oraz rolę radialnej tendencji atolu.

**Ukończone, gdy:** kontrakt rozróżnia obszar, szelf i faktyczną wyspę;
parametry mają jednostki i zakresy; przykłady obejmują płytki archipelag,
obszar wulkaniczny i atolowy. Kontrakt zawiera przykład liczbowy łączenia
nakładających się wpływów i rozdziela obszar od faktycznej wyspy.

## GEO-01B — Define measurable island generation acceptance criteria

**Zakres:** zdefiniować zestaw seedów, konfiguracji, rozdzielczości i metryk
nowego pola bez porównywania go ze starym algorytmem. Opisać, jak wykrywać
poskręcane pasy, szwy, jednokomórkowe wysepki i nieczytelne presety.

**Ukończone, gdy:** próg najmniejszej czytelnej wysepki jest określony w
metrach oraz dla rozdzielczości referencyjnej.
Metryka używa pola i minimalnej szerokości, określa sąsiedztwo komórek oraz
obsługę krawędzi świata. Progi odbioru dla presetów, czasu i pamięci są
zapisane liczbowo w kryteriach GEO-01B, zanim rozpocznie się GEO-07.
Stabilność między rozdzielczościami dotyczy dużych form w tych samych
punktach świata i spójności głównych wysp w liczbowo ustalonej tolerancji;
drobny detal może się zmieniać.

## GEO-02 — Provide deterministic stage-local noise fields

**Zakres:** każdy etap używający szumu dostaje własny nazwany strumień seedu
i parametry; współdzielony jest tylko kod funkcji szumu, współrzędnych i
próbkowania. Heightmapa ma własne skale i amplitudy dużych, średnich oraz
drobnych form, niezależne od `NoiseConfig`. `NoiseStage` zachowuje `noiseMap`
dla podglądu i opcjonalnego źródła deformacji makroregionów. Heightmapa nie
czyta `noiseMap`, a zmiana zakładki „Noise” nie zmienia wysp. Jeśli wspólny
kod zmieni wartości `noiseMap`, osobno zweryfikować podgląd i makroregiony w
trybie `noise-map`. Próbki między komórkami są ciągłe; surowe duże i średnie
pasma w tym samym punkcie nie zależą od rozdzielczości rastra.
Wybrać proceduralne próbkowanie lub bufory po pomiarze czasu i pamięci; nie
przyjmować z góry pełnych rastrów dla każdego pasma. Zmiana implementacji
szumu zmienia wyniki dla danego seeda: deterministyczność jest wymagana w
obrębie wersji, a identyczne mapy po świadomej wymianie silnika nie są
wymagane, ale zmianę trzeba jawnie opisać i ocenić. Wybór silnika
(np. `fastnoise-lite` z `libraries-audit.md`) wymaga porównania z obecnym
`simplex-noise`; nie instalować biblioteki z góry.

**Ukończone, gdy:** port ma jawne jednostki, deterministyczne seedy i testy
ciągłości oraz zgodności dużych form między rozdzielczościami. Etapy
korzystają ze wspólnej implementacji funkcji szumu, lecz nie ze wspólnej mapy
ani konfiguracji. `HeightmapStage` deklaruje tylko wejścia, których używa.
Zakres porównać z #356 przed utworzeniem issue; nie uzależniać heightmapy od
zakończenia całego tego zadania.

## GEO-03 — Replace landmass and character stages with geology planning

**Zakres:** jeden etap „Geologia” tworzy lekkie dane obszarów i ich lokalnych
stref bez rastrowania wysp. Zastępuje `LandmassLayoutStage` oraz
`StructureCharacterStage`. Można wykorzystać ogólne metody placementu i
doboru skali po dostosowaniu ich kontraktu; buildery korytarzy oraz strefy
`spine`/`rim`/`chain` nie przechodzą do nowego modelu. Warianty określają
rozkład możliwych wyniesień i bazę dna, zamiast produkować kolejne korytarze
z promieniami. Placement i rzeźba mają
odrębne strumienie seedu: zmiana charakteru nie zmienia położeń obszarów.
Zaplanować zmianę `MapConfig`, `MapState`, wyjść pipeline'u, selektywnej regeneracji,
warstw diagnostycznych i istniejącej sesji w pamięci. Obecnie brak trwałego
magazynu konfiguracji wymagającego migracji między wersjami. Usunąć stare
sterowanie `archetypes`, `count`, `size`, `diversity` oraz osobne `structureCharacter`
dopiero po podłączeniu nowego kontraktu; wcześniej oznaczyć stare API jako
`@deprecated`. Nie utrzymywać dwóch ścieżek
generowania.

**Ukończone, gdy:** pojedynczy etap wystawia kompletne obszary wraz ze
strefami; zależności są zadeklarowane w pipeline; ten sam seed i konfiguracja
dają ten sam plan. Niewykonalna konfiguracja jest jawnie zgłoszona, bez
cichego porzucenia wpisu użytkownika. Dane nie zawierają gotowych masek wysp.
Zmiana parametrów rzeźby zachowuje położenia obszarów.
Po przełączeniu zaktualizować odnośnik do nieistniejącego przeglądu
architektury i historyczny przykład `landmassLayout` w `AGENTS.md`.

## GEO-04 — Generate one continuous land and seabed heightfield

**Zakres:** zastąpić `fillLand`/`fillShelves` jednym polem `H(p)` w metrach.
Batymetria bazowa, łagodne wpływy obszarów, niezależne pasma szumu i lokalne
profile tworzą jeden wynik; pochodzenie obszaru lub szelfu jest osobnym polem
danych, o semantyce ustalonej w GEO-01A. Bazowy poziom i amplitudy kontrolują
możliwość wynurzenia bez wyrównywania każdego obszaru do sztywnego udziału
lądu. Wariant atolowy tworzy płytkie obrzeże i niższy środek, a duże formy
mogą przerwać obrzeże. Dopuszczać ujemną wysokość na dawnej osi i dodatnią
poza dawnym korytarzem. Łączyć wkłady bez szwów i wygaszać je przed granicą obliczanego
obszaru. Wygaszać zbyt drobny detal przy ograniczonej rozdzielczości i
ograniczać jego zdolność do tworzenia mikrowysp blisko poziomu morza, zamiast
usuwać wysepki po rasteryzacji. Maska świata nadal wyznacza granicę danych.
Wymienić testy utrwalające dawny przekrój; sprawdzić zatopioną oś, kilka
wynurzeń z jednego obszaru oraz ciągłość na styku lądu, płytkiego dna i oceanu.

**Ukończone, gdy:** nowe pole nie ma twardego obcięcia na promieniu ani skoku
`0 m` do `-targetDepth`; żaden obszar nie produkuje rowu do dna oceanu tylko
dlatego, że jego oś jest pod wodą. Przestawienie kolejności obszarów nie
zmienia wysokości. Warianty mają widoczny wpływ
na rozkład form bez gwarantowania pojedynczego obrysu.

## GEO-05A — Persist generator outputs outside the preview catalog

**Zakres:** oddzielić trwałe rastry generatora od katalogu widocznych warstw,
aby mapa po odtworzeniu zachowała heightmapę i dane pochodzenia/szelfu.
Uaktualnić `GeneratedMapSnapshot`, odtworzenie, cache i przesyłanie danych do
workera jednym kontraktem.

**Ukończone, gdy:** zapis i odtworzenie zachowują każde wyjście potrzebne
następnemu etapowi, nawet bez warstwy podglądu.

## GEO-05B — Settle field parameters, shelf ownership and stage inputs

**Zakres:** przenieść parametry szelfu z `LandmassConfig` do odpowiednich
obszarów geologicznych i kontrolki z formularza heightmapy do „Geologii”.
Rozstrzygnąć własność `relief`, `featureScale`, `targetDepth`, `falloff`,
`irregularity` i `OCEAN_DEPTH_METERS`; kontrolki bez działania usunąć.
Zaktualizować `configKeys` oraz `reads` zgodnie z faktycznymi wejściami
etapów; nie wpisywać warunkowej zależności jako zawsze aktywnej. Statystyki
udziału lądu wiązać z rzeczywistym poziomem morza, gdy będzie dostępny.

**Ukończone, gdy:** nie ma martwych kontrolek ani nieużywanych zależności;
zmiana `NoiseConfig` nie przelicza heightmapy, a zmiana jej własnych istotnych
wejść ją przelicza.

## GEO-05C — Temporarily remove the sample cap with a cost warning

**Zakres:** tymczasowo wyłączyć przycinanie siatki w formularzu i odrzucanie
jej przez dotychczasowy budżet w generatorze. Zachować walidację poprawności
wymiarów i bezpieczne wykrywanie przepełnienia liczby komórek przed alokacją.
Szacunek pamięci pokazywać jako informację, bez użycia go do limitowania
rozmiaru, oraz pokazać wyraźne ostrzeżenie w UI przy dużym szacowanym koszcie.
Ostrzeżenie nie gwarantuje, że karta przetrwa bardzo dużą siatkę. Ponowny
limit zaprojektować później w GEO-09 na podstawie realnego szczytu dla
workera, transferu i UI.

**Ukończone, gdy:** żądana siatka nie jest obcinana przez dotychczasowy
budżet; szacunek kosztu nie udaje twardego limitu, a duży koszt jest wyraźnie
oznaczony w UI.

## GEO-06A — Wire the Geology form minimally for the cutover

**Zakres:** oznaczyć obecny formularz `Landmasses`/`Structure character` jako
przestarzały i zastąpić go minimalną sekcją „Geologia”: lista obszarów i
podstawowe kontrolki wystarczające, żeby konfiguracja przechodziła przez nowy
kontrakt, a błędy rozmieszczenia były widoczne. Pełny edytor i presety
dochodzą później w GEO-06B.

**Ukończone, gdy:** zakładki i kontrolki starego generatora są oznaczone,
a podstawowe ustawienia Geologii zapisują się i wracają przez `MapConfig`.

## GEO-06B — Build the full editable Geology editor and presets

**Zakres:** preset wypełnia listę obszarów, którą można dodawać,
powielać, usuwać i edytować. Każda karta pokazuje typ dna i charakter form,
wielkość i położenie obszaru, kształt jego zasięgu, zagęszczenie i wielkość
wyniesień, rozczłonkowanie oraz dominującą rzeźbę. Ustawienia nie sugerują,
że liczba obszarów równa się liczbie wysp. Po ręcznej zmianie preset jest
oznaczony jako edytowany. Interfejs ujawnia błąd rozmieszczenia i wynik
niepełnej konfiguracji. Parametr wieku nie pojawia się bez działającego
wpływu na wynik.

**Ukończone, gdy:** użytkownik może zbudować konfigurację „2 płytkie, 2
wulkaniczne, 1 atolowy” i ją zapisać; podgląd oraz statystyki używają nowych
nazw i danych. Presety i ręczna edycja przechodzą przez ten sam kontrakt
generatora, bez osobnego kodu generowania dla UI. Preset geografii wypełnia
listę obszarów niezależnie od presetu świata. Zmiana presetu świata nie
nadpisuje ręcznie edytowanej listy bez jawnej decyzji użytkownika.

## GEO-07 — Validate island variety, continuity and performance

**Zakres:** wygenerować wyniki dla zestawu ustalonego w GEO-01B przy
konfiguracjach ustawianych programowo; gotowy formularz nie jest wymagany
do oceny pola. Zmierzyć liczbę spójnych wynurzeń na mapie i powiązania
obszarów z wyspami według kontraktu GEO-01A, ich pola i minimalne wymiary,
udział map z zatokami i archipelagami, ciągłość profili,
zgodność przy zmianie rozdzielczości, czas i szczyt pamięci. Przygotować
obrazy kontrolne w skali całego świata i zbliżenia. Sprawdzić zachowanie
każdego nazwanego presetu oraz konfiguracji mieszanych, bez wymagania
identycznych obrysów dla każdego seedu. Pomiar spójnych wysp używa jednego
modułu, który później konsumuje `LandOceanStage`, bez drugiej implementacji.

**Ukończone, gdy:** obrazy i metryki spełniają liczbowe progi z GEO-01B oraz potwierdzają
przypadki 0/1/wielu wysp z jednego obszaru, czytelne różnice między presetami
oraz brak szwów i jednokomórkowych artefaktów. Generator nie przechodzi
odbioru, jeśli wynik nadal jest zbiorem poskręcanych pasów. Ocena nie polega
na porównaniu ze starą implementacją.

## GEO-08 — Classify islands and water from the heightfield

**Zakres:** po zaakceptowaniu pola wysokości wdrożyć `LandOceanStage`,
sprawdzając najpierw pokrycie z istniejącymi #58/#360 i #355:
przecięcie poziomem morza, oznaczenie spójnych wysp, oceanu i wód płytkich,
linie brzegowe oraz relacje wysp z obszarami geologicznymi. Ten etap czyta
wynikowe wysokości i pochodzenie, nie odtwarza geometrii wysp ze starego
szkieletu.

**Ukończone, gdy:** jedna wyspa może mieć wkład wielu obszarów, a jeden
obszar wiele identyfikatorów wysp; klasyfikacja jest deterministyczna i
zachowana w sesji. Klimat i dalsze etapy mogą korzystać z tych danych bez
specjalnych wyjątków w workerze lub rendererze.

## GEO-09 — Measure peak memory and design the new sample budget

**Zakres:** po ustabilizowaniu pola zmierzyć realny szczyt pamięci workera,
kopii `postMessage`, renderera i UI dla dużych siatek. Na tej podstawie
zaprojektować nowy limit próbek i przycinanie siatki w formularzu (z
ostrzeżeniami), wracając do decyzji o rozmiarach świata i detalu.

**Ukończone, gdy:** nowy budżet jest zapisany liczbą i pokryty testem, a UI
znów blokuje siatki, których nie obsłuży, zanim cokolwiek zaalokuje.
