# Przegląd architektury komponentów

Lista elementów `src/components`, które według przeglądu wymagają uspójnienia
kontraktów, granic odpowiedzialności, dostępności albo podziału logiki. Lista
nie jest rankingiem ważności. Nie obejmuje komponentów, dla których nie
stwierdzono potrzeby zmian.

## Granice odpowiedzialności i struktura

| Komponent lub moduł | Zakres wymaganej poprawy |
| --- | --- |
| `map-preview/map-preview.tsx` i `map-preview/hooks/use-map-readout.ts` | Rozdzielić koordynację podglądu od obsługi gestów, pomiaru, pinowania i odczytu kursora. Hook łączy kilka niezależnych odpowiedzialności. |
| `map-preview/hooks/use-map-renderer.ts` | Usunąć rzutowanie kluczy `Object.entries(overlays)` na `MapOverlayId`; użyć typowanych identyfikatorów albo jawnie zawęzić klucz na granicy. |
| `map-measure/map-measure.tsx` | Oddzielić obliczanie geometrii segmentów, etykiet i podziałek od renderowania SVG; dodać testy do czystej logiki. |
| `world-generator/lib/world-generation-session.ts` | Przenieść orkiestrację sesji generowania poza drzewo UI. Usunąć zależność logiki sesji od komponentu `GenerationProgress`. |
| `generation-progress/generation-progress.tsx`, `progress-header/progress-header.tsx`, `stage-bars/stage-bars.tsx`, `stage-list/stage-list.tsx` | Oddzielić model widoku od typów store’a i przenieść widoczne teksty statusów oraz etykiet do tłumaczeń. |
| `settings-panel/forms/geology-form/hooks/use-geology-selection.ts`, `geology-form.tsx`, `heightmap-form/heightmap-form.tsx` | Przenieść współdzieloną selekcję regionu do neutralnej warstwy formularzy. `HeightmapForm` nie powinien zależeć od hooka ukrytego wewnątrz `GeologyForm`. |
| `geology-form/geology-form.tsx` | Przenieść koordynację zmian między store’ami geologii i heightmapy do jednej akcji lub hooka warstwy formularzy, zamiast rozdzielać ją między callbacki komponentu. |
| `geology-form/geology-form.tsx`, `heightmap-form/heightmap-form.tsx`, `macro-region-form/base-region-section/base-region-section.tsx`, `macro-region-form/overlay-region-section/overlay-region-section.tsx` | Ujednolicić przygotowywanie danych `RegionTabs`; komponenty powtarzają mapowanie elementów formularza na taby. |
| `macro-region-form/region-card/overlay-region-card/overlay-region-card.tsx` | Zawęzić wejściowy typ `region` do geometrii `band`. Komponent przyjmuje obecnie ogólny `MacroRegionConfig`, a następnie zwraca `null` dla nieobsługiwanego wariantu. |
| `map-sidebar/map-sidebar.tsx` | Zastąpić niezależne opcjonalne `expanded`, `view`, `measure` i `inspector` typowanymi wariantami trybu, tak aby API nie dopuszczało nieobsługiwanych kombinacji. |
| `map-sidebar/view-controls/view-controls.tsx`, `map-sidebar/overlay-controls/overlay-controls.tsx`, `map-sidebar/cursor-readout/cursor-readout.tsx` | Usunąć powtarzający się wariant `bare` i warunkowe opakowanie kartą. Opakowanie panelu powinien kontrolować właściciel układu. |
| `components/lib/` | Zastąpić ogólny folder `lib` strukturą odzwierciedlającą właścicieli helperów albo jawnie nazwanym modułem wspólnych prymitywów UI. Obecnie łączy formatowanie koloru, udziały procentowe i typ segmentu dystrybucji. |

## Typy i kontrakty API

