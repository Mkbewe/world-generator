# Techniczny plan wdrożenia Geologii i nowej heightmapy

Data: 2026-09-28. Dokument wykonawczy do
[planu docelowego](island-generation-final-plan-2026-09-28.md) i
[listy zadań GEO-01A–09](geology-island-generation-implementation-plan-2026-09-28.md).
Plan docelowy jest źródłem decyzji projektowych, lista GEO określa zakres
issue, a ten dokument — kontrakty, granice modułów i odbiór kodu. Istniejące
`LandmassLayoutStage` i `StructureCharacterStage` służą tylko jako kontekst
historyczny. Nie przenosić ich algorytmu korytarzy pod nową nazwę.

## 1. Zasada generowania

1. Konfiguracja `GeologyConfig` opisuje **obszary możliwości**, nie obrysy wysp.
   Obszar ma własne ID, położenie lub regułę rozmieszczenia, skończony zasięg,
   parametry potencjalnych wyniesień, batymetrii i rzeźby. Jeden obszar może dać
   zero, jedną albo wiele wysp; kilka obszarów może dać jedną wyspę.
2. `GeologyStage` tworzy lekki plan obszarów w przestrzeni świata. Nie tworzy
   rastrowej maski lądu, indeksu wyspy ani siatki o rozdzielczości heightmapy.
3. `HeightmapStage` próbuje z planu i własnych pól szumu jedną ciągłą wysokość
   `H(p)` w metrach, na lądzie i pod wodą. `H(p) > seaLevel` określa potencjalny
   ląd; dodatniej wysokości nie narzuca sam plan ani typ obszaru.
4. `LandOceanStage` później klasyfikuje spójne lądy i wodę. ID obszaru, ID
   szelfu i ID wyspy oznaczają różne rzeczy. Nie wyprowadzać wysp z liczby
   wpisów w formularzu ani z liczby szelfów.

### Kontrakt rozstrzygnięty w GEO-01A przed pisaniem rasteryzacji

- `GeologyConfig` i `GeologicalAreaConfig`: stabilne ID; pozycja automatyczna
  albo jawna; zasięg i kierunek; gęstość oraz skala wyniesień; rozczłonkowanie;
  typ bazowego dna; rozkład rzeźby. Każdy parametr ma jednostkę, zakres,
  wartość domyślną i opis wpływu na pole. Współrzędne i odległości przechodzą
  przez `WorldSpace`; wielkości fizyczne i wysokości mają jawne metry.
- `GeologyPlan`: niezmienne dane geometryczne i profilowe, które można
  zwalidować bez UI; ID wpisów zachowane, wynik niezależny od kolejności listy.
  Niewykonalne rozmieszczenie jest błędem walidacji przypisanym do wpisu i
  blokuje generację; nie zmniejszać ani nie pomijać obszaru po cichu.
  `GeologyConfig` jest intencją użytkownika, `GeologyPlan` jest wynikiem seedu.
- `HeightmapConfig`: parametry całego pola, np. poziom bazowy i pasma szumu.
  Parametry lokalnego dna i profilu należą do obszaru, nie do globalnego
  formularza heightmapy. Rozstrzygnąć sens każdego istniejącego `relief`,
  `featureScale`, `targetDepth`, `falloff`, `irregularity` i
  `OCEAN_DEPTH_METERS`; usunąć martwe kontrolki. Określić relację globalnej
  bazy oceanu do lokalnego poziomu dna obszaru oraz właściciela kontrolek
  (Geologia kontra formularz heightmapy). Nie wprowadzać wieku geologicznego
  bez działania.
  Paleta wysokości importuje dziś `OCEAN_DEPTH_METERS` jako przystanek w
  metrach. Zmieniając głębokość oceanu, zaktualizować także przystanki palety
  i ich znaczenie. Nie normalizować kolorów osobno dla każdej mapy bez
  osobnej decyzji, bo ten sam kolor przestałby oznaczać tę samą wysokość.
- Typ obszaru ma dostarczać zachowanie przez strategię lub dane profilu
  interpretowane przez jeden sampler. Wybrać wariant raz przy budowie planu;
  nie mnożyć gałęzi `if (kind === ...)` w pętli po pikselach, workerze i UI.
  Preset jest gotową konfiguracją, nie osobnym algorytmem.
