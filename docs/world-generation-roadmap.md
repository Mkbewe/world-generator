# World generation roadmap

## Główne założenia

- Generator działa jako rozszerzalny pipeline niezależny od renderowania i UI.
- Świat korzysta ze znormalizowanych współrzędnych, aby zachować układ przy różnych rozdzielczościach.
- Jeden seed świata tworzy niezależne, nazwane strumienie losowości dla poszczególnych etapów.
- Etapy zapisują osobne warstwy danych, które w przyszłości będzie można analizować i wyświetlać.
- Najpierw może powstawać podgląd w niskiej rozdzielczości, a następnie dokładniejsza wersja tego samego świata.

## Planowany pipeline

1. `WorldShapeStage` — wyznaczenie obszaru świata i maski kołowej.
2. `NoiseStage` — deterministyczne warstwy szumu.
3. `LandmassLayoutStage` — globalny układ struktur geologicznych, ich podstawowy kształt, wspólne szelfy oraz potencjalne archipelagi.
4. `IslandCharacterStage` — profile terenu struktur lądowych i ich regionów.
5. `HeightmapStage` — rasteryzacja struktur geologicznych oraz utworzenie wysokości lądu i batymetrii dna.
6. `LandOceanStage` — przecięcie wysokości poziomem morza i klasyfikacja faktycznych wysp, oceanu, linii brzegowej oraz płytkich wód szelfowych.
7. `HydrologyStage` — przepływ wody, rzeki, jeziora i zlewiska.
8. `TerrainFeaturesStage` — klify, plaże, doliny, płaskowyże i inne formacje.
9. `BiomeStage` — biomy wynikające z warunków środowiskowych.
10. `LocationStage` — spawn, zasoby, bossowie i pozostałe lokacje.

Kolejność może być później doprecyzowana, szczególnie w przypadku wzajemnego wpływu hydrologii, erozji i formacji terenu.

## Odpowiedzialność etapów kształtujących wyspy

Wyspa nie powinna powstawać w jednym etapie jako gotowy obiekt. Pipeline najpierw opisuje strukturę geologiczną i zamiar generatora, następnie tworzy ciągłą wysokość, a dopiero poziom morza wyznacza faktyczny podział na wyspy.

- `LandmassLayoutStage` odpowiada za kształt w dużej skali: wydłużenie, orientację, szkielet, szerokość, zatoki, cieśniny, półwyspy, stopień rozwinięcia linii brzegowej i zasięg szelfu.
- `IslandCharacterStage` przypisuje profile terenu i regiony, np. góry na zachodzie, równiny na wschodzie albo płaskowyż w centrum.
- `HeightmapStage` płynnie łączy geometrię, profile regionalne i szum w jedną wysokość obejmującą również dno oceanu.
- `LandOceanStage` stosuje poziom morza, wykrywa spójne wyspy i archipelagi oraz wylicza linię brzegową, głębokość wody i obszary szelfowe.
- `BiomeStage` dopiero na podstawie faktycznej głębokości i pozostałych warunków klasyfikuje płytkie morze jako biom wodny.

Przykładowo długa wyspa ze słabo rozwiniętą linią brzegową wynika z wydłużonego szkieletu i małej nieregularności. Wyspa w kształcie litery C może powstać z zakrzywionego szkieletu albo ujemnego kształtu wycinającego dużą zatokę. Informacja o górzystym zachodzie i równinnym wschodzie należy natomiast do regionalnych profili terenu, a nie do samej geometrii wyspy.

## Masy lądowe i kształty wysp

Wyspa nie powinna być opisywana pojedynczym centrum i promieniem. Ogólny kształt może powstawać ze szkieletu, profilu szerokości i wielu nakładających się form.

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
- Drobniejszy szum odpowiada za nieregularną linię brzegową, a nie za globalny układ lądów.

## Archipelagi

