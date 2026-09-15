# World generation roadmap

Dokument opisuje kierunek rozwoju generatora od fundamentów po szczegóły.
Sekcje są ułożone zgodnie z kolejnością powstawania aplikacji: najpierw
działający pipeline i podgląd, potem fizyczna skala świata, a na końcu etapy,
które jeszcze nie istnieją.

Legenda statusów:

- **[działa]** — zaimplementowane i używane w aplikacji,
- **[częściowo]** — fundament jest, brakuje części zakresu,
- **[planowane]** — brak implementacji.

## 1. Cel i zasady ogólne — [działa]

Aplikacja jest narzędziem deweloperskim: generuje i podgląda proceduralne światy,
a docelowa gra powstanie w Godocie. Obowiązujące zasady:

- Generator działa jako rozszerzalny pipeline niezależny od renderowania i UI.
- Świat korzysta ze znormalizowanych współrzędnych, aby zachować układ przy różnych rozdzielczościach.
- Jeden seed świata tworzy niezależne, nazwane strumienie losowości dla
  poszczególnych etapów.
- Etapy zapisują osobne warstwy danych; obecnie można wyświetlać maskę świata,
  makroregiony i szum.
- Rozdzielczość danych nie określa fizycznego rozmiaru świata (sekcja 3).
- Docelowo najpierw może powstawać podgląd w niskiej rozdzielczości, a następnie
  dokładniejsza wersja tego samego świata. Ten tryb nie jest jeszcze
  zaimplementowany.

Opcjonalne opóźnienie etapów do ręcznego testowania podglądu ustawia
`VITE_GENERATION_STAGE_DELAY_MS`. Nie jest to część docelowego czasu generowania
i powinno pozostać wyłączone w produkcji.

## 2. Fundament: pipeline, podgląd i ustawienia — [działa]

Pierwszy etap rozwoju to działający szkielet: pipeline w workerze, katalog
warstw, renderer z inspekcją oraz formularze ustawień.

### 2.1. Pipeline i etapy — [działa]

- `WorldShapeStage` — maska świata w `worldMask`: dysk (`disc`) albo prostokąt
  (`rectangle`). Nie implementuje jeszcze zawijania krawędzi.