- Określić semantykę pochodzenia: dominujący wkład na komórkę albo pełne
  powiązanie wielu obszarów. Pole pochodzenia jest diagnostyczne; **nie może
  wybierać wzoru wysokości ani odcinać wpływu pozostałych obszarów**.
  Kolejność listy nie rozstrzyga wysokości ani właściciela pochodzenia;
  remisy rozstrzyga reguła niezależna od kolejności (np. stabilne ID). Jeśli
  `Int16Array` nie mieści zakresu ID, wybrać właściwy typ lub mapowanie ID,
  zamiast bez sprawdzenia kopiować `shelfIndexMap`.

## 2. Rozdział odpowiedzialności w kodzie

| Miejsce | Odpowiedzialność przy przebudowie |
|---|---|
| `src/utils/map-generator/types.ts` | Nowe typy konfiguracji, planu i wyników; bez typów renderera. |
| `src/utils/map-generator/stages/geology/` | Walidacja, placement, profile, presety domenowe i `GeologyStage`; oddzielne moduły dla algorytmów. |
| `src/utils/map-generator/stages/heightmap/` | Czyste próbkowanie pola, raster, walidacja i statystyki; żadnego importu z UI, store lub renderera. |
| `src/utils/map-generator/random/`, `space.ts` | Wspólny prymityw szumu, seedy i jeden port przestrzeni; bez wspólnego rastra wysp. |
| `src/utils/map-generator/pipeline/` | Deklaracje `configKeys`, `reads`, `writes`, walidacja wyjść i zależności; kolejność `PIPELINE_STAGES` nie zastępuje grafu zależności. |
| `src/components/world-generator/`, `src/stores/` | Złożenie konfiguracji, sesja, cache, selektywna regeneracja. Bez algorytmu geologicznego. |
| `src/utils/map-layers/`, `src/utils/map-renderer/`, `src/utils/map-readout/` | Prezentacja planu, wysokości i odczytu; nie definiuje semantyki pola. |

Zachować reguły `AGENTS.md`: jeden publiczny komponent na plik z testem,
logika poza komponentem w `lib/`, hooki w `hooks/`, deklarowane wejścia etapu,
brak `as` naprawiającego zły model, `!`, zagnieżdżonych ternary oraz algorytmu
„naprawiającego” gotową mapę. Nowa logika domenowa nie importuje z renderera.
`docs/map-generator-architecture-review.md` wskazany w `AGENTS.md` nie
występuje obecnie w repozytorium; obowiązujące granice są zapisane w
`AGENTS.md` i w istniejącym kodzie pipeline'u. Po przełączeniu usunąć martwy
odnośnik (o ile nie powstanie naprawdę potrzebny dokument) i poprawić
historyczny przykład `landmassLayout` w `AGENTS.md`.

## 3. Algorytm: od planu do ciągłego pola

### 3.1 Plan obszarów

- Rozmieszczać **zasięgi wpływu**, a nie środki przyszłych wysp. Automatyczny
  placement bierze pod uwagę rozmiar świata, maskę i wzajemne ograniczenia;
  obszary mogą się nakładać, gdy konfiguracja na to pozwala. Wariant
  wulkaniczny nie wymaga szerokiego wspólnego szelfu, a płytki archipelag
  może go mieć. Wariant atolowy wnosi lokalną radialną tendencję do płytkiego
  obrzeża i obniżonej laguny. Szum i inne formy mogą obrzeże przerwać;
  wariant nie gwarantuje zamkniętego pierścienia.
- Dla każdego obszaru wygenerować stabilny zestaw dużych tendencji lub
  parametrów ich rozkładu. Drobnych wysepek nie losować jako osobnych
  prostych stemplowanych kół. Gęstość i skala mają wpływać na statystyczny
  rozkład wynurzeń; nie kodować liczby wysp w planie.
- Placement i profil/rzeźba używają osobnych, nazwanych strumieni
  `RandomFactory`; dla ID obszaru wyprowadzać strumień z jego ID, aby dodanie
  lub przestawienie innego wpisu nie przelosowywało całej mapy. Stable ID
  utrzymać także po edycji i duplikowaniu wpisu (duplikat dostaje nowe ID).
  Własny strumień stabilizuje plan i profil obszaru. Szum heightmapy jest
  zakotwiczony we współrzędnych świata: przesunięcie obszaru zachowuje jego
  ID i parametry, ale może zmienić lokalny detal terenu. Testy nie mogą
  obiecywać identycznej mapy po przesunięciu obszaru.

