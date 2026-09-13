# Declarative layer catalog

## Cel

Dodanie nowej warstwy rastrowej nie powinno wymagać ręcznej edycji typów stanu,
typów danych renderera, fabryk warstw, rejestru, nawigacji, persistence, eksportów
i osobnej klasy renderującej.

Docelowo nowa warstwa generowana przez nowy etap powinna wymagać najwyżej trzech
plików produkcyjnych:

1. pliku stage'a,
2. wpisu w katalogu warstw,
3. dopisania stage'a do `pipeline-factory.ts`.

Test stage'a lub UI jego konfiguracji są uzasadnionymi dodatkowymi plikami i nie
powinny być liczone jako narzut infrastruktury rasterów.

## Ocena obecnego rozwiązania

Kierunek refaktoru jest właściwy. Obecny kod ma już część potrzebnej
infrastruktury (`LAYER_DEFINITIONS`, `LayerRegistry`, sortowanie zależności oraz
generowanie drzewa zakładek), ale abstrakcja zatrzymała się w połowie.

Ta sama informacja jest nadal powtarzana w kilku miejscach:

- `MapState` i `MapLayers` osobno deklarują te same źródła typed arrays,
- `layer-definition.ts` powtarza walidację typu i rozmiaru oraz callbacki
  `build`, `read` i `mask`,
- `WorldShapeLayer`, `NoiseLayer`, `ProgressionLayer` i `MacroRegionLayer`
  powtarzają niemal identyczną pętlę renderującą,
- eksporty oraz testy są związane z konkretnymi klasami painterów,
- fabryka pipeline'u ręcznie ustala stage'e, co jest właściwe i powinno pozostać
  jawne.

Katalog powinien eliminować wyłącznie powtarzalną integrację rastra. Nie powinien
przejmować niestandardowej logiki generowania ani domenowych statystyk stage'ów.

## Docelowy podział odpowiedzialności

```text
layer catalog
├── MapLayerId / MapLayers / MapState
├── typ i rozmiar danych
├── zależności warstw
├── grupy zakładek
├── paleta
├── klucze persistence
└── nazwy używane w statystykach renderowania
        │
        └── CatalogLayer
            ├── walidacja
            ├── wspólne kafelkowanie
            ├── clipping do maski
            └── zapis pikseli
```

Katalog powinien znajdować się w neutralnym module współdzielonym przez generator
i renderer, na przykład:

```text
src/utils/map-layer-catalog/
  catalog.ts
  layer-spec.ts
  palettes.ts
```

Umieszczenie kanonicznych typów wyłącznie pod `map-renderer` stworzyłoby
niepotrzebną zależność generatora od renderera.

## Kontrakt katalogu

Przykładowy kontrakt:

```ts
type RasterDataType = 'uint8' | 'float32';

type PaletteSpec =
  | {
      kind: 'solid';
      color: RGB;
      transparentValue?: number;
    }
  | {
      kind: 'ramp';
      stops: readonly RampStop[];
    }
  | {
      kind: 'discrete';
      colors: readonly RGB[];
      overflow: 'cycle' | { color: RGB };
    };

interface LayerSpec {
  readonly id: string;
  readonly label: string;
  readonly source: string;
  readonly dataType: RasterDataType;
  readonly requires?: readonly string[];
  readonly group?: {
    readonly id: string;
    readonly label: string;
  };
  readonly masked?: boolean;
  readonly providesMask?: boolean;
  readonly palette: PaletteSpec;
}
```

`masked` i `providesMask` muszą mieć różne znaczenia:

- `masked: true` oznacza przycięcie renderowania do `world-shape`,
- `providesMask: true` oznacza, że dane warstwy mogą służyć jako maska.

Jeżeli pojawi się więcej rodzajów masek, `masked` powinno zostać rozszerzone lub
zastąpione przez `clipTo: MapLayerId`. W pierwszej wersji `masked: true` może być
normalizowane wewnętrznie do `clipTo: 'world-shape'`.

`masked: true` powinno automatycznie dodawać zależność od `world-shape`. Nie należy
wymagać równoczesnego wpisywania `masked: true` i `requires: ['world-shape']`, bo
te deklaracje mogą się rozjechać.

Przykład:

