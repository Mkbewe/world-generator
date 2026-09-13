# Refactor: declarative layer catalog as the single source for raster layers

## Zaktualizowany opis zadania

### Problem

Dodanie warstwy rastrowej wymaga obecnie zmian w wielu niezależnych miejscach:

- `MapState` generatora i `MapLayers` renderera,
- implementacji oraz rejestracji stage'a,
- `layer-definition.ts`,
- osobnej klasie painter,
- rejestrze, nawigacji, persistence i statystykach,
- barrel exports i testach związanych z konkretną klasą.

Większość warstw jest renderowana tak samo:

```text
typed array -> palette -> RGBA canvas -> clipping do world mask
```

Różni się generowanie danych oraz mapowanie wartości na kolor. Powtarzanie całej
infrastruktury nie będzie możliwe do utrzymania przy planowanych heightmapach,
klimacie, hydrologii i biomach.

### Cel

Wprowadzić płaski, deklaratywny katalog będący pojedynczym źródłem prawdy dla
warstw rastrowych dostępnych w produkcie. Jeden wpis ma sterować:

- identyfikatorem i źródłem danych,
- walidacją typed array i liczby komórek,
- paletą oraz clippingiem,
- budowaniem i odczytem `CatalogLayer`,
- kolejnością budowania,
- kolejnością oraz grupowaniem zakładek,
- wykrywaniem danych podczas generowania i restore,
- kluczem persistence,
- nazwą w render statistics.

Logika generowania pozostaje w niestandardowych stage'ach.

### Oczekiwany koszt dodania warstwy

Dla rastra, którego konfiguracja już istnieje:

1. wpis w katalogu,
2. plik stage'a,
3. dopisanie stage'a do `pipeline-factory.ts`.

Limit trzech plików dotyczy infrastruktury produkcyjnej rastra. Testy stage'a,
typy konfiguracji, formularze oraz inne UI nowej funkcji są uzasadnionymi
dodatkowymi zmianami i nie są narzutem katalogu.

## Zakres

### W zakresie

- DOM-free, data-only `LayerSpec` i płaski katalog aktualnie działających warstw.
- Palety `solid`, `ramp` i `discrete`.
- Jedna generyczna klasa `CatalogLayer` do walidacji i malowania.
- Osobne `order` katalogowe i `buildOrder` zależności.
- Jednopoziomowe grupy zakładek wyprowadzane z katalogu.
- Wyprowadzenie `MapBaseLayerId` i `MapRasters` z katalogu.
- Zachowanie `MapState` jako stanu generatora, który może zawierać dane
  nierastrowe.
- Luźny kontrakt danych wyłącznie na granicach worker/session/registry/scena.
- Migracja `world-shape`, `noise` i `macro-region`.
- Usunięcie klas painterów oraz callbacków `build`, `read` i `mask`.
- Zachowanie restore, cache, nawigacji i render statistics.
- Przeniesienie współdzielonych kolorów macro-region poza `map-renderer`.

### Poza zakresem

- Zmiany logiki generowania stage'ów.
- Automatyczne odkrywanie lub importowanie stage'ów.
- Wyprowadzanie kolejności stage'ów z katalogu renderowania.
- `world-boundary`, który pozostaje viewport overlayem.
- Nowe zachowania UI i placeholdery przyszłych warstw.
- Warstwy z roadmapy, których generator jeszcze nie produkuje.
- Wielopoziomowe grupy i wiele rodzajów masek.
- Custom renderer oraz escape hatch `render?`.
- Automatyzacja domenowych `summarize()` stage'ów.
- Przywracanie usuniętej warstwy `progression`.

## Decyzje architektoniczne po recenzji

### 1. Katalog jest współdzielony, ale nie należy do renderera

```text
map-generator                map-layers                  map-renderer
  stage'e, MapState     ->     LayerSpec              <-   CatalogLayer
  pipeline-factory             katalog                     registry
                               palety                      scena
                               MapRasters
```

`map-layers` nie korzysta z DOM, canvasa, Reacta ani `map-renderer`. Generator
może importować typ `MapRasters`; jest to zależność od współdzielonego kontraktu,
nie od renderera. Stage'e nie korzystają runtime'owo z palet ani `CatalogLayer`.