### 3.2 Próbkowanie heightmapy

- Punkt startowy do prototypu: `H(p) = B(p) + U(p) + R(p)`, gdzie `B` jest
  bazą dna i wpływem płycizn, `U` jest potencjałem wyniesień, a `R` lokalną
  rzeźbą. To rozdział odpowiedzialności, **nie** polecenie zsumowania trzech
  gotowych rastrów. Obszar dostarcza gładką wagę o zwartym nośniku; jej
  wartość i pierwsza pochodna powinny zanikać na brzegu nośnika. Sprawdzić
  przekrój wartości i nachylenia, bo równa wysokość na granicy nie wyklucza
  widocznego załamania.
- Potencjalne wyniesienia rozkładać w 2D w obrębie obszaru na kilku skalach,
  z lokalną modulacją i możliwością rozdzielenia szerokiej formy. Szerokie
  pasmo ustala grupowanie i zatoki; średnie rozdziela lądy; drobne rzeźbi
  brzeg tylko w skali reprezentowalnej przez siatkę. Nie opierać wynurzenia
  na samej odległości od jednej osi lub środka obszaru, bo odtwarza to
  powtarzalny układ „wysoko w środku, nisko przy brzegu”. Lokalna radialna
  tendencja atolu jest wyjątkiem dotyczącym jego profilu, nie ogólnym
  algorytmem wynurzania wszystkich obszarów.
- W punkcie świata policzyć kolejno: bazę oceanu, łagodną zmianę batymetrii
  od obszarów, potencjał wyniesień, lokalną rzeźbę i pasma szumu. To **jedno**
  równanie pola i jedna ścieżka próbkowania lądu oraz dna. Wsparcie obszaru
  zanika łagodnie do zera **przed** krawędzią jego obliczanego bboxa.
- Osobno kontrolować poziom bazowy, amplitudę i gęstość form. Dzięki temu
  jedna prowincja może być całkiem zatopiona, częściowo wynurzona albo dać
  archipelag, bez wymuszania procentu lądu. Zanurzony grzbiet nie może
  wymuszać rowu do głębokiego oceanu.
- Zdefiniować jedną, przemienną operację łączenia wkładów (lub wyliczenie z
  sumy niezależnej od kolejności). Zweryfikować granicę `w=0`, brak zmiany
  wysokości po zmianie kolejności obszarów i brak szwu na nakładających się
  obszarach. Nie wybierać zwycięzcy według ID ani indeksu jako wysokości;
  etykieta pochodzenia również nie może zależeć od kolejności listy.
  Unikać nieograniczonego podnoszenia dna przez wiele nakładających się
  obszarów; wybrany operator ma jawny zakres i test dla 1, 2 oraz wielu wkładów.
- Próbkować szum w punktach świata, w skalach fizycznych. Heightmapa ma
  własne pasma duże/średnie/drobne, amplitudy i nazwy seedów; nie czyta
  `noiseMap` ani `NoiseConfig`. Wspólny pozostaje tylko kod funkcji i port
  przestrzeni. Szerokie formy w tym samym punkcie powinny przetrwać zmianę
  rozdzielczości. Pasma poniżej rozdzielczości tłumić **przed** próbkowaniem;
  drobny szum blisko poziomu morza nie może tworzyć pojedynczych pikseli
  lądu. Nie usuwać takich pikseli filtrem po fakcie.
- Nie przyjmować z góry osobnego pełnego rastra dla każdego pasma. Wybrać
  proceduralne próbkowanie, kafle lub bufory po benchmarku. Przebieg ma
  przerywać pracę po `AbortSignal`, raportować postęp, wyliczać skończone
  wartości i ograniczać dodatkową pamięć zależną od liczby obszarów.
- `worldMask` pozostaje jedyną maską granicy świata. Poza maską raster może
  przechowywać skończoną wartość techniczną, np. `0`, ale każdy odczyt,
  statystyka, paleta i klasyfikacja musi najpierw sprawdzić `worldMask`.
  Nie używać `NaN` jako znacznika i nie traktować wartości poza maską jako
  poziomu morza albo oceanu.