```ts
export const LAYER_CATALOG = defineCatalog([
  defineLayer({
    id: 'world-shape',
    label: 'World shape',
    source: 'worldMask',
    dataType: 'uint8',
    providesMask: true,
    palette: solid([16, 42, 67], { transparentValue: 0 }),
  }),
  defineLayer({
    id: 'noise',
    label: 'Noise',
    source: 'noiseMap',
    dataType: 'float32',
    masked: true,
    palette: ramp([
      { at: 0, color: [0, 0, 0] },
      { at: 1, color: [255, 255, 255] },
    ]),
  }),
  defineLayer({
    id: 'macro-region',
    label: 'Macro regions',
    source: 'macroRegionIdMap',
    dataType: 'uint8',
    masked: true,
    palette: discrete(REGION_COLORS, { overflow: 'cycle' }),
  }),
] as const);
```

`defineLayer` powinno używać const generics, aby zachować literalne `id`, `source`
i `dataType`. `defineCatalog` lub `LayerRegistry` powinny runtime'owo sprawdzać:

- duplikaty identyfikatorów i źródeł,
- nieznane zależności,
- cykle zależności,
- kolizje identyfikatorów grup i warstw,
- niespójne etykiety grup.

Nie warto kodować całej walidacji grafu w złożonych typach TypeScript.

## Typy wyprowadzane z katalogu

`MapBaseLayerId`, `MapLayers` oraz `MapState` powinny być generowane z katalogu:

```ts
type TypedArrayFor<T extends RasterDataType> =
  T extends 'uint8' ? Uint8Array : Float32Array;

type CatalogEntry = (typeof LAYER_CATALOG)[number];

export type MapBaseLayerId = CatalogEntry['id'];

export type MapLayers = Partial<{
  [Entry in CatalogEntry as Entry['source']]:
    TypedArrayFor<Entry['dataType']>;
}>;

export type MapState = MapLayers;
```

Ogólne `StageData = Record<string, unknown>` może pozostać otwarte, ponieważ etap
może zwracać również dane, które nie są rastrem przeznaczonym do wyświetlenia.

## CatalogLayer

Jedna klasa `CatalogLayer` powinna:

- przechowywać `spec`, `data`, `size` i opcjonalną maskę,
- walidować klasę typed array na podstawie `dataType`,
- sprawdzać `data.length === width * height`,
- korzystać z istniejącego lifecycle'u, kafelkowania i statystyk `MapLayer`,
- mapować wartości przez skompilowaną paletę,
- pozostawiać piksele poza maską przezroczyste,
- udostępniać `SpatialMask` tylko dla wpisów `providesMask`,
- pozwalać scenie zapisywać surowe `layer.data` bez callbacka `read`.

Paleta nie powinna tworzyć nowej tablicy RGB dla każdego piksela. `PaletteSpec`
należy raz skompilować do funkcji zapisującej bezpośrednio do
`Uint8ClampedArray`. Pozwoli to uniknąć milionów krótkotrwałych alokacji przy
dużych mapach.

## Registry i grupy

Katalog powinien być płaski, a `group` powinno zawierać wyłącznie metadane
nawigacji. Registry wyprowadza z niego jednopoziomowe drzewo.

Należy zachować dwie niezależne kolejności:

- kolejność wpisów katalogu określa kolejność zakładek,
- sortowanie topologiczne po `requires` określa kolejność budowania warstw.

Zmiana zależności nie może przypadkowo przestawiać UI.

## Persistence i statystyki

`MapScene.load()` oraz `getLayers()` powinny korzystać odpowiednio z `spec.source`
i `CatalogLayer.data`. Osobne callbacki `build` i `read` nie są potrzebne.

Katalog może dostarczać `id`, `label`, `source` i `dataType` używane przez
persistence oraz statystyki renderowania. Nie powinien jednak przejmować
statystyk domenowych:

- `WorldShapeStage` nadal może liczyć coverage,
- `NoiseStage` nadal może liczyć min/max/mean/stdDev,
- `MacroRegionStage` nadal może liczyć regiony i overlays.

Te wartości zależą od semantyki stage'a, a nie od sposobu wyświetlania rastra.
Rozmiar raportowany przez render statistics powinien pozostać rozmiarem bitmapy
RGBA, jeśli wymagane jest zachowanie obecnego zachowania.

## Pipeline

Stage'e powinny pozostać niestandardowe i jawnie ułożone w `pipeline-factory.ts`:

```ts
new MapGenerator([
  new WorldShapeStage(),
  new MacroRegionStage(),
  new NoiseStage(),
]);
```