Archipelag nie musi być generowany jako sztuczna lista niezależnych wysp. Naturalniejszym modelem jest jedna częściowo zatopiona struktura geologiczna ze wspólnym szelfem i kilkoma lokalnymi wyniesieniami. Po przecięciu jej poziomem morza wyższa struktura może utworzyć jedną dużą wyspę, a niższa — kilka wysp tworzących archipelag.

```ts
interface ArchipelagoDefinition {
  id: string;
  landmassId: string;
  shelfId: string;
  islandIds: string[];
}
```

`ArchipelagoDefinition` jest więc wynikiem klasyfikacji po utworzeniu wysokości i zastosowaniu poziomu morza, a nie obowiązkowym wejściem generatora. Wyspy archipelagu dzielą szelf i geologiczne pochodzenie, ale mogą mieć indywidualne profile oraz kształty wynikające z lokalnych wyniesień.

## Szelf kontynentalny i batymetria

Większość struktur lądowych powinna mieć otaczający je szelf, czyli łagodnie opadający obszar płytkiego dna. Szelf jest częścią geometrii i wysokości świata, a nie od razu biomem. Pozwala to później klasyfikować płytkie morze na podstawie rzeczywistej głębokości oraz tworzyć wspólny szelf dla całego archipelagu.

Poza szelfem dno powinno opadać w stronę głębokiego oceanu. Granica nie musi być równomiernym pierścieniem — jej szerokość, nieregularność i tempo opadania mogą zależeć od definicji struktury geologicznej oraz lokalnego szumu.

Przydatne warstwy danych:

- `bathymetryMap` — wysokość dna względem poziomu morza,
- `waterDepthMap` — dodatnia głębokość wody wyliczona po zastosowaniu poziomu morza,
- `shelfIdMap` — przypisanie płytkich obszarów do wspólnej struktury geologicznej,
- `islandIdMap` — wynikowy podział wynurzonych, spójnych obszarów na faktyczne wyspy.

## Charakter wysp

Charakter wyspy powinien być zestawem parametrów, a nie pojedynczą, wykluczającą etykietą.

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

Przykładowe tendencje to teren płaski, pagórkowaty, górzysty, wulkaniczny, bogaty w jeziora, płaskowyże lub klifowe wybrzeża. Parametry mogą się łączyć, np. wyspa może być jednocześnie górzysta i mieć silne klify.

Profil opisuje zamiar generatora, a nie gwarantowany rezultat. `HeightmapStage`, hydrologia i pozostałe etapy sprawdzają, gdzie dana cecha może faktycznie powstać.

## Regiony wewnątrz wyspy

Duża wyspa nie powinna mieć jednolitego charakteru. Może zostać podzielona na regiony, np. góry na zachodzie, równiny na wschodzie, płaskowyż w centrum i klifowe wybrzeże na północy.

```ts
interface IslandRegionDefinition {
  id: string;
  islandId: string;
  center: WorldPoint;
  influenceRadius: number;
  profile: IslandTerrainProfile;
}
```

Wpływy regionów powinny płynnie się mieszać zamiast tworzyć ostre granice. Dla każdej komórki można obliczać wagi kilku najbliższych regionów i interpolować ich parametry. Małe wyspy mogą mieć jeden profil globalny, a liczba regionów dużej wyspy może zależeć od jej powierzchni.

Przydatne warstwy danych:

- `islandIdMap` — przypisanie komórki lądu do wyspy,
- `regionInfluenceMap` — wpływ regionalnych profili terenu,
- `heightmap` — rzeczywista wysokość,
- `slopeMap` — nachylenie,
- `waterMap` i `drainageMap` — hydrologia,
- `biomeMap` — wynikowa klasyfikacja biomów.

## Hydrologia i biomy

Jeziora i rzeki powinny wynikać z wysokości, spadków, zlewisk i wilgotności. Wysoki `lakePotential` zwiększa szansę na jeziora, ale nie powinien tworzyć ich w miejscach fizycznie niepasujących.

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