**Próby kontrolne:** jedna prowincja dająca 0/1/wiele wysp; dwie prowincje
dzielące ląd; małe wysepki na wspólnym płyciznowym dnie; wulkaniczna wyspa
z głębokiego dna; przerwany atol; zatopiony środek i wyniesiony brzeg;
wynurzenie poza dawną osią; nakładanie 2–4 zasięgów bez pierścienia lub szwu.
Warianty mają dawać rozpoznawalne tendencje na zbiorze seedów, nie identyczny
obrys dla każdego seedu.

## 4. Przełączenie kontraktów aplikacji

1. **Oznaczenie starej ścieżki.** Na początku implementacji dodać
   `@deprecated` do `LandmassLayoutStage`, `StructureCharacterStage` i ich
   konfiguracji, a w UI oznaczyć stare zakładki/kontrolki jako przestarzałe.
   Nie dodawać przełącznika stary/nowy generator.
2. **Kontrakt i domena.** Po GEO-01A wdrożyć typy, walidację, presety jako
   wartości konfiguracji, `GeologyStage` i czyste funkcje wpływu. W tym
   punkcie dopuszczalne jest, że aplikacja chwilowo nie generuje map.
3. **Szum i heightmapa.** Dodać port szumu etapowego, po czym zastąpić
   `fillLand`/`fillShelves` jedną implementacją pola. Usunąć `noiseMap`,
   `landmassLayout`, `structureZones` z `HeightmapStage.reads` i odpowiadające
   im klucze `configKeys`; dodać rzeczywiste wejścia planu i konfiguracji.
   `NoiseStage` nadal działa dla własnego podglądu i opcjonalnej deformacji
   makroregionów. Nie zmieniać jej publicznego wyniku bez potrzeby.
4. **Pipeline i cache.** Zaktualizować `MapConfig`, `MapState`,
   `MAP_CONFIG_KEYS`, `PIPELINE_STAGES`, `pipeline-factory.ts`,
   `stage-outputs.ts`, `selectDirtyStageIds`, walidację worker messages i
   reuse `cachedState`. Każde wyjście ma dokładnie jednego zadeklarowanego
   producenta; etap może mieć kilka wyjść. Każdy konsument deklaruje
   rzeczywiste wejścia. Zmiana Geologii
   przelicza plan i wysokość; zmiana tylko wysokości nie przelicza planu;
   zmiana `NoiseConfig` nie przelicza planu ani heightmapy, chyba że istnieje
   osobna, jawnie warunkowa zależność innego etapu od `noiseMap`.
5. **Sesja i renderer.** Dziś `WorldGenerationSession.receiveStage()` bierze
   rastry przez `selectRasters()` z katalogu widocznych warstw, a snapshot
   trzyma `layers` i `info`. Oddzielić komplet trwałych wyników generatora od
   listy warstw podglądu; zachować heightmapę i pochodzenie nawet bez warstwy.
   Uaktualnić `GeneratedMapSnapshot`, odtworzenie, cache i przesyłanie danych
   do workera jednym kontraktem. `MapRepository` jest teraz pamięciowy:
   nie projektować fikcyjnej migracji plików użytkownika; stary snapshot
   bieżącej sesji można jawnie odrzucić, gdy jest niezgodny.
6. **UI i diagnostyka.** Zastąpić formularze Landmass/Character formularzem
   `Geologia`, edytowalną listą i presetami. Przenieść kontrolki szelfu z
   `HeightmapForm` do właściciela danych. Uaktualnić
   `buildGenerationConfig`, `use-world-generation`, store'y, katalog warstw,
   wektorową warstwę planu, paletę heightmapy, odczyt pod kursorem,
   `view-sync-store`, zakładki i statystyki. Podgląd planu ma pokazywać
   **zasięgi możliwości**, nie gotowe linie brzegowe. Etykieta „shelf” tylko
   dla obszaru, który faktycznie ma płyciznowe dno.
7. **Usunięcie starej ścieżki.** Po przełączeniu skasować etapy, typy,
   formularze, store'y, wektorowe painty i testy starego kontraktu. Użyć
   wyszukiwania odwołań do `landmassLayout`, `structureZones`,
   `shelfIndexMap`, `landmasses` i `structureCharacter` i rozstrzygnąć każdy
   wynik. Nie zostawiać adaptera starej geometrii ani martwych eksportów.