| Komponent lub moduł | Zakres wymaganej poprawy |
| --- | --- |
| `vertical-tabs/vertical-tabs.tsx` i `settings-panel/settings-panel.tsx` | Uczynić `VerticalTabs` generycznym względem wartości tabów; usunąć rzutowanie `string` na `SettingsTab`. |
| `settings-panel/settings-panel.tsx` | Oprzeć rejestrację formularzy i tabów na jednym typowanym źródle zamiast mapować identyfikatory warstw i rzutować wybraną wartość. |
| `map-sidebar/panel-header/panel-header.tsx` | Zawęzić wartość z `SegmentedControl` do `PanelPosition` bez rzutowania. |
| `settings-panel/forms/macro-region-form/preset-picker/preset-picker.tsx` | Zawęzić wartość kontrolki do `MacroRegionPresetId` przed wywołaniem store’a, bez rzutowania. |
| `settings-panel/forms/macro-region-form/base-layout-field/base-layout-field.tsx` | Zawęzić wartość kontrolki do `MacroRegionLayout` bez rzutowania. |
| `settings-panel/forms/world-shape-form/shape-field/shape-field.tsx` | Zawęzić wartość kontrolki do `WorldShape` bez rzutowania. |
| `settings-panel/forms/macro-region-form/region-card/overlay-region-card/overlay-region-card.tsx` | Zawęzić oś overlayu do `'x' | 'y'` bez rzutowania. |
| `region-tabs/region-tabs.tsx` | Używać stabilnego `id` jako wartości wyboru zamiast indeksu oraz zapewnić pełną obsługę klawiatury i relacje tab/tablist. |
| `layer-tabs/layer-tabs.tsx` | Typować mapę ikon konkretnymi identyfikatorami warstw zamiast `Record<string, ReactNode>`. |
| `header/header-actions-context.tsx` | Wymagać providera i zgłaszać jego brak; domyślne funkcje setterów maskują błędne użycie kontekstu. |
| `export-dialog/export-dialog.tsx` | Utrzymywać wybrany format w zgodzie z aktualnym `formats` i cyklem otwarcia dialogu. Stan jest inicjalizowany tylko raz i może wskazywać nieistniejącą opcję po zmianie listy. |

## Dostępność i spójność interfejsu

| Komponent lub moduł | Zakres wymaganej poprawy |
| --- | --- |
| `mobile-menu/mobile-menu.tsx` i `mobile-menu/menu-drawer/menu-drawer.tsx` | Określić i wdrożyć modalny lub niemodalny kontrakt draweru, w tym właściwe zarządzanie fokusem przy otwarciu, zamknięciu i nawigacji klawiaturą. |
| `map-sidebar/measure-controls/measure-controls.tsx` | Przenieść teksty „Controls”, „Measure” i instrukcję obsługi do katalogów tłumaczeń. |
| `info-label/info-label.tsx` | Uczynić `description` opcjonalnym w typie, zgodnie z zachowaniem komponentu, który już pomija tooltip bez opisu. |

## Dalsze kierunki porządkowania

Poniższe punkty dotyczą granic między komponentami, stanem aplikacji i usługami.
Nie zastępują wcześniejszych uwag; wskazują kolejność dalszego upraszczania
architektury.