Proponowana struktura:

```text
src/utils/map-layers/
  catalog.ts
  layer-spec.ts
  palettes.ts
  types.ts

src/utils/map-renderer/layer/
  map-layer.ts
  catalog-layer.ts
  layer-registry.ts
```

`REGION_COLORS` oraz funkcja używana przez formularze regionów przechodzą z
`map-renderer/layer/macro-region-palette.ts` do neutralnego `map-layers`.

### 2. `MapState` nie jest zbiorem warstw podglądu

Katalog opisuje wyłącznie renderowalne typed arrays. Stan generatora jest
kanałem komunikacji między stage'ami i w przyszłości będzie zawierał także dane
nierastrowe, np. definicje lądów, szkielety oraz profile terenu.

```ts
type MapRasters = RasterTypesDerivedFrom<typeof LAYER_CATALOG>;

interface MapState extends MapRasters {
  // Przyszłe dane domenowe, które nie są warstwami podglądu.
}
```

Konkretny zapis może użyć type intersection, jeśli lepiej współpracuje z
TypeScriptem i ESLintem. Istotna jest granica: `MapRasters` jest częścią
`MapState`, ale `MapState` nie jest pojęciowo katalogiem warstw podglądu.

### 3. Ścisłe typy publiczne, luźne granice runtime

Publiczne `MapRasters` nie dostaje index signature tylko po to, aby registry
mogło indeksować po runtime'owym `source`. Na granicach dynamicznych używamy:

```ts
type LayerDataRecord = Readonly<Record<string, unknown>>;
```

Cast lub konwersja do `MapRasters` ma być zamknięta w jednym miejscu, np. w
`MapScene.getLayers()`, i nie może wyciekać do komponentów ani stage'ów.

### 4. Katalog zawiera tylko działającą powierzchnię produktu

Nie wpisujemy przyszłych warstw tylko po to, aby UI pokazało je jako disabled.
Nowy wpis trafia do katalogu razem z kodem produkującym dane. W v1 nie są
potrzebne flagi `produced`, `required` ani `enabled`.

### 5. Kolejność UI i budowania są niezależne

Registry wystawia:

- `order` — kolejność katalogu dla UI, `MapScene.options` i drzewa grup,
- `buildOrder` — stabilny topological sort zależności `clipTo` dla load/restore.

Zmiana zależności technicznej nie może przestawiać zakładek.

### 6. `clipTo` zastępuje `masked`

```ts
clipTo: 'world-shape'
```

jednocześnie wskazuje maskę i tworzy krawędź w `buildOrder`. Nie deklarujemy
równolegle `masked: true` i `requires: ['world-shape']`.

Ogólne `requires` nie wchodzi do v1. Obecny generyczny renderer potrzebuje tylko
maski, a zależności stage'ów należą do pipeline'u. `requires` można dodać wraz z
pierwszym rzeczywistym przypadkiem renderowania zależnego od innej warstwy.

### 7. Semantyka maski pozostaje dokładna

`world-shape` uznaje komórkę za wewnętrzną tylko dla `value === 1`.
`value !== 0` lub samo `transparentValue: 0` nie zachowuje tego kontraktu.

```ts
providesMask: { insideValue: 1 }
```

W v1 tylko `world-shape` może dostarczać maskę. `CatalogLayer.contains()` używa
ścisłego porównania, wizualizacja kształtu maluje tylko wnętrze, a `MapView`
nadal korzysta z tej maski dla `world-boundary`.

### 8. Rampy obsługują rzeczywistą dziedzinę danych

`RampStop.at` jest wartością źródłowego rastra. Pierwszy i ostatni stop definiują
clamp:

```ts
ramp([
  { at: -1, color: LOW },
  { at: 0, color: MID },
  { at: 1, color: HIGH },
]);
```

Noise używa stopów `0` i `1`, a heightmapa lub temperatura nie wymagają
normalizacji w stage'u. Walidacja wymaga co najmniej dwóch stopów oraz ściśle
rosnących `at`.