Nie należy umieszczać konstruktorów stage'ów w katalogu warstw ani używać
dynamicznych importów. Jeden stage może w przyszłości produkować kilka rastrów,
np. `temperatureMap` i `moistureMap`, a część stage'ów może nie produkować
warstwy wyświetlanej.

## Palety i zgodność zachowania

Palety muszą zachować dokładne obecne reguły:

- `solid` obsługuje przezroczystą wartość potrzebną przez `world-shape`,
- `ramp` clampuje wartości i stosuje ten sam sposób zaokrąglania,
- `discrete` ma jawnie określone zachowanie po przekroczeniu liczby kolorów.

Obecna paleta macro-region używa cyklu (`index % colors.length`). Jeżeli
"fallback" ma oznaczać stały kolor zamiast cyklu, będzie to zmiana zachowania i
powinna zostać jawnie dopisana do acceptance criteria. Przy wymaganiu zachowania
snapshotów właściwym ustawieniem jest `overflow: 'cycle'`.

## Escape hatch

Na początku nie należy dodawać ogólnego `render?`, ponieważ łatwo odtworzyłby
system osobnych painterów wewnątrz katalogu.

Jeżeli pojawi się rzeczywisty wyjątek, można wprowadzić rozłączny kontrakt:

```ts
type LayerVisual =
  | { kind: 'palette'; palette: PaletteSpec }
  | { kind: 'custom'; renderer: RasterRenderer };
```

Jest to bezpieczniejsze niż równoczesne opcjonalne `palette` i `render`, dla
których nie byłoby jasne, co ma pierwszeństwo.

## Plan wdrożenia

1. Ustabilizować i oddzielnie zatwierdzić bieżące zmiany macro-region/UI.
2. Dodać testy charakteryzujące obecne piksele, masking, restore, kolejność,
   cache i render statistics.
3. Wprowadzić `LayerSpec`, `defineLayer`, `defineCatalog` i palety wraz z testami.
4. Dodać `CatalogLayer` i najpierw przenieść `world-shape` oraz `noise`.
5. Przestawić registry i drzewo zakładek na płaski katalog.
6. Przenieść `macro-region` oraz `progression`, jeżeli progression nadal należy
   do produktu.
7. Wyprowadzić `MapLayers`, `MapState` i `MapBaseLayerId` z katalogu.
8. Usunąć klasy painterów, proceduralne definicje, zbędne eksporty i ich testy.
9. Uruchomić `typecheck`, lint, format, testy i porównać snapshoty oraz strukturę
   render statistics.

Bieżący working tree usuwa `progression-layer.ts`. Nie należy przywracać martwej
warstwy wyłącznie w celu spełnienia nieaktualnego punktu ticketu. Zakres migracji
trzeba zsynchronizować z ostatecznym kierunkiem macro-region.

## Proponowane testy

- testy `solid`, `ramp` i `discrete`, w tym clamp, interpolacja, alpha i overflow,
- tabelaryczne testy `CatalogLayer` dla obu typów typed arrays,
- walidacja błędnego typu i liczby komórek,
- clipping poza `world-shape`,
- udostępnianie `SpatialMask` przez `world-shape`,
- duplikaty, nieznane zależności i cykle katalogu,
- stabilna kolejność UI niezależna od kolejności zależności,
- round-trip `MapScene.load()` / `getLayers()` z zachowaniem referencji danych,
- restore ostatniej mapy,
- niezmienione snapshoty i pola render statistics,
- brak osobnych testów klas painterów po migracji.

## Doprecyzowane kryteria akceptacji

- Dodanie istniejącego pola rastrowego do podglądu wymaga tylko wpisu w katalogu.
- Dodanie nowego rastra i generującego go etapu wymaga najwyżej trzech plików
  produkcyjnych: katalogu, stage'a i `pipeline-factory.ts`.
- Nie trzeba ręcznie edytować `MapState`, `MapLayers`, identyfikatorów warstw,
  registry, tabs, persistence ani eksportów painterów.
- Walidacja konstruktora typed array i liczby komórek wynika z `dataType`.
- Wszystkie standardowe warstwy korzystają z `CatalogLayer`; brak osobnych klas
  painterów dla zmigrowanych warstw.
- Grupy są jednopoziomowe i pochodzą z katalogu.
- World-boundary pozostaje osobnym rendererem viewport overlay.
- Stage'e i ich domenowe `summarize()` pozostają niestandardowe.
- Obraz, masking, restore, cache oraz struktura render statistics pozostają bez
  zmian.
- Typecheck, lint, format i testy przechodzą.