- `MacroRegionStage` — każda komórka wewnątrz maski trafia do dokładnie jednego
  regionu w `macroRegionIdMap`; poza maską wartości pozostają zerowe (#256).
  Docelowe zagrożenie (`danger`) jest właściwością definicji regionu, a nie
  osobnym rastrem. Łączny limit 10 regionów bazowych i nakładanych obowiązuje
  w formularzu oraz generatorze.
- `NoiseStage` — deterministyczna mapa szumu w `noiseMap`.
- `MapGenerator` — uruchamia etapy w kolejności i emituje zdarzenia etapów wraz
  z danymi i postępem; wynik zawiera statystyki i łączny czas. Budżet wymiarów
  jest sprawdzany na wejściu generatora, zanim etapy cokolwiek zaalokują.
- worker — każdy run generowania dostaje świeży Web Worker (`runGeneration`).
  Worker ogłasza swoją listę etapów, a potem strumieniuje zdarzenia etapów.
  Anulowanie kończy worker.

Znany brak: przejście na inną stronę odmontowuje podgląd i anuluje trwające
generowanie; przeniesienie sesji do usługi w tle jest zaplanowane (#279).

### 2.2. Ustawienia — [działa]

- Formularze: general (seed), world shape (kształt, rozmiar i detal), macro
  regions oraz noise.
- Stan formularza jest pamiętany osobno dla każdej zakładki i przeżywa zmianę
  widoku.
- Rozmiar świata i detal ustawia się w metrach; szczegóły w sekcji 3.

### 2.3. Katalog warstw i renderer — [działa]

Rastry renderowalne są wyprowadzane z deklaratywnego katalogu
(`src/utils/map-layers`). Wpis wygląda tak:

```ts
{
  id: 'noise',
  label: 'Noise',
  source: 'noiseMap',
  dataType: 'float32',
  clipTo: 'world-shape',
  palette: { kind: 'ramp', stops: [...] },
}
```

- `LayerSpec` niesie `id`, `label`, `source`, `dataType`, `clipTo`,
  `providesMask`, grupę zakładek i paletę (`solid`/`ramp`/`discrete`).
- `LayerRegistry` waliduje katalog, wykrywa cykle i wystawia niezależne `order`
  (UI) oraz `buildOrder` (zależności).
- `CatalogLayer` waliduje typed array i maluje piksele skompilowaną paletą.
- `MapState` generatora rozszerza `MapRasters` o dane nierastrowe, np. definicje
  lądów, szkielety i profile terenu, więc etapy nie muszą znać renderera.
- Nowa warstwa rastrowa to wpis w katalogu, plik stage'a i dopisanie stage'a
  do `pipeline-factory.ts`.

`utils/map-renderer` odpowiada za scenę, widok, cache warstw, statystyki oraz
zapis i odtworzenie ostatniej mapy. Katalog opisuje wyłącznie warstwy możliwe do
pokazania; palety, normalizację i kolejność rysowania trzyma renderer podglądu.

### 2.4. Podgląd: warstwy, nakładki i inspekcja — [działa]

Podgląd rozdziela warstwę bazową od nakładek. Warstwa bazowa zajmuje cały
canvas, natomiast granica świata jest rysowana na drugim canvasie nad nią. UI
utrzymuje jeden aktywny wybór bazowy oraz zbiór aktywnych nakładek, zamiast
traktować każdą kombinację jako osobny typ mapy.

- Główne zakładki to `World shape`, `Macro regions` i `Noise`, a nakładka
  `World boundary` jest rysowana nad warstwą bazową.
- Definicje warstw mogą grupować kilka podwidoków pod jedną zakładką; przełącznik
  pokazuje się dopiero dla grupy z co najmniej dwoma podwidokami. `Macro regions`
  jest obecnie pojedynczą warstwą bez podwidoków.
- Rysowanie jest progresywne, a wybór pamiętany między widokami.
- Inspekcja mapy pokazuje pod kursorem pozycję w komórkach (`cell`) i odległość
  w metrach (wiersze `Position` i `Distance`, wspólne kolumny `X`/`Y`) oraz
  wartość wybranej warstwy; odczyt można przypiąć na urządzeniach dotykowych.
- Ostatnia ukończona mapa i jej konfiguracja są trzymane w pamięci na czas
  działania aplikacji i odtwarzane po powrocie; odświeżenie strony czyści stan.

Obecnie nakładki bazują na przełącznikach (`Switch`) w `MapOverlayControls`,
a wybór warstw na poziomych tabach w `MapLayerControls`. W przyszłości nakładki
numeryczne, takie jak temperatura i wilgotność, powinny otrzymać także kontrolę
przezroczystości oraz ustaloną paletę kolorów.

### 2.5. Statystyki i progres — [działa]

- Progres pokazuje aktualny etap, numer etapu i procent raportowany z wnętrza
  etapów; postęp przeżywa zmianę widoku.
- Segmentowany wskaźnik pokazuje stan każdego etapu (oczekuje, trwa, ukończony,
  błąd) i odróżnia generowanie danych od renderowania podglądu.
- Statystyki generowania i renderowania zbierane są w globalnych store'ach
  i pokazywane na stronie `/statistics`.

### 2.6. Opcjonalne spięcie zakładek ustawień i podglądu — [planowane]

Użytkownik powinien móc włączyć i wyłączyć synchronizację zakładek w obu
kierunkach. Przełącznik w nagłówku ustawień lub podglądu może korzystać z ikony
połączonego/rozłączonego łańcucha albo zamkniętej/otwartej kłódki. Musi mieć
czytelny stan, tooltip, nazwę dostępną dla czytników ekranu i obsługę klawiatury.

- Domyślnie spięcie jest wyłączone. Stan jest pamiętany przy zmianie widoku
  aplikacji, tak jak pozostałe preferencje podglądu.
- Po włączeniu kliknięcie zakładki formularza wybiera odpowiadającą główną
  zakładkę podglądu, a kliknięcie głównej zakładki podglądu wybiera formularz.
  Samo włączenie wyrównuje podgląd do aktywnej zakładki ustawień, jeśli jej
  warstwa jest dostępna. Wyłączenie pozostawia oba bieżące wybory bez zmian.
- Powiązanie opiera się na identyfikatorach etapów, nie indeksach ani etykietach.
  Jeżeli etap udostępnia kilka podwidoków, spięcie dotyczy jego głównej zakładki
  i zachowuje ostatni podwidok wybrany przez użytkownika.
- `Basic` nie ma odpowiednika w podglądzie. Wybór formularza bez dostępnych
  danych nie czyści bieżącego obrazu i nie uruchamia generatora.
- Synchronizację wywołują działania użytkownika. Automatyczne przechodzenie
  podglądu przez etapy podczas generowania nie przełącza formularzy i nie
  powoduje pętli wzajemnych aktualizacji.

### 2.7. Automatyczne odświeżanie podglądu po zmianie kontrolek — [planowane]

Kolejność realizacji: najpierw rasteryzacja warstw do rozdzielczości
viewportu × DPR opisana w sekcji 9 („Wydajność i pamięć”), następnie automatyczne
odświeżanie. Mniejsza bitmapa ogranicza koszt renderowania, ale sama nie
ogranicza kosztu generowania: potrzebne są także selektywne przeliczanie etapów
i osobna rozdzielczość danych roboczego podglądu.

- Zmiana poprawnej wartości w formularzu automatycznie odświeża powiązany
  podgląd po krótkim debounce, początkowo około 150 ms. Nie wymaga kliknięcia
  `Generate Map`; niepełne lub niepoprawne wartości nie uruchamiają obliczeń.
- Przeliczany jest zmieniony etap oraz wymagane zależności, z ponownym użyciem
  nadal aktualnych danych. Zmiana makroregionów nie przelicza niezależnego
  szumu. Zmiany wspólnego seedu lub wymiarów unieważniają odpowiednie zależności.
- Obliczenia działają w workerze, z ograniczoną rozdzielczością próbkowania
  podglądu. Ten sam seed i znormalizowane współrzędne zachowują układ świata;
  roboczy podgląd nie zastępuje pełnych danych ostatniego wygenerowanego świata.
- Nowsza zmiana anuluje lub zastępuje starsze zlecenie. Spóźniony wynik nie
  może nadpisać nowszego podglądu ani pełnego wyniku `Generate Map`.
- UI zachowuje aktywną zakładkę, podwidok i nakładki, pokazuje stan odświeżania
  oraz odróżnia roboczy podgląd od wyniku w docelowej jakości. Nieaktualne
  wyniki zależnych etapów są oznaczane jako wymagające ponownego wygenerowania.
- `Generate Map` nadal uruchamia pełny pipeline w docelowej rozdzielczości.
  Zmiana samego sposobu wyświetlania lub nakładek nie uruchamia generatora.
- Weryfikacja obejmuje serię szybkich zmian kontrolek, anulowanie, zgodność
  seedu i układu przy różnych rozdzielczościach oraz pomiary czasu i pamięci.

### 2.8. Selektywne przeliczanie etapów — [częściowo]

Automatyczne odświeżanie wymaga, aby przy zmianie konfiguracji uruchamiały się
tylko etapy, których ta zmiana dotyczy. Fundament jest rozbity na osobne zadania:

- ograniczenie `MacroRegionStage` do obszaru kształtu świata (#256) — zrobione,
- deklaracje zależności etapów i ponowne użycie wyników (#257) — planowane,
- prezentacja pominiętych etapów w progressie i statystykach (#258) — planowane.

Zadanie automatycznego odświeżania pozostaje zablokowane do czasu ich ukończenia.

## 3. Fizyczna skala świata — [działa]

Kanonicznym elementem `WorldConfig` jest `dimensions`, a etapy korzystają
z `sampleWidth` i `sampleHeight` bez rekonstruowania wymiarów.
`WorldDimensions` w `src/utils/world-dimensions.ts` niesie metry i rozmiar siatki:

- `dimensionsFromMeters` wylicza liczby próbek z metrów i detalu,
- `validateDimensions` pilnuje dodatnich wymiarów i budżetu próbek, a
  `MapGenerator` uruchamia ją na wejściu, zanim etapy cokolwiek zaalokują,
- `metersPerSample`, `metersToCell`, `cellCenterMeters`, `cellOriginMeters`,
  `metersToNormalized`, `normalizedToMeters` i `normalizedToCell` pokrywają
  przeliczenia między metrami, komórkami i współrzędnymi znormalizowanymi.

Formularz świata przyjmuje rozmiar w metrach (presety 1, 2 i 4 km oraz własny
rozmiar od 100 do 10 000 m) i osobny „terrain detail" (0,5 / 1 / 2 / 4 m na
próbkę). Pokazuje wyliczoną siatkę `samples` i szacowany rozmiar danych generacji
(MB dziesiętne, tak jak statystyki). Budżet
`600 MB` (`MEMORY_BUDGET_BYTES`) dotyczy wyłącznie danych generatora: rastrów
etapów w workerze i kopii wysyłanej do głównego wątku. Przy `6 B` na próbkę daje
limit `100 000 000` komórek (`SAMPLE_BUDGET`); kwadratowy świat może więc mieć
maksymalnie `10 000 × 10 000` próbek przy `1 m` na próbkę. `summarizeWorldGrid`
wylicza siatkę, efektywny `m/sample` i szacowany rozmiar danych, a gdy żądany
detal przekracza budżet, formularz przycina rozdzielczość i pokazuje
ostrzeżenie — rozmiar fizyczny zostaje, rośnie `m/sample`.

Przykładowo świat `4000 × 4000 m` może mieć bazową `heightmap` o rozdzielczości
`2000 × 2000`, co daje około `2 m` na komórkę. Podgląd tego samego świata może
mieć tylko `512 × 512 px`, a kamera gry może wyrenderować aktualnie widoczny
fragment w rozdzielczości ekranu. Zmiana rozdzielczości PNG nie zmienia wtedy
wielkości wyspy w grze. PNG pozostaje wizualizacją albo formatem eksportu, a nie
źródłem prawdy dla świata; źródłem prawdy są seed, konfiguracja i numeryczne
warstwy generatora.

Wymiary trafiają też do kanału informacji jako `worldDimensions`, więc snapshot
i odczyt pod kursorem znają skalę. Rozdzielczość podglądu i eksportowanego obrazu
pozostaje niezależna od rozdzielczości danych.

Pamięć renderera jest poza tym budżetem: każdy canvas warstwy i canvas
prezentacji ma pełny rozmiar rastra (przy maksymalnej siatce ~400 MB każdy), więc
szczyt całej aplikacji jest wyższy i widać go w statystykach renderowania.
Świadomie nie uwalniamy canvasów nieaktywnych warstw — przełączanie warstw ma
być natychmiastowe, bez migania. Redukcję tych buforów (rasteryzacja do rozmiaru
viewportu) oraz kopii `postMessage` opisuje sekcja 9.

## 4. Kolejne etapy pipeline'u — [częściowo]

Docelowy pipeline rozszerza obecne trzy etapy. Kolejność może być później
doprecyzowana, szczególnie w przypadku wzajemnego wpływu hydrologii, erozji
i formacji terenu.

1. `WorldShapeStage` — wyznaczenie obszaru świata zgodnie z kształtem i topologią presetu. **[działa]**
2. `MacroRegionStage` — rozłączne makroregiony oraz ich narracyjne wymagania, w tym docelowe zagrożenie. **[działa]**
3. `NoiseStage` — deterministyczne warstwy szumu. **[działa]**
4. `LandmassLayoutStage` — globalny układ struktur geologicznych, ich podstawowy kształt, wspólne szelfy oraz potencjalne archipelagi. **[planowane]**
5. `IslandCharacterStage` — profile terenu struktur lądowych i ich regionów. **[planowane]**
6. `HeightmapStage` — rasteryzacja struktur geologicznych oraz utworzenie wysokości lądu i batymetrii dna. **[planowane]**
7. `LandOceanStage` — przecięcie wysokości poziomem morza i klasyfikacja faktycznych wysp, oceanu, linii brzegowej oraz płytkich wód szelfowych. **[planowane]**
8. `ClimateStage` — temperatura, opady, wilgotność i pozostałe warunki klimatyczne. **[planowane]**
9. `HydrologyStage` — przepływ wody, rzeki, jeziora i zlewiska wynikające między innymi z opadów. **[planowane]**
10. `TerrainFeaturesStage` — klify, plaże, doliny, płaskowyże i inne formacje. **[planowane]**
11. `BiomeStage` — biomy wynikające z warunków środowiskowych. **[planowane]**
12. `LocationStage` — spawn, zasoby, bossowie i pozostałe lokacje. **[planowane]**

### 4.1. Odpowiedzialność etapów kształtujących wyspy — [planowane]

Wyspa nie powinna powstawać w jednym etapie jako gotowy obiekt. Pipeline najpierw
opisuje strukturę geologiczną i zamiar generatora, następnie tworzy ciągłą
wysokość, a dopiero poziom morza wyznacza faktyczny podział na wyspy.

- `LandmassLayoutStage` odpowiada za kształt w dużej skali: wydłużenie,
  orientację, szkielet, szerokość, zatoki, cieśniny, półwyspy, stopień
  rozwinięcia linii brzegowej i zasięg szelfu.
- `IslandCharacterStage` przypisuje profile terenu i regiony, np. góry na
  zachodzie, równiny na wschodzie albo płaskowyż w centrum.
- `HeightmapStage` płynnie łączy geometrię, profile regionalne i szum w jedną
  wysokość obejmującą również dno oceanu.
- `LandOceanStage` stosuje poziom morza, wykrywa spójne wyspy i archipelagi oraz
  wylicza linię brzegową, głębokość wody i obszary szelfowe.
- `BiomeStage` dopiero na podstawie faktycznej głębokości i pozostałych warunków
  klasyfikuje płytkie morze jako biom wodny.

Przykładowo długa wyspa ze słabo rozwiniętą linią brzegową wynika z wydłużonego
szkieletu i małej nieregularności. Wyspa w kształcie litery C może powstać
z zakrzywionego szkieletu albo ujemnego kształtu wycinającego dużą zatokę.
Informacja o górzystym zachodzie i równinnym wschodzie należy natomiast do
regionalnych profili terenu, a nie do samej geometrii wyspy.

### 4.2. Masy lądowe i kształty wysp — [planowane]

Wyspa nie powinna być opisywana pojedynczym centrum i promieniem. Ogólny kształt
może powstawać ze szkieletu, profilu szerokości i wielu nakładających się form.

```ts
interface LandmassDefinition {
  spine: WorldPoint[];
  widthProfile: number[];
  orientation: number;
  irregularity: number;
  positiveShapes: LandShape[];
  negativeShapes: LandShape[];
  shelf: ShelfDefinition;
}

interface ShelfDefinition {
  width: number;
  targetDepth: number;
  falloff: number;
  irregularity: number;
}
```

- Szkielet pozwala tworzyć wyspy podłużne, zakrzywione i zwężające się.
- Dodatnie formy budują półwyspy, połączone części wyspy i przybrzeżne wysepki.
- Ujemne formy wycinają zatoki, cieśniny i wcięcia wybrzeża.
- Wieloskalowy szum oraz domain warping deformują geometryczną bazę.
- Drobniejszy szum odpowiada za nieregularną linię brzegową, a nie za globalny
  układ lądów.

### 4.3. Archipelagi — [planowane]

Archipelag nie musi być generowany jako sztuczna lista niezależnych wysp.
Naturalniejszym modelem jest jedna częściowo zatopiona struktura geologiczna ze
wspólnym szelfem i kilkoma lokalnymi wyniesieniami. Po przecięciu jej poziomem
morza wyższa struktura może utworzyć jedną dużą wyspę, a niższa — kilka wysp
tworzących archipelag.

```ts
interface ArchipelagoDefinition {
  id: string;
  landmassId: string;
  shelfId: string;
  islandIds: string[];
}
```

`ArchipelagoDefinition` jest więc wynikiem klasyfikacji po utworzeniu wysokości
i zastosowaniu poziomu morza, a nie obowiązkowym wejściem generatora. Wyspy
archipelagu dzielą szelf i geologiczne pochodzenie, ale mogą mieć indywidualne
profile oraz kształty wynikające z lokalnych wyniesień.

### 4.4. Szelf kontynentalny i batymetria — [planowane]

Większość struktur lądowych powinna mieć otaczający je szelf, czyli łagodnie
opadający obszar płytkiego dna. Szelf jest częścią geometrii i wysokości świata,
a nie od razu biomem. Pozwala to później klasyfikować płytkie morze na podstawie
rzeczywistej głębokości oraz tworzyć wspólny szelf dla całego archipelagu.

Poza szelfem dno powinno opadać w stronę głębokiego oceanu. Granica nie musi być
równomiernym pierścieniem — jej szerokość, nieregularność i tempo opadania mogą
zależeć od definicji struktury geologicznej oraz lokalnego szumu.

Przydatne warstwy danych:

- `bathymetryMap` — wysokość dna względem poziomu morza,
- `waterDepthMap` — dodatnia głębokość wody wyliczona po zastosowaniu poziomu morza,
- `shelfIdMap` — przypisanie płytkich obszarów do wspólnej struktury geologicznej,
- `islandIdMap` — wynikowy podział wynurzonych, spójnych obszarów na faktyczne wyspy.

### 4.5. Charakter wysp — [planowane]

Charakter wyspy powinien być zestawem parametrów, a nie pojedynczą, wykluczającą
etykietą.

```ts
interface IslandTerrainProfile {
  elevation: number;
  roughness: number;
  mountainStrength: number;
  hillStrength: number;
  plateauStrength: number;
  lakePotential: number;
  erosionStrength: number;
  coastalCliffStrength: number;
}
```

Przykładowe tendencje to teren płaski, pagórkowaty, górzysty, wulkaniczny, bogaty
w jeziora, płaskowyże lub klifowe wybrzeża. Parametry mogą się łączyć, np. wyspa
może być jednocześnie górzysta i mieć silne klify.

Profil opisuje zamiar generatora, a nie gwarantowany rezultat. `HeightmapStage`,
hydrologia i pozostałe etapy sprawdzają, gdzie dana cecha może faktycznie
powstać.

### 4.6. Regiony wewnątrz wyspy — [planowane]

Duża wyspa nie powinna mieć jednolitego charakteru. Może zostać podzielona na
regiony, np. góry na zachodzie, równiny na wschodzie, płaskowyż w centrum
i klifowe wybrzeże na północy.

```ts
interface IslandRegionDefinition {
  id: string;
  islandId: string;
  center: WorldPoint;
  influenceRadius: number;
  profile: IslandTerrainProfile;
}
```

Wpływy regionów powinny płynnie się mieszać zamiast tworzyć ostre granice. Dla
każdej komórki można obliczać wagi kilku najbliższych regionów i interpolować
ich parametry. Małe wyspy mogą mieć jeden profil globalny, a liczba regionów
dużej wyspy może zależeć od jej powierzchni.

Przydatne warstwy danych:

- `islandIdMap` — przypisanie komórki lądu do wyspy,
- `regionInfluenceMap` — wpływ regionalnych profili terenu,
- `heightmap` — rzeczywista wysokość,
- `slopeMap` — nachylenie,
- `waterMap` i `drainageMap` — hydrologia,
- `biomeMap` — wynikowa klasyfikacja biomów.

## 5. Hydrologia, biomy i klimat — [planowane]

### 5.1. Hydrologia i biomy — [planowane]

Jeziora i rzeki powinny wynikać z wysokości, spadków, zlewisk i wilgotności.
Wysoki `lakePotential` zwiększa szansę na jeziora, ale nie powinien tworzyć ich
w miejscach fizycznie niepasujących.

Biomy powinny korzystać z faktycznych warunków komórki:

```ts
interface CellEnvironment {
  elevation: number;
  slope: number;
  moisture: number;
  temperature: number;
  waterDistance: number;
  drainage: number;
}
```

Przykładowo bagno wymaga płaskiego, wilgotnego i nisko położonego obszaru.
Profil wyspy wpływa na teren, a rzeczywisty teren określa, które biomy są
możliwe.

### 5.2. Klimat, wilgotność i niebezpieczeństwo — [planowane]

`ClimateStage` powinien tworzyć ciągłe pola środowiskowe, przynajmniej
`temperatureMap` i `moistureMap`. W przyszłości mogą dojść `volcanicActivityMap`,
`windMap` oraz pola sezonowe. `BiomeStage` klasyfikuje biomy na podstawie
kombinacji tych wartości, wysokości, nachylenia, odległości od wody i hydrologii.

Przykładowe kombinacje:

| Temperatura | Wilgotność | Przykładowy biom |
| --- | --- | --- |
| gorąco | sucho | pustynia |
| gorąco | mokro | las deszczowy |
| umiarkowanie | sucho | step |
| umiarkowanie | średnio | równiny |
| umiarkowanie | mokro | las |
| zimno | sucho | tundra |
| zimno | mokro | tajga, śnieg lub lodowiec |

Wilgotność nie powinna być prostym podziałem na suchy zachód i mokry wschód.
Kierunkowy gradient może być jedynie słabym wpływem bazowym. Na niego należy
nałożyć wielkoskalowy noise, kilka suchych i mokrych centrów wpływu, odległość od
oceanu, dominujące wiatry oraz cień opadowy gór. W efekcie powstaną nieregularne
wyspy wilgotności i suchości, które miejscami przenikają na przeciwną stronę
świata. Granice powinny być dodatkowo deformowane przez domain warping.

Klimat należy oddzielić od docelowego poziomu niebezpieczeństwa. Dwie strefy
umiarkowane w realistycznym świecie nie muszą być równoważne. Jedna może
zawierać bezpieczne równiny i lasy, a druga niebezpieczne warianty wynikające
z silnego wulkanizmu, toksycznych mokradeł, gwałtownych burz albo odmiennej
geologii. Podobnie oba zimne krańce mogą różnić się charakterem, mimo podobnej
temperatury.

Każda definicja makroregionu zawiera `danger` w zakresie `0..1`. Późniejsze etapy
odczytują tę wartość przez `macroRegionIdMap`; nie powstaje osobny raster danger.
`BiomeStage` najpierw wyznacza bazowy biom na podstawie warunków fizycznych,
a następnie używa danger jako ograniczenia dla jego wariantu gameplayowego.
`LocationStage` używa tego samego parametru przy rozmieszczaniu przeciwników,
bossów, zasobów i nagród. Dzięki temu fabuła może wymagać niebezpiecznego
południowego regionu bez sztucznego zmieniania całej jego temperatury.

## 6. Presety świata i konfiguracja makroregionów — [częściowo]

### 6.1. Makroregiony — [działa]

Układ bazowy dzieli cały świat na przylegające regiony radialne, poziome albo
pionowe. Region nakładany jest poziomym lub pionowym pasem, który wycina swój
obszar z układu bazowego i ma własny `danger`. Dzięki temu dwa pasy na brzegach
świata mogą tworzyć bieguny, a pojedynczy pas może przeciąć układ pierścieni.
Nakładanie nie tworzy wielu przynależności komórki: ostatni pas obejmujący punkt
wygrywa, a `macroRegionIdMap` nadal przechowuje dokładnie jeden identyfikator.

Formularz rozdziela bazowy układ od nakładanych regionów pasmowych, a wspólny
edytor granic zmienia rozmiar dwóch sąsiednich regionów bez tworzenia luk.
Picker presetów podświetla ten, który dokładnie odpowiada bieżącemu układowi
i regionom (wariant `solid` + `aria-pressed`); po ręcznej edycji żaden preset nie
pasuje i formularz pokazuje stan „edited manually". Kontrolki segmentowane
w wąskich formularzach przewijają się poziomo, zamiast rozjeżdżać układ.
Makroregiony są rozłączne: płynne przejścia należą do pól środowiskowych
i wynikowych biomów, a nie do tożsamości makroregionu.

### 6.2. Etykiety regionów — generyczny kanał informacji (#255) — [działa]

Nazwy regionów z formularza są metadanymi podglądu, a nie rastrem:
`macroRegionIdMap` przechowuje indeks regionu. Zamiast pól per funkcja działa
generyczny kanał `MapInfo`: `MAP_INFO_CATALOG` w `map-generator` wyprowadza
informacje nierastrowe z konfiguracji generacji (`macroRegionLabels`,
`worldDimensions`), a snapshot i stan renderera niosą ten sam rekord. Odczyt pod
kursorem rozwiązuje etykietę po indeksie regionu z fallbackiem `Region N`, więc
nazwy pasują do wygenerowanego obrazu, nawet gdy formularz zmieni się bez
ponownej generacji.

Nowa informacja to wpis w katalogu i jej użycie — bez zmian w repository,
rendererze i persistence. Docelowo ten sam kanał mogą zasilać metadane emitowane
przez pipeline (plan B), bez zmian w UI.

### 6.3. Presety świata — [planowane]

Preset powinien być gotową konfiguracją tych samych etapów generatora, a nie
osobną implementacją. Presety działają na dwóch poziomach:

- preset świata definiuje budowę całego świata: topologię, układ i charakter stref
  klimatycznych, źródła ciepła i wilgoci, obrót osi klimatu, gradienty oraz
  rozkład `danger`; nie opisuje pojedynczych lądów,
- preset geografii (poziom landmass) definiuje samą geografię: liczbę i układ
  struktur lądowych, szkielet, formy dodatnie i ujemne, szelf oraz profile terenu
  (`LandmassLayoutStage`, `IslandCharacterStage`); można go łączyć z dowolnym
  presetem świata, np. archipelag na `Earth-like` albo pojedynczy kontynent na
  `Mythic Moon`.

Użytkownik może rozpocząć od presetu, zmienić jego parametry, a następnie zapisać
wynik jako własny profil.

Planowane presety świata:

1. `Mythic Moon` — zamieszkały księżyc gazowego giganta z bezpiecznym centrum, zimną północą, wulkanicznym południem i zagrożeniem rosnącym wraz z odległością od środka. Długie dni i noce, regularne zaćmienia oraz wulkanizm pływowy wspierają fabułę, ale model może świadomie upraszczać astrofizykę na rzecz czytelnego świata.
2. `Earth-like` — zwykła obracająca się planeta, zimne bieguny, strefy umiarkowane, gorący równik oraz normalny cykl dnia i nocy.
3. `Engineered Rings` — sztuczny albo magiczny świat z konfigurowalnymi pierścieniami klimatycznymi wokół centralnego sanktuarium.

Przykładowe presety geografii: `Archipelago`, `Large Continent`, `Many Islands`,
`Mountainous`.

Tryb zaawansowany może pozwalać zmieniać układ makroregionów, szerokość stref,
źródła ciepła i wilgoci, obrót osi klimatu, siłę gradientów oraz deformację
granic.

```ts
interface WorldPreset {
  id: string;
  topology: WorldTopologyConfig;
  climate: ClimateConfig;
  macroRegions: MacroRegionConfig[];
  starterRegion: StarterRegionConfig;
}
```

Podglądy koncepcyjne:

- [trzy presety świata](world-presets.jpg).

### 6.4. Pierścienie dzielone z rotacją — [planowane]

Układ radialny można rozszerzyć o pierścienie dzielone na dwa naprzemienne
regiony. Krzyż z dwóch prostopadłych średnic tnie pierścień na cztery wycinki
90°, a przeciwległe wycinki należą do tego samego regionu. Pierścień tworzą więc
dwa regiony, każdy zajmujący połowę jego powierzchni.

- Podział i rotacja są konfigurowane osobno dla każdego pierścienia; obrót np.
  o 45° ustawia granice niezależnie od osi świata.
- Każda połowa jest osobnym `MacroRegionConfig` z własną etykietą i `danger`, więc
  jeden pierścień może mieć naprzemiennie bezpieczne i niebezpieczne wycinki.
- Pierścień niepodzielony pozostaje jednym regionem; podział nie zmienia
  niezmiennika partycji — wycinki przylegają do siebie i pokrywają cały
  pierścień.
- Limit 10 regionów oznacza maksymalnie 5 podzielonych pierścieni; dodawanie
  i usuwanie działa na pierścieniach, nie na pojedynczych połowach.
- Edytor szerokości nadal operuje na promieniach pierścieni, a procent regionu to
  połowa udziału pierścienia.
- Testy powinny objąć zawijanie kątów wokół 0/360, rotację inną niż 0/45/90 oraz
  partycję każdej komórki dokładnie do jednego regionu bazowego.

Geometria pierścienia zyskałaby opcjonalny podział, np. `split: { rotation, side }`,
gdzie `side` wybiera jedną z dwóch par przeciwległych wycinków. `contains` dodaje
wtedy warunek na kąt (`atan2`), a domain warping granic działa jak dotychczas,
więc krzyż również falowałby spójnie z resztą mapy.

Preset pokrewny: „Crossed rings” z naprzemiennym `danger` w obrębie pierścienia.

## 7. Topologia i krawędzie świata — [planowane]

Kształt mapy należy oddzielić od sposobu działania jej krawędzi oraz od presetu
klimatu. Docelowo użytkownik będzie mógł wybrać świat radialny w formie dysku
albo świat cylindryczny, niezależnie od wybranego układu temperatury i wilgotności.

Obecnie dostępny jest tylko wybór maski `disc`/`rectangle`. Prostokąt nie zawija
się na osi X ani Y; `WorldTopologyConfig`, okresowy szum i reguły krawędzi są
planowane.

```ts
interface WorldTopologyConfig {
  shape: 'disc' | 'rectangle';
  wrapX: boolean;
  wrapY: boolean;
  closedEdge: 'cliff' | 'ocean' | 'ice-wall';
  seamOffset: number;
}
```

- Świat radialny lub ringowy może być dyskiem bez zawijania, zakończonym
  urwiskiem opadającym poza granicę mapy.
- Świat cylindryczny korzysta z prostokątnej mapy zawijanej na osi X. Przejście
  przez zachodnią krawędź przenosi wtedy na wschodnią, natomiast północ i południe
  pozostają zamknięte. Taka mapa nie posiada wyróżnionego środka na osi
  wschód–zachód.
- Noise, hydrologia, lądy i wszystkie inne warstwy muszą być okresowe na zawijanej
  osi, aby na łączeniu mapy nie powstawał szew.
- Okrągła maska i pełne zawijanie lewo–prawo nie tworzą naturalnej geometrii,
  dlatego nie powinny być łączone w realistycznym presecie.

### 7.1. Bezszwowe łączenie cylindra — [planowane]

Świata cylindrycznego nie należy najpierw generować jako zwykłego prostokąta,
a następnie sklejać jego boków. Okresowość musi obowiązywać od początku pipeline'u:

- współrzędna X jest normalizowana modulo szerokość świata,
- odległość pozioma korzysta z krótszej drogi przez lewą albo prawą krawędź,
- noise jest okresowy na osi X; można go próbkować po okręgu za pomocą
  `cos(2πx)` i `sin(2πx)`,
- rasteryzacja lądu uwzględnia kopie struktur przesunięte o `-worldWidth`
  i `+worldWidth`,
- hydrologia oraz pozostałe operacje sąsiedztwa traktują lewą i prawą kolumnę
  jako bezpośrednich sąsiadów,
- wykrywanie spójnych wysp nadaje jeden identyfikator lądowi przecinającemu szew,
- renderer normalizuje pozycję gracza i kamery oraz rysuje brakujący fragment
  mapy z jej przeciwnej strony.

```ts
const directDx = Math.abs(x1 - x2);
const wrappedDx = Math.min(directDx, worldWidth - directDx);
const wrappedX = ((x % worldWidth) + worldWidth) % worldWidth;
```

Wyspa leżąca na szwie może wyglądać jak dwie połówki na płaskim eksporcie PNG,
ale w świecie i podczas eksploracji pozostaje jedną ciągłą wyspą. Dla czytelniejszej
minimapy można po wygenerowaniu wybrać `seamOffset` przechodzący przez największy
obszar oceanu i tylko przesunąć miejsce rozcięcia wizualizacji, bez zmiany danych
świata. Prostszym wariantem pierwszej wersji jest wymuszenie oceanicznego pasa na
szwie, ale docelowo generator powinien poprawnie obsługiwać przecinające go wyspy.

## 8. Eksploracja i eksport danych — [planowane]

### 8.1. Demo eksploracji świata — [planowane]

Planowana osobna podstrona, np. `/explore/:seed`, otwiera wygenerowany świat
w trybie zwiedzania z kamerą z góry. To proste demo: docelowa gra powstanie
w Godocie, a ta aplikacja jest rozgrzewką i generatorem danych, nie pełnym
silnikiem gry.

Zakres pierwszej wersji:

1. Przejście z generatora do podstrony z seedem i konfiguracją świata.
2. Jednorazowe wygenerowanie mapy i jej warstw numerycznych.
3. Postać to na razie prosty znacznik (np. kółko) w naturalnej skali świata,
   sterowany klawiaturą, poruszający się we współrzędnych w metrach.
4. Kamera z góry śledząca postać oraz zoom.
5. Renderowanie tylko obszaru widocznego przez kamerę, mimo że dane pozostają
   w pamięci.

Poza zakresem na teraz: kolizje, minimapa, animacje, ekwipunek, NPC i zapisywanie
stanu. Kolizje, punkt startowy z `LocationStage` i minimapa wrócą, gdy powstaną
warstwy terenu i lokacji. Chunkowanie oraz poziomy szczegółowości pozostają
opcjonalną optymalizacją dla większych map. Skala postaci i kamery wynika
z metrów świata oraz zoomu, a nie z liczby pikseli źródłowego obrazu.

### 8.2. Eksport danych do Godota — [planowane, pomysł bez tasków]

Jeśli kiedyś okaże się potrzebny, eksport to paczka danych, nie integracja:
warstwy jako pliki (np. 16-bit PNG albo binaria) oraz `manifest.json` z seedem,
wymiarami w metrach, `m/sample`, listą warstw, paletą, regionami, biomami
i lokacjami w metrach. Godot budowałby teren i kolizje z tych samych danych,
a nasz podgląd pozostałby narzędziem deweloperskim. Na razie bez zadań.

## 9. Wydajność i pamięć — [częściowo]

Już działa: sekwencyjny pipeline w jednym Web Workerze, dane w typed arrays,
progresywne rysowanie podglądu, postęp raportowany z wnętrza etapów oraz
statystyki generowania i renderowania pokazywane na stronie statystyk. Anulowanie
kończy worker, cache warstw jest kluczowany tożsamością danych i współdzielony
przez renderery, a renderer przerywa nieaktualne rysowanie przy starcie nowego
przebiegu. `MacroRegionStage` liczy tylko komórki wewnątrz maski świata (#256).

Pozostałe zadania:

- Rasteryzować warstwy bazowe bezpośrednio do rozdzielczości viewportu × DPR
  (z limitem DPR 2), zachowując pełne dane generatora. Dla widoku 600 × 600 CSS px
  przy DPR 2 bufor RGBA 1200 × 1200 zajmuje około 5,76 MB zamiast 400 MB dla
  mapy 10 000 × 10 000. Nie tworzyć pośrednich obrazów w pełnej rozdzielczości.
- Zmniejszyć szczyt pamięci poza budżetem generatora: rasteryzacja do rozmiaru
  viewportu usuwa pełnowymiarowe canvasy warstw i prezentacji, a jednorazowa
  wysyłka wyników albo `SharedArrayBuffer` (nagłówki COOP/COEP) usuwa kopię
  `postMessage`. Transfer buforów per etap nie wchodzi w grę, bo worker potrzebuje
  ich w kolejnych etapach.
- Dobrać próbkowanie maski i filtrowanie szumu; zachować zgodność warstw z granicą
  świata po zmianie rozmiaru viewportu lub DPR.
- Po ukończeniu rasteryzacji do viewportu dodać automatyczne odświeżanie po
  zmianie kontrolek, zgodnie z sekcją 2.7.
- Wprowadzić budżet pamięci cache i uzależnić przygotowanie nieaktywnych warstw
  od dostępnego budżetu.
- Rozszerzyć statystyki o rozdzielczość źródłową i wynikową oraz szacowany rozmiar
  buforów i cache.
- Selektywnie przeliczać etapy: deklaracje zależności na stage'ach, diff konfiguracji
  i ponowne użycie wyników, z pominiętymi etapami oznaczonymi w progressie (#257, #258).
- Rozważyć reużycie workera (zamiast świeżego na run) dopiero wtedy, gdy pomiary
  wykażą, że koszt startu jest istotny.
- Po pomiarach rozważyć wykonywanie etapów łatwych do podziału pasami lub kafelkami
  w puli workerów. Hydrologię i inne globalnie zależne etapy dzielić dopiero po
  zaprojektowaniu ich przepływu danych.
- Rozważyć WebGL lub WebGPU dopiero wtedy, gdy pomiary wykażą taką potrzebę.