| Priorytet | Obszar | Zakres wymaganej poprawy |
| --- | --- | --- |
| wysoki | `world-generator/hooks/use-world-generation.ts` i `world-generator/lib/world-generation-session.ts` | Wydzielić przypadek użycia generowania od Reacta, store'ów i renderera. Hook powinien zebrać dane wejściowe i prezentować stan, a usługa przyjmować konfigurację oraz deklarowane porty postępu i wyników. Obsługa zdarzeń warstw powinna trafiać do adaptera preview/renderera, nie bezpośrednio do sesji. |
| wysoki | synchronizacja ustawień i podglądu | Ustanowić jeden model oraz właściciela operacji „wybierz warstwę”, „wybierz region”, „otwórz zakładkę” i „powiąż widoki”. Obecnie koordynacja jest rozproszona między `MapPreview`, hookami synchronizacji i formularzami, co utrudnia śledzenie skutków jednej interakcji. |
| średni | formularze geologii i heightmapy | Przenieść akcje obejmujące oba store'y do warstwy aplikacyjnej: zmiana typu regionu wraz z domyślną rzeźbą oraz zastosowanie presetu geologii powinny być pojedynczymi intencjami, a nie sekwencją callbacków komponentu. |
| średni | `generation-statistics/` i `render-statistics/` | Wydzielić czyste funkcje budujące model widoku statystyk: sekcje, metryki i segmenty czasu. Komponenty powinny renderować gotowy model, a obliczenia i ich testy nie wymagać Reacta. |
| średni | własne kontrolki interaktywne | Ustalić kontrakt dostępności dla canvasu, tabów regionów, uchwytów rozkładu, przełącznika języka, fullscreen i dialogów: pełna obsługa klawiatury, relacje ARIA, fokus przy otwarciu i zamknięciu oraz komunikaty dla czytników ekranu. |
| niski | formatowanie i tłumaczenia statystyk | Ujednolicić, które etykiety techniczne i jednostki są tłumaczalne. Pozostały teksty w rodzaju `reused` oraz formaty takie jak `ms/MPix`, podczas gdy inne etykiety korzystają z katalogów tłumaczeń. |
| niski | duże testy integracyjne generatora i preview | Po wyraźnym wydzieleniu usług i adapterów rozłożyć testy na testy kontraktów czystej logiki oraz krótsze testy integracyjne. Nie dzielić ich wyłącznie dla długości; celem jest niezależne sprawdzanie odpowiedzialności. |

`use-map-readout.ts` warto dzielić wyłącznie wzdłuż rzeczywistych modeli
interakcji — gestów pan/zoom, pomiaru i odczytu — a nie na drobne hooki bez
własnego kontraktu. Sam folder `components/lib/` jest problemem dopiero wtedy,
gdy helpery są współdzielone przez niezależne domeny; jego porządkowanie ma
niższy priorytet niż granice generowania i synchronizacji widoków.

## Plan: wybór kolorowych elementów i karty edycji

Obecne `RegionTabs` nie są ograniczone do regionów: wybierają również strefy
cieplne. Komponent nie przełącza własnych paneli, lecz wybiera obiekt, którego
edytor jest renderowany niżej. Powinien zatem być selektorem, a nie deklarować
wzorzec ARIA tabów.

Poniższe dwa zadania są niezależnymi, kolejno wykonywanymi etapami tej zmiany.

### 1. Zastąpić `RegionTabs` selektorem `ColorSwatchTabs`

- Przemianować folder i publiczny komponent na `color-swatch-tabs` /
  `ColorSwatchTabs`; pojedynczy przycisk może być wydzielony jako
  `ColorSwatchTab`.
- Zastąpić domenowy `RegionTabItem` neutralnym `ColorSwatchTabOption` z polami
  `id`, `label` i `color`.
- Zmienić kontrakt na `selectedId` oraz `onSelect(id)`. Identyfikator nie może
  służyć wyłącznie jako React `key`; ma być wartością wyboru przekazywaną przez
  komponent.
- Zastąpić `role='tablist'` i `role='tab'` zwykłymi przyciskami z
  `aria-pressed`. Komponent nie jest właścicielem `tabpanel`, więc nie powinien
  deklarować niepełnego wzorca tabs.
- Zmigrować użycia w geologii, heightmapie, base climate oraz base i overlay
  macro regions.
- Zastąpić geologiczne `selectedRegionId` neutralnym zaznaczeniem elementu mapy,
  np. `MapFeatureSelection` z `layerId` i `featureId`. Stan oraz API powinny
  używać `selectedFeature` i `setSelectedFeature`, aby nie utrwalać wyjątku
  geologii.