GEO-03/04/05A–05C oraz minimalne podłączenie GEO-06A stanowią jeden punkt
integracji.
Podczas pracy można mieć przejściowo niedziałającą aplikację i nie
uruchamiać testów starego kontraktu. Hook pre-commit uruchamia typecheck i
testy, więc podczas niespójnego refaktoru nie tworzyć pośrednich commitów;
przełączyć całość i zaktualizować testy przed commitem.
Zakończona integracja ma mieć zgodne typy, worker, zapis, podgląd i UI.
Oznaczenie `deprecated` jest przejściowe i znika razem ze starym kodem.

## 5. UI i presety bez ukrytej logiki

- Edycja obejmuje dodanie, duplikat, usunięcie, pozycję automatyczną/ręczną,
  wielkość i kształt **zasięgu**, typ dna, gęstość i rozmiar potencjalnych
  wyniesień, rozczłonkowanie oraz dominującą rzeźbę. Nie nazywać liczby
  obszarów liczbą wysp. Błędy konfiguracji i niewykonalnego rozmieszczenia
  pokazywać przy odpowiednim wpisie.
- Preset geografii wypełnia tę samą listę `GeologicalAreaConfig`, którą można
  ręcznie zmieniać. Ręczna zmiana ustawia status „edytowany”. Preset świata
  może tylko wskazać domyślny preset geografii przy tworzeniu nowej
  konfiguracji. Nie zawiera własnej kopii obszarów; jego późniejsza zmiana
  nie nadpisuje ręcznie edytowanej listy bez jawnego działania.
- Formularz formatuje wartości i opisuje skutki, lecz nie wylicza geometrii.
  Walidacja zakresów należy do domeny; UI może użyć jej wyniku. Stan formularza
  ma jeden właściciel konfiguracji Geologii, nie kilka store'ów zapisujących
  wzajemnie swoje parametry.

## 6. Testy i odbiór

**Przed implementacją GEO-07** zapisać w GEO-01B konkretne seedy, konfiguracje,
rozdzielczości i liczbowe progi dla: czytelnej wysepki (pole i minimalna
szerokość w metrach), udziału przypadków 0/1/wielu wysp, zróżnicowania
presetów, ciągłości pola, czasu oraz szczytu pamięci. Określić sąsiedztwo
komórek i zachowanie na brzegu świata. Te liczby nie wynikają z porównania
ze starym generatorem. Kontury i histogramy powinny być dostępne jako
artefakty diagnostyczne, ale ocena nie zależy od manualnego klikania w UI.

Minimalny zestaw testów zachowania:

1. Walidacja kontraktu: ID, zakresy i jednostki, niewykonalny placement,
   nieznany wariant przy granicy danych, brak cichego pomijania wpisów.
2. Determinizm i niezależność: ten sam seed daje te same wyniki; zmiana
   profilu nie rusza pozycji; przestawienie listy nie rusza wysokości ani
   etykiet pochodzenia; zmiana `NoiseConfig` nie rusza planu ani heightmapy.
3. Pole: ciągłość na granicach zasięgów, skończone wartości, gładkie
   nakładanie, brak sztywnego `0 m` na brzegu i rowu pod zatopioną osią.
   Testować wartości i przekroje, a nie dokładny obraz starej implementacji.
4. Skala: duże formy są zgodne w tych samych punktach przy dwóch siatkach;
   drobne pasma nie tworzą jednokomórkowych wysp przy poziomie morza.
5. Integracja: worker, anulowanie, selektywna regeneracja, zapis i
   odtworzenie wszystkich potrzebnych wyjść bez aktywnej warstwy; zmiana
   formularza daje właściwy `MapConfig` i warstwę podglądu.
6. Klasyfikacja: jeden moduł spójnych składowych zasila walidację GEO-07 i
   późniejszy `LandOceanStage`; jedna wyspa może mieć wiele źródeł, a jeden
   obszar wiele wysp. Poziom morza jest jawny, a komórki poza `worldMask`
   nie są klasyfikowane jako ocean.

Podczas refaktoru pomijamy uruchamianie i naprawianie testów utrwalających
stary kontrakt. Gdy integracja jest kompletna, zaktualizować testy według
listy powyżej i uruchomić pełny `pnpm run check:all` raz na końcu pracy nad
kodem, przed uznaniem zadania za skończone. Jeśli planowany jest commit,
hook pre-commit także uruchomi typecheck i testy; nie planować commitu w
przejściowo zepsutym stanie. Dla samej edycji dokumentów nie uruchamiać
testów ani `check:all`.

## 7. Ryzyka i decyzje odkładane świadomie