### 9. Discrete overflow jest jawne

Paleta dyskretna wymaga `overflow: 'cycle'` albo
`overflow: { color: FALLBACK_COLOR }`. `macro-region` pozostaje przy `cycle`, bo
odpowiada to obecnemu `index % colors.length`.

### 10. Bez DSL-a i escape hatch w v1

Katalog jest zwykłą tablicą:

```ts
export const LAYER_CATALOG = [
  // entries
] as const satisfies readonly LayerSpec[];
```

Runtime validation wykonuje `LayerRegistry`. `defineCatalog` nie jest potrzebne.
`defineLayer` można dodać tylko wtedy, gdy test typów wykaże utratę literałów lub
wyraźnie poprawi ergonomię.

Nie dodajemy `render?`. Kontrakt `palette | custom` należy zaprojektować dopiero
dla pierwszego realnego przypadku niestandardowego renderowania.

## Docelowy kontrakt

```ts
type Color = readonly [red: number, green: number, blue: number];

type PaletteSpec =
  | { readonly kind: 'solid'; readonly color: Color }
  | {
      readonly kind: 'ramp';
      readonly stops: readonly {
        readonly at: number;
        readonly color: Color;
      }[];
    }
  | {
      readonly kind: 'discrete';
      readonly colors: readonly Color[];
      readonly overflow: 'cycle' | { readonly color: Color };
    };

interface LayerSpec {
  readonly id: string;
  readonly label: string;
  readonly source: string;
  readonly dataType: 'uint8' | 'float32';
  readonly clipTo?: string;
  readonly providesMask?: { readonly insideValue: number };
  readonly group?: { readonly id: string; readonly label: string };
  readonly palette: PaletteSpec;
}
```

Przykład katalogu:

```ts
export const LAYER_CATALOG = [
  {
    id: 'world-shape',
    label: 'World shape',
    source: 'worldMask',
    dataType: 'uint8',
    providesMask: { insideValue: 1 },
    palette: { kind: 'solid', color: [16, 42, 67] },
  },
  {
    id: 'macro-region',
    label: 'Macro regions',
    source: 'macroRegionIdMap',
    dataType: 'uint8',
    clipTo: 'world-shape',
    palette: {
      kind: 'discrete',
      colors: REGION_COLORS,
      overflow: 'cycle',
    },
  },
  {
    id: 'noise',
    label: 'Noise',
    source: 'noiseMap',
    dataType: 'float32',
    clipTo: 'world-shape',
    palette: {
      kind: 'ramp',
      stops: [
        { at: 0, color: [0, 0, 0] },
        { at: 1, color: [255, 255, 255] },
      ],
    },
  },
] as const satisfies readonly LayerSpec[];
```

## Zachowanie `CatalogLayer`

`CatalogLayer`:

- przechowuje `spec`, `data`, `size` i opcjonalną maskę,
- mapuje `uint8` na `Uint8Array`, a `float32` na `Float32Array`,
- odrzuca niewłaściwy typed array i rozmiar inny niż `width * height`,
- wykorzystuje istniejący lifecycle, kafelkowanie, cache i statystyki `MapLayer`,
- pomija komórki poza `clipTo`,
- dla providera maski implementuje `value === insideValue`,
- udostępnia surowe `data` dla persistence,
- nie zna logiki stage'a.

Paleta jest kompilowana raz do funkcji zapisującej bezpośrednio do
`Uint8ClampedArray`. Pętla pikseli nie tworzy nowej tablicy RGB dla każdej
komórki.

## Registry i scena

`LayerRegistry`:

- waliduje unikalne `id` i `source`, typ danych oraz palety,
- waliduje, że `clipTo` istnieje i wskazuje provider maski,
- wykrywa cykle,
- waliduje kolizje `group.id` z ID warstw oraz spójność etykiet grup,
- tworzy `order`, `buildOrder` i jednopoziomowe `tree`,
- umieszcza grupę w miejscu pierwszego dziecka i zachowuje kolejność dzieci,
- znajduje źródła obecne w danych stage'a lub snapshotu.

`MapScene`:

- buduje według `buildOrder`, a opcje wystawia według `order`,
- tworzy `CatalogLayer` bez callbacków `build`, `read` i `mask`,
- zapisuje `[spec.source, layer.data]`,
- udostępnia maskę tylko z wpisów `providesMask`,
- zachowuje cache oparty na tożsamości specyfikacji, danych, rozmiaru i maski.

## Persistence i statystyki

Persistence nadal zapisuje surowe typed arrays. Katalog dostarcza `source`, po
którym dane są zbierane i odtwarzane.

Render statistics zachowują obecne znaczenie:

- `id` i `name` pochodzą z katalogu,
- `durationMs`, `tiles` i `pixels` z lifecycle'u `MapLayer`,
- `bytes` pozostaje rozmiarem bitmapy RGBA.

Domenowe statystyki pozostają w `stage.summarize()`. Katalog nie liczy coverage,
rozkładu noise ani liczby regionów.

## Kryteria akceptacji

- `world-shape`, `noise` i `macro-region` są wpisami płaskiego katalogu.
- Nie istnieją dla nich osobne klasy painterów.
- Proceduralne `layer-definition.ts` oraz callbacki `build`, `read`, `mask`
  zostają usunięte.
- Typ i liczba komórek są walidowane na podstawie `dataType`.
- `world-shape` zachowuje `value === 1`, noise dokładne zaokrąglanie skali
  szarości, a macro-region cykliczny dobór kolorów.
- `order` UI nie zależy od `buildOrder`.
- Jednopoziomowe grupy powstają z katalogu.
- Restore i persistence read używają `source` oraz `CatalogLayer.data`.
- `MapRasters` i `MapBaseLayerId` są wyprowadzone z katalogu, a `MapState` może
  zawierać dane nierastrowe.
- `Record<string, unknown>` nie wycieka do publicznych konsumentów mapy.
- `world-boundary` pozostaje osobnym viewport overlayem.
- Snapshoty, cache, restore, navigation i render statistics są niezmienione.
- Generator nie importuje `map-renderer`, a `map-layers` pozostaje DOM-free.
- Nowy skonfigurowany raster nie wymaga klasy, zmian registry, persistence,
  navigation ani eksportów painterów.
- Typecheck, ESLint, Stylelint, Prettier i wszystkie testy przechodzą.

## Strategia testów

Przed migracją należy scharakteryzować:

- dokładne RGBA wszystkich trzech warstw,
- transparentność poza maską i wartości maski inne niż 0/1,
- kolejność UI i budowania,
- cache po zmianie danych, rozmiaru, specyfikacji oraz maski,
- round-trip `MapScene.load()` / `getLayers()` i restore,
- strukturę render statistics.

Nowa infrastruktura wymaga testów:

- właściwego i niewłaściwego typed array oraz liczby komórek,
- solid, ramp clamp/interpolation/rounding i obu discrete overflow,
- clippingu i `insideValue`,
- duplikatów, nieznanego `clipTo`, cykli i grup,
- niezależnych `order` i `buildOrder`,
- typów `MapBaseLayerId` i `MapRasters`.

Po migracji testy zachowania pozostają, ale nie są organizowane według usuniętych
klas painterów.

## Plan wdrożenia i podział na etapy

Zadanie warto rozbić na trzy PR-y po przygotowaniu baseline'u. Nie należy jednak
utrzymywać dwóch równoległych rejestrów. Przełączenie registry na katalog powinno
być atomowym elementem drugiego PR-a.

### Etap 0: baseline i przygotowanie zakresu

- Oddzielić lub zakończyć bieżące zmiany macro-region/UI.
- Potwierdzić zestaw warstw: `world-shape`, `macro-region`, `noise`.
- Dodać brakujące testy pikseli, maski, cache, restore, navigation i statystyk.
- Zapisać zachowanie maski dla wartości innych niż 0/1 i overflow regionów.

Warunek zakończenia: brak zmian produkcyjnych i wszystkie kontrole są zielone.

### Etap 1 / PR 1: fundament katalogu i palet