- Wydzielić wspólny hook wyboru po stabilnym `id`, który łączy formularz z
  zaznaczeniem mapy: przyjmuje warstwę i listę opcji, znajduje aktywny element,
  bezpiecznie wraca do pierwszego po jego usunięciu i zapisuje wybór jako
  `{ layerId, featureId }`. Ma obsługiwać geologię, heightmapę, base climate
  oraz base i overlay macro regions. Heightmapa świadomie używa zaznaczenia
  regionu geologicznego, ponieważ edytuje jego rzeźbę.
- Zmienić API renderera z `setSelectedRegion` na `setSelection`. Warstwy, które
  potrafią podświetlić element, powinny deklarować własną obsługę zaznaczenia;
  renderer nie może rozgałęziać się po nazwie warstwy lub rodzaju domeny.
- Uogólnić akcję „edytuj” z odczytu mapy tak, aby przekazywała docelową warstwę,
  `featureId` i zakładkę ustawień, zamiast na stałe otwierać region geologii.
- Uzupełnić testy selektora i migracji o wybór po `id`, stan `aria-pressed` i
  zachowanie po usunięciu wybranego elementu.

### 2. Ujednolicić karty edycji wybranego elementu

- Wprowadzić kompozycyjny `EditorCard` i `EditorCardHeader`, odpowiedzialne za
  zewnętrzny `Card`, odstępy, próbkę koloru, tytuł lub edytowalną nazwę oraz
  slot na akcje. Nie stosować dziedziczenia ani komponentu znającego domeny
  geologii, climate, heightmapy i macro regions.
- Zmienić nazwy edytorów wybranego elementu tak, aby kończyły się na `Card`:
  `RegionEditor` na `GeologicalRegionCard`, a `RegionTerrainEditor` na
  `RegionTerrainCard`. `HeatZoneCard`, `BaseRegionCard` i `OverlayRegionCard`
  zachowują swoje nazwy.
- Dodać do wspólnego nagłówka `SelectionControls`: przyciski poprzedni/następny
  wybierają sąsiedni element przez ten sam callback co `ColorSwatchTabs`.
  Callback aktualizuje wspólne zaznaczenie formularza i mapy. Przyciski są
  nieaktywne na krańcach listy.
- `SelectionControls` nie zmienia kolejności konfiguracji. Trzymać je osobno od
  obecnego `MoveControls`, które w base climate wywołuje `moveZone` i naprawdę
  przestawia strefy.
- Zmigrować wszystkie pięć kart do wspólnej ramy, zachowując wyłącznie
  domenowe pola i akcje wewnątrz ich komponentów.
- Dodać testy sprawdzające przejście na poprzedni i następny element, stan
  krańcowy przycisków oraz brak zmiany kolejności danych.

### 3. Zgrupować komponenty generatora świata jako feature

- Przenieść komponenty związane z generowaniem świata z `src/components/` do
  `src/features/world-generator/`:

  ```text
  src/features/world-generator/
    world-generator/
    settings/
      settings-panel/
      forms/
    map-preview/
      map-canvas/
      map-sidebar/
      map-measure/
      layer-tabs/
      scale-bar/
    generation-progress/
  ```

- Zmiana obejmuje obecne katalogi `world-generator`, `settings-panel`,
  `map-preview`, `map-canvas`, `map-sidebar`, `map-measure`, `layer-tabs`,
  `scale-bar` i `generation-progress`.
- Nie przenosić `src/utils/map-generator`, `src/utils/map-renderer` ani
  `src/stores`: pozostają niezależnymi warstwami, z których korzysta feature.
- Przenieść `boundary-model` i presety macro regions poza komponenty przed
  zmianą importów store'a. `macro-region-form-store` nie może importować z
  `components` ani z `features`; moduły te powinny trafić do neutralnej warstwy
  właściwej dla polityki formularza lub domeny generatora.
- Uaktualnić importy i testy wraz z każdym przenoszonym katalogiem. Nie łączyć
  tej migracji z mechanicznym przemianowaniem lub zmianą zachowania
  komponentów.