Przykładowo bagno wymaga płaskiego, wilgotnego i nisko położonego obszaru. Profil wyspy wpływa na teren, a rzeczywisty teren określa, które biomy są możliwe.

## Fizyczna skala świata

Rozdzielczość danych nie powinna określać fizycznego rozmiaru świata. Generator powinien osobno przechowywać:

- rozmiar świata w jednostkach gry, najlepiej w metrach,
- rozdzielczość próbkowania warstw takich jak `heightmap` i `biomeMap`,
- rozdzielczość podglądu lub eksportowanego obrazu,
- przeliczenie między współrzędnymi znormalizowanymi, metrami świata i komórkami rastra.

```ts
interface WorldDimensions {
  widthMeters: number;
  heightMeters: number;
  sampleWidth: number;
  sampleHeight: number;
}
```

Przykładowo świat `4000 × 4000 m` może mieć bazową `heightmap` o rozdzielczości `2000 × 2000`, co daje około `2 m` na komórkę. Podgląd tego samego świata może mieć tylko `512 × 512 px`, a kamera gry może wyrenderować aktualnie widoczny fragment w rozdzielczości ekranu. Zmiana rozdzielczości PNG nie zmienia wtedy wielkości wyspy w grze.

PNG powinien pozostać wizualizacją albo formatem eksportu, a nie źródłem prawdy dla świata. Źródłem prawdy powinny być seed, konfiguracja oraz numeryczne warstwy generatora. W pierwszej wersji cały teren może zostać wygenerowany raz i trzymany w pamięci. Podział na kafelki lub deterministycznie odtwarzane chunki należy wprowadzić dopiero wtedy, gdy pomiary wykażą problemy z czasem generowania albo zużyciem pamięci.

## Interaktywna eksploracja świata

Planowana osobna podstrona, np. `/explore/:seed`, powinna pozwalać otworzyć wygenerowany świat w trybie zwiedzania z kamerą z góry. Nie jest to pełna gra: użytkownik nie zbiera zasobów, nie modyfikuje świata i nie wymaga zapisywania stanu rozgrywki. Generator pozostaje niezależny od widoku, a podstrona korzysta z jego warstw danych.

Zakres pierwszej wersji:

1. Przejście z generatora do podstrony eksploracji z seedem i konfiguracją świata.
2. Jednorazowe wygenerowanie całej mapy terenu i jej numerycznych warstw.
3. Kamera z góry śledząca postać, zoom oraz minimapa całego świata.
4. Postać sterowana klawiaturą, poruszająca się we współrzędnych świata wyrażonych w metrach.
5. Renderowanie tylko obszaru widocznego przez kamerę, mimo że dane całej mapy pozostają w pamięci.
6. Podstawowa kolizja wynikająca z warstw terenu, np. woda, strome zbocza i granice świata.
7. Punkt startowy wybrany przez `LocationStage`.

Tryb eksploracji nie potrzebuje ekwipunku, zasobów, NPC, symulacji odległych obszarów ani zapisywania zmian w świecie. Kolejne iteracje mogą dodać animacje postaci, wizualne obiekty i dekoracje terenu. Chunkowanie oraz poziomy szczegółowości pozostają opcjonalną optymalizacją dla większych map. Skala postaci i kamery powinna wynikać z metrów świata oraz zoomu, a nie z liczby pikseli źródłowego obrazu.

## Wydajność — dalszy plan

- Najpierw zachować prosty, jednowątkowy pipeline.
- Dane rastrowe przechowywać w typed arrays.
- Później przenieść pipeline do Web Workera.
- Etapy łatwe do podziału wykonywać pasami lub kafelkami w puli workerów.
- Hydrologię i inne globalnie zależne etapy dzielić dopiero po zaprojektowaniu ich przepływu danych.
- Przekazywać bufory jako transferable, raportować postęp i umożliwić anulowanie.
- Rozważyć WebGL lub WebGPU dopiero wtedy, gdy pomiary wykażą taką potrzebę.