- Utworzyć DOM-free `map-layers`.
- Dodać `LayerSpec`, `PaletteSpec` i mapowanie `dataType` na typed arrays.
- Dodać bezalokacyjne kompilatory `solid`, `ramp`, `discrete` i ich testy.
- Przenieść `REGION_COLORS`/`regionColor`; poprawić importy formularzy i
  istniejącego renderera.
- Dodać `CatalogLayer` oraz testy kontraktowe.
- Nie dodawać `defineCatalog`, custom renderera ani zagnieżdżonych grup.

Warunek zakończenia: prymitywy są przetestowane, ale produkcyjne registry i obraz
pozostają bez zmian.

### Etap 2 / PR 2: atomowe przełączenie i migracja

- Dodać wpisy katalogu dla trzech warstw.
- Przestawić `LayerRegistry` na płaski katalog.
- Wprowadzić `order`, `buildOrder` i generowanie drzewa grup.
- Przestawić `MapScene`, load, restore, persistence read i maski.
- Zachować cache inputs oraz render statistics.
- Usunąć `WorldShapeLayer`, `NoiseLayer`, `MacroRegionLayer` i proceduralne
  `layer-definition.ts`.
- Zastąpić testy klas testami katalogu i zachowania renderera.

PR może mieć kilka commitów, ale kończy się jednym aktywnym katalogiem i bez
tymczasowej warstwy kompatybilności.

Warunek zakończenia: katalog steruje runtime'em, nie ma klas painterów, a testy
są zielone.

### Etap 3 / PR 3: typy i sprzątanie API

- Wyprowadzić `MapBaseLayerId`, `LayerSource` i `MapRasters` z katalogu.
- Pozostawić `MapState` rozszerzalny o dane nierastrowe.
- Wprowadzić wewnętrzny `LayerDataRecord` i zamknąć casty w registry/scenie.
- Usunąć duplikaty z `map-renderer/types.ts`.
- Uporządkować exports i usunąć eksporty painterów.
- Dodać testy typów i zaktualizować dokumentację architektury.

Warunek zakończenia: nowy raster nie wymaga ręcznych zmian typów renderera,
registry, persistence, navigation ani eksportów painterów.

### Etap 4: końcowa weryfikacja

Może być ostatnim commitem PR 3:

- uruchomić typecheck, ESLint, Stylelint, Prettier i cały zestaw testów,
- porównać snapshoty RGBA, kolejność zakładek i raportów,
- sprawdzić restore,
- zmierzyć większą mapę pod kątem regresji palety,
- testowo dodać tymczasową warstwę i policzyć zmiany produkcyjne,
- usunąć tymczasową warstwę po teście.

Warunek zakończenia: każde kryterium akceptacji jest potwierdzone.

## Poprawiony plan końcowy

1. Ustabilizować gałąź i zamrozić zachowanie testami charakteryzującymi.
2. Utworzyć neutralny, DOM-free moduł `map-layers`.
3. Zdefiniować prosty `LayerSpec` z `clipTo`, `providesMask`, `group` i paletą;
   bez `defineCatalog`, `requires` i custom renderera w v1.
4. Zaimplementować bezalokacyjne `solid`, `ramp` i `discrete`, z rzeczywistą
   dziedziną stopów oraz jawnym overflow.
5. Zaimplementować `CatalogLayer`, zachowując lifecycle, kafelkowanie, cache,
   dokładną semantykę maski i statystyki.
6. Atomowo przełączyć registry i scenę, rozdzielając `order` UI od
   topologicznego `buildOrder`.
7. Zmigrować `world-shape`, `macro-region` i `noise`; usunąć klasy painterów oraz
   callbacki `build`, `read` i `mask`.
8. Wyprowadzić `MapBaseLayerId` i `MapRasters`, ale pozostawić `MapState`
   rozszerzalny o dane nierastrowe; luźne rekordy zamknąć na granicach runtime.
9. Uporządkować exports i zastąpić testy klas testami katalogu, palet, sceny i
   zachowania end-to-end.
10. Wykonać pełną weryfikację parity, restore, kolejności, statystyk, wydajności
    oraz limitu trzech plików produkcyjnych.
