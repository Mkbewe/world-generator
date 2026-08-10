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
3. `LandmassLayoutStage` — globalny układ wysp, mas lądowych i archipelagów.
4. `IslandCharacterStage` — profile terenu wysp i ich regionów.
5. `HeightmapStage` — rasteryzacja mas lądowych i utworzenie wysokości.
6. `LandOceanStage` — klasyfikacja lądu, oceanu i linii brzegowej.
7. `HydrologyStage` — przepływ wody, rzeki, jeziora i zlewiska.
8. `TerrainFeaturesStage` — klify, plaże, doliny, płaskowyże i inne formacje.
9. `BiomeStage` — biomy wynikające z warunków środowiskowych.
10. `LocationStage` — spawn, zasoby, bossowie i pozostałe lokacje.

Kolejność może być później doprecyzowana, szczególnie w przypadku wzajemnego wpływu hydrologii, erozji i formacji terenu.

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
}
```

- Szkielet pozwala tworzyć wyspy podłużne, zakrzywione i zwężające się.
- Dodatnie formy budują półwyspy, połączone części wyspy i przybrzeżne wysepki.
- Ujemne formy wycinają zatoki, cieśniny i wcięcia wybrzeża.
- Wieloskalowy szum oraz domain warping deformują geometryczną bazę.
- Drobniejszy szum odpowiada za nieregularną linię brzegową, a nie za globalny układ lądów.

## Archipelagi

Archipelag jest grupą powiązanych, niewielkich wysp rozmieszczonych wokół wspólnego obszaru.

```ts
interface ArchipelagoDefinition {
  id: string;
  islands: IslandDefinition[];
}
```

Wyspy archipelagu mogą dzielić część cech i pochodzenie losowości, ale nadal mieć indywidualny kształt oraz profil terenu.

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

## Wydajność — dalszy plan

- Najpierw zachować prosty, jednowątkowy pipeline.
- Dane rastrowe przechowywać w typed arrays.
- Później przenieść pipeline do Web Workera.
- Etapy łatwe do podziału wykonywać pasami lub kafelkami w puli workerów.
- Hydrologię i inne globalnie zależne etapy dzielić dopiero po zaprojektowaniu ich przepływu danych.
- Przekazywać bufory jako transferable, raportować postęp i umożliwić anulowanie.
- Rozważyć WebGL lub WebGPU dopiero wtedy, gdy pomiary wykażą taką potrzebę.