- **Koszt i pamięć:** obecny limit próbek ma zostać tymczasowo wyłączony w
  GEO-05C, wraz z przycinaniem siatki w UI. Pozostają walidacja poprawności
  wymiarów, wykrywanie przepełnienia liczby komórek przed alokacją i
  informacyjny szacunek kosztu; przy dużym szacowanym koszcie UI ma pokazać
  wyraźne ostrzeżenie. Użytkownik świadomie wybrał tymczasowy brak budżetu;
  ostrzeżenie nie gwarantuje, że karta przetrwa bardzo dużą siatkę, a duża
  siatka może wyczerpać pamięć workera. Pomiar szczytu i nowy limit to
  osobne zadanie (GEO-09), nie warunek GEO-07. Nie obiecywać, że każde
  urządzenie obsłuży dowolną siatkę.
- **Kolory i ostrość:** sama poprawna wysokość nie gwarantuje dobrego obrazu.
  Przy GEO-07 obejrzeć surowe pole, przekroje i paletę/rendering oddzielnie.
  Nie wygładzać wysokości w rendererze tak, by ukryć szew algorytmu.
- **Klimat, wiek, erozja:** późniejsze rozszerzenia. Nie dodawać do bieżącego
  formularza suwaków bez działającego wpływu i nie tworzyć cyklu zależności
  „klimat → wyspy → klimat”. Preferencję atolową można na początku oprzeć na
  danych dostępnych przed wysokością, jeśli zostanie jawnie zdefiniowana.
- **Niesprecyzowane przed implementacją:** dokładny operator łączenia pól,
  reprezentacja pochodzenia i metoda rozmieszczenia należą do GEO-01A;
  progi metryk do GEO-01B. GEO-01A musi zapisać kontrakt i mały przykład
  liczbowy przed wejściem w GEO-04.
  Implementujący nie powinien wybierać ich przypadkiem podczas pisania UI.

## 8. Rozstrzygnięcia GEO-01A (2026-09-28)

Kontrakt jest w kodzie (`src/utils/map-generator/stages/geology/`); poniżej decyzje domykające punkty z §1:

- **operator łączenia:** osobna unia kwadratowa dla wyniesień i obniżeń
  (`mergeContributions`); przemienny, jeden wkład bez zmian, `n` równych daje
  `sqrt(n)` pojedynczej wartości. Przykład liczbowy: `2 × 100 m → 141,421 m`,
  `3 × 100 m → 173,205 m`, `+100 m` i `-60 m → 40 m`; testy w `merge.test.ts`.
- **pochodzenie:** `dominantAreaId` zwraca ID najsilniejszego wkładu (remis
  łamie najmniejsze ID), a `createProvenanceIndex` mapuje je na indeks
  zapisywany w diagnostycznej mapie; poza obszarami `PROVENANCE_OUTSIDE = -1`.
  Kolejność listy nie wpływa na wysokość ani etykietę.
- **strumienie losowości:** placement i profil losują z nazwanych strumieni
  wyprowadzonych z ID obszaru (`geology.area.<id>.placement` i `.profile`);
  dodanie albo przestawienie innego wpisu nie przelosowuje obszaru.
- **szum:** próbkowany w punktach świata, więc przesunięcie obszaru zachowuje
  ID i parametry, ale zmienia lokalny detal, na który trafia.
- **poza `worldMask`:** raster może trzymać skończoną wartość techniczną
  (np. `0`), ale każdy odczyt, statystyka, paleta i klasyfikacja najpierw
  sprawdza maskę; poza maską nie ma lądu ani oceanu.
- **placement:** niemożliwy układ automatyczny to błąd przypisany do wpisu
  (`GeologyPlacementProblem`) i blokuje generację; zakaz cichego zmniejszania
  i pomijania.
- **`HeightmapConfig`:** globalna baza oceanu zostaje parametrem pola, a
  `seabedOffsetMeters` obszaru jest od niej offsetem; `featureScale` i szelfowe
  `irregularity` oznaczono `@deprecated`, `targetDepth`/`falloff` przechodzą
  do kontraktu pola, `OCEAN_DEPTH_METERS` zostaje datumem oceanu i palety
  (usunięcie w GEO-05B).
- **liczba obszarów:** limit 20 mieści się w `Int16` (indeks proweniencji
  `-1..19`), więc diagnostyczna mapa nie wymaga szerszego typu.
