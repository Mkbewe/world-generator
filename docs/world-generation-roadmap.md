# World generation roadmap

## Główne założenia

- Generator działa jako rozszerzalny pipeline niezależny od renderowania i UI.
- Świat korzysta ze znormalizowanych współrzędnych, aby zachować układ przy różnych rozdzielczościach.
- Jeden seed świata tworzy niezależne, nazwane strumienie losowości dla poszczególnych etapów.
- Etapy zapisują osobne warstwy danych, które w przyszłości będzie można analizować i wyświetlać.
- Najpierw może powstawać podgląd w niskiej rozdzielczości, a następnie dokładniejsza wersja tego samego świata.

## Stan implementacji

Aktualny generator jest działającym szkieletem pipeline'u, a nie pełną
implementacją wszystkich etapów opisanych poniżej. Obecnie zaimplementowane są:

- `WorldShapeStage` — tworzy kołową maskę świata w `worldMask`.
- `NoiseStage` — tworzy deterministyczną mapę szumu w `noiseMap`.
- `MapGenerator` — uruchamia etapy w kolejności i emituje zdarzenia rozpoczęcia
  oraz zakończenia etapu.
- `PipelineWorkerClient` — uruchamia ten sam pipeline w Web Workerze i przekazuje
  zdarzenia etapów do UI.
- podgląd mapy — pozwala przełączać bazową warstwę `World shape`/`Noise` oraz
  włączać nakładkę `World boundary`.
- progres generowania — pokazuje aktualny etap, numer etapu i procent. Procent
  jest obecnie raportowany na granicach etapów; raportowanie postępu z pętli i
  chunków pozostaje zadaniem przyszłego API.

Warstwy `Temperature`, `Moisture`, wysokość, batymetria, hydrologia, biomy i
lokacje są jeszcze planowane. Kontrolki temperatury i wilgotności są już
zarezerwowane w podglądzie, ale pozostają wyłączone do czasu pojawienia się
odpowiednich danych.

Opcjonalne opóźnienie etapów do ręcznego testowania podglądu jest konfigurowane
wewnątrz generatora przez zmienną `VITE_GENERATION_STAGE_DELAY_MS`. Nie jest to
część docelowego czasu generowania i powinno pozostać wyłączone w produkcji.

## Podgląd warstw i nakładek

Podgląd mapy rozdziela warstwę bazową od nakładek. Warstwa bazowa zajmuje cały
canvas, natomiast nakładki są kompozycją renderowaną nad nią. UI powinien
utrzymywać jeden aktywny wybór bazowy oraz zbiór aktywnych nakładek, zamiast
traktować każdą kombinację jako osobny typ mapy.

Docelowy model danych może wyglądać następująco:

```ts
interface MapLayers {
  worldMask?: Uint8Array;
  noiseMap?: Float32Array;
  heightmap?: Float32Array;
  bathymetryMap?: Float32Array;
  temperatureMap?: Float32Array;
  moistureMap?: Float32Array;
  biomeMap?: Uint8Array;
}
```

Generator powinien zwracać surowe dane numeryczne, a renderer podglądu powinien
odpowiadać za palety, normalizację, alpha blending i kolejność rysowania. Dzięki
temu ta sama warstwa może być użyta jako baza, nakładka, źródło statystyk albo
wejście kolejnego etapu.

Warstwy powinny mieć rejestr metadanych obejmujący identyfikator, nazwę, typ
danych, dostępność jako warstwa bazowa oraz dostępność jako nakładka. UI może
wtedy pokazywać przyszłe warstwy jako wyłączone bez udawania, że generator już
je produkuje.

Pierwszy działający wariant używa poziomych tabów dla warstw bazowych i
checkboxów dla nakładek. W przyszłości nakładki numeryczne, takie jak
temperatura i wilgotność, powinny otrzymać także kontrolę przezroczystości oraz
ustaloną paletę kolorów.

## Planowany pipeline

1. `WorldShapeStage` — wyznaczenie obszaru świata zgodnie z kształtem i topologią presetu.
2. `MacroRegionStage` — makroregiony, pola progresji oraz narracyjne wymagania świata.
3. `NoiseStage` — deterministyczne warstwy szumu.
4. `LandmassLayoutStage` — globalny układ struktur geologicznych, ich podstawowy kształt, wspólne szelfy oraz potencjalne archipelagi.
5. `IslandCharacterStage` — profile terenu struktur lądowych i ich regionów.
6. `HeightmapStage` — rasteryzacja struktur geologicznych oraz utworzenie wysokości lądu i batymetrii dna.
7. `LandOceanStage` — przecięcie wysokości poziomem morza i klasyfikacja faktycznych wysp, oceanu, linii brzegowej oraz płytkich wód szelfowych.
8. `ClimateStage` — temperatura, opady, wilgotność i pozostałe warunki klimatyczne.
9. `HydrologyStage` — przepływ wody, rzeki, jeziora i zlewiska wynikające między innymi z opadów.
10. `TerrainFeaturesStage` — klify, plaże, doliny, płaskowyże i inne formacje.
11. `BiomeStage` — biomy wynikające z warunków środowiskowych.
12. `LocationStage` — spawn, zasoby, bossowie i pozostałe lokacje.

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

## Presety świata i konfiguracja makroregionów

Preset powinien być gotową konfiguracją tych samych etapów generatora, a nie osobną implementacją. Użytkownik może rozpocząć od presetu, zmienić jego parametry, a następnie zapisać wynik jako własny profil.

Planowane presety:

1. `Mythic Moon` — zamieszkały księżyc gazowego giganta z bezpiecznym centrum, zimną północą, wulkanicznym południem i progresją rosnącą wraz z odległością od środka. Długie dni i noce, regularne zaćmienia oraz wulkanizm pływowy wspierają fabułę, ale model może świadomie upraszczać astrofizykę na rzecz czytelnego świata.
2. `Earth-like` — zwykła obracająca się planeta, zimne bieguny, strefy umiarkowane, gorący równik oraz normalny cykl dnia i nocy.
3. `Engineered Rings` — sztuczny albo magiczny świat z konfigurowalnymi pierścieniami klimatycznymi wokół centralnego sanktuarium.

Tryb zaawansowany może pozwalać zmieniać układ makroregionów, szerokość stref, źródła ciepła i wilgoci, obrót osi klimatu, siłę gradientów, mieszanie regionów oraz deformację granic. Makroregiony powinny być polami wpływu z płynnym przejściem, a nie rozłącznymi obszarami o ostrych krawędziach.

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

- [trzy presety świata](assets/world-presets.svg).

## Topologia i krawędzie świata

Kształt mapy należy oddzielić od sposobu działania jej krawędzi oraz od presetu klimatu. Użytkownik może wybrać świat radialny w formie dysku albo świat cylindryczny, niezależnie od wybranego układu temperatury i wilgotności.

```ts
interface WorldTopologyConfig {
  shape: 'disc' | 'rectangle';
  wrapX: boolean;
  wrapY: boolean;
  closedEdge: 'cliff' | 'ocean' | 'ice-wall';
  seamOffset: number;
}
```

- Świat radialny lub ringowy może być dyskiem bez zawijania, zakończonym urwiskiem opadającym poza granicę mapy.
- Świat cylindryczny korzysta z prostokątnej mapy zawijanej na osi X. Przejście przez zachodnią krawędź przenosi wtedy na wschodnią, natomiast północ i południe pozostają zamknięte. Taka mapa nie posiada wyróżnionego środka na osi wschód–zachód.
- Noise, hydrologia, lądy i wszystkie inne warstwy muszą być okresowe na zawijanej osi, aby na łączeniu mapy nie powstawał szew.
- Okrągła maska i pełne zawijanie lewo–prawo nie tworzą naturalnej geometrii, dlatego nie powinny być łączone w realistycznym presecie.

### Bezszwowe łączenie cylindra

Świata cylindrycznego nie należy najpierw generować jako zwykłego prostokąta, a następnie sklejać jego boków. Okresowość musi obowiązywać od początku pipeline'u:

- współrzędna X jest normalizowana modulo szerokość świata,
- odległość pozioma korzysta z krótszej drogi przez lewą albo prawą krawędź,
- noise jest okresowy na osi X; można go próbkować po okręgu za pomocą `cos(2πx)` i `sin(2πx)`,
- rasteryzacja lądu uwzględnia kopie struktur przesunięte o `-worldWidth` i `+worldWidth`,
- hydrologia oraz pozostałe operacje sąsiedztwa traktują lewą i prawą kolumnę jako bezpośrednich sąsiadów,
- wykrywanie spójnych wysp nadaje jeden identyfikator lądowi przecinającemu szew,
- renderer normalizuje pozycję gracza i kamery oraz rysuje brakujący fragment mapy z jej przeciwnej strony.

```ts
const directDx = Math.abs(x1 - x2);
const wrappedDx = Math.min(directDx, worldWidth - directDx);
const wrappedX = ((x % worldWidth) + worldWidth) % worldWidth;
```

Wyspa leżąca na szwie może wyglądać jak dwie połówki na płaskim eksporcie PNG, ale w świecie i podczas eksploracji pozostaje jedną ciągłą wyspą. Dla czytelniejszej minimapy można po wygenerowaniu wybrać `seamOffset` przechodzący przez największy obszar oceanu i tylko przesunąć miejsce rozcięcia wizualizacji, bez zmiany danych świata. Prostszym wariantem pierwszej wersji jest wymuszenie oceanicznego pasa na szwie, ale docelowo generator powinien poprawnie obsługiwać przecinające go wyspy.

## Klimat, wilgotność i niebezpieczeństwo

`ClimateStage` powinien tworzyć ciągłe pola środowiskowe, przynajmniej `temperatureMap` i `moistureMap`. W przyszłości mogą dojść `volcanicActivityMap`, `windMap` oraz pola sezonowe. `BiomeStage` klasyfikuje biomy na podstawie kombinacji tych wartości, wysokości, nachylenia, odległości od wody i hydrologii.

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

Wilgotność nie powinna być prostym podziałem na suchy zachód i mokry wschód. Kierunkowy gradient może być jedynie słabym wpływem bazowym. Na niego należy nałożyć wielkoskalowy noise, kilka suchych i mokrych centrów wpływu, odległość od oceanu, dominujące wiatry oraz cień opadowy gór. W efekcie powstaną nieregularne wyspy wilgotności i suchości, które miejscami przenikają na przeciwną stronę świata. Granice powinny być dodatkowo deformowane przez domain warping.

Klimat należy oddzielić od poziomu niebezpieczeństwa i progresji. Dwie strefy umiarkowane w realistycznym świecie nie muszą być równoważne. Jedna może zawierać bezpieczne równiny i lasy, a druga niebezpieczne biomy wynikające z silnego wulkanizmu, toksycznych mokradeł, gwałtownych burz albo odmiennej geologii. Podobnie oba zimne krańce mogą różnić się charakterem, mimo podobnej temperatury.

Pola progresji i narracyjne wymagania pochodzą z `MacroRegionStage`, natomiast `ClimateStage` opisuje warunki fizyczne. Dzięki temu fabuła może wymagać niebezpiecznego południowego regionu bez sztucznego zmieniania całej jego temperatury.

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
