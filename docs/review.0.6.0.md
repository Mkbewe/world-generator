# Review zmian od v0.5.3

Zakres przeglądu: `v0.5.3..HEAD` (`7fce929..ce9a8ae`), 6 commitów i 44 zmienione pliki.

## Ocena ogólna

Kierunek zmian jest dobry i większość kodu jest czytelna. Zmiany rozwijają projekt
zgodnie z ogólnymi założeniami roadmapy: oddzielają fizyczny rozmiar świata od
siatki próbek, wykorzystują istniejący kanał `MapInfo`, ograniczają obliczenia
makroregionów do maski świata i rozwiązują problemy UI bez ingerowania w
wewnętrzne style Radix.

Przed kolejnym releasem należy jednak poprawić zarządzanie pamięcią. Obecny limit
może doprowadzić do zawieszenia albo zamknięcia karty przeglądarki. Propagacja
`WorldDimensions` również nie realizuje w pełni kryteriów zadania #267.

## Znalezione problemy

### 1. Wysoki priorytet — limit 600 MB zaniża rzeczywiste zużycie pamięci

Budżet z `src/utils/world-dimensions.ts` liczy wyłącznie trzy surowe rastry,
czyli 6 bajtów na próbkę:

- `worldMask`: 1 bajt,
- `macroRegionIdMap`: 1 bajt,
- `noiseMap`: 4 bajty.

Rzeczywiste wykorzystanie pamięci jest znacznie większe:

- worker zachowuje bufory i kopiuje je do głównego wątku przez `postMessage`,
- główny wątek przechowuje drugą kopię rastrów,
- każda z trzech warstw dostaje pełnowymiarowy canvas RGBA,
- dodatkowy pełnowymiarowy canvas służy do prezentacji aktywnej warstwy.

Przybliżone minimum to około 28 bajtów na próbkę w szczycie:

- preset `Big` z detalem `0.5 m`: 64 mln próbek; UI pokazuje 384 MB, ale szczyt
  może wynieść około 1,8 GB,
- siatka 10 000 × 10 000: UI pokazuje 600 MB, ale szczyt może wynieść około
  2,8 GB, bez narzutu przeglądarki i GPU.

Roadmapa przewiduje renderowanie warstw bezpośrednio do rozdzielczości viewportu
zamiast tworzenia pełnowymiarowych canvasów. Do czasu wdrożenia tego mechanizmu
limit powinien uwzględniać canvasy i kopie między wątkami albo zostać znacząco
obniżony.

Powiązane miejsca:

- `src/utils/world-dimensions.ts:24`
- `src/utils/map-generator/worker/generation-worker.ts:36`
- `src/utils/map-renderer/layer/layer.ts:108`
- `src/utils/map-renderer/view/map-view.ts:59`
- `docs/world-generation-roadmap.md:536`

### 2. Średni priorytet — zadanie #267 zostało zrealizowane częściowo

Według kryteriów zadania `WorldConfig` miał przenosić `WorldDimensions`, a etapy
miały wyprowadzać z niego rozmiar siatki. Obecna konfiguracja nadal zawiera
surowe `width` i `height`, uzupełnione jedynie o `metersPerSample`.

Wszystkie etapy nadal bezpośrednio używają `width` i `height` jako liczby próbek.
`WorldDimensions` jest rekonstruowane później i zapisywane jako luźne `MapInfo`.
Powstaje przez to niepotrzebny łańcuch konwersji:

```text
metry + detal -> siatka -> width/height + detal -> ponownie WorldDimensions
```

Prościej i zgodniej z roadmapą byłoby przechowywać jeden kanoniczny
`WorldDimensions` w konfiguracji, a `sampleWidth` i `sampleHeight` udostępniać
etapom bez ponownego rekonstruowania kontraktu.

Powiązane miejsca:

- `src/utils/map-generator/types.ts:3`
- `src/utils/map-generator/stages/world-shape-stage.ts:17`
- `src/utils/map-generator/info-definitions.ts:15`

### 3. Średni priorytet — limit nie jest egzekwowany przez sam generator

Walidacja budżetu odbywa się podczas tworzenia informacji dla podglądu w
`WorldGenerationSession`, a nie na wejściu pipeline'u. Bezpośrednie wywołanie
generatora z siatką przekraczającą limit nadal spróbuje zaalokować tablice.

Obecny test sprawdza odrzucenie konfiguracji przez `selectMapInfo`, ale nie przez
`MapGenerator`. Nie spełnia to w pełni wymagania z zadania #266, według którego
wspólny limit powinien obowiązywać zarówno UI, jak i generator.

Powiązane miejsca:

- `src/components/world-generator/world-generation-session.ts:43`
- `src/utils/map-generator/info-definitions.ts:15`
- `src/utils/map-generator/stages/world-shape-stage.ts:17`

### 4. Niski priorytet — jednostka `px` jest niepoprawna semantycznie

`PointerSample` przechowuje współrzędne komórki źródłowego rastra, ale UI
przedstawia je jako piksele. Po rozdzieleniu metrów, próbek i rozdzielczości
podglądu właściwszą nazwą byłoby `sample` albo `cell`.

Dodatkowo pozycja w metrach wskazuje początek komórki, nie dokładne położenie
kursora. Można użyć współrzędnych `u/v` do pokazania pozycji kursora albo nazwać
wartość jednoznacznie jako początek komórki.

Powiązane miejsca:

- `src/components/preview-map/readout.ts:5`
- `src/components/preview-map/readout.ts:85`
- `src/components/preview-map/readout.ts:89`

### 5. Niski priorytet — dokumentacja nie została zsynchronizowana

Roadmapa nadal zawiera nieaktualne informacje:

- rozmiar formularza ma oznaczać liczbę próbek, a nie metry,
- `WorldDimensions` jest opisane jako planowane,
- `MacroRegionStage` ma nadal liczyć komórki poza maską.

README opisuje tylko dwa etapy pipeline'u i pomija `MacroRegionStage`.

Powiązane miejsca:

- `docs/world-generation-roadmap.md:32`
- `docs/world-generation-roadmap.md:483`
- `docs/world-generation-roadmap.md:549`
- `README.md:47`

### 6. Niski priorytet — formalne odstępstwo od standardu komponentów

Nowe komponenty `DetailField` i `GridSummaryField` mają osobne foldery, ale nie
mają dedykowanych testów ani colocated `module.scss`:

- `src/components/settings-panel/forms/world-shape-form/detail-field/`
- `src/components/settings-panel/forms/world-shape-form/grid-summary-field/`

Ich zachowanie jest częściowo pokryte testem nadrzędnego `WorldShapeForm`, więc
nie jest to obecnie luka funkcjonalna. Nie warto jednak dodawać pustych arkuszy
SCSS wyłącznie dla formalności. Lepszym rozwiązaniem byłoby doprecyzowanie
standardu, że arkusz jest wymagany tylko wtedy, gdy komponent posiada własne
style, oraz dodanie dedykowanych testów komponentów.

## Elementy wykonane dobrze

- Zadanie #256 wiernie realizuje roadmapę: maska jest wymagana, a komórki poza
  światem są pomijane.
- Zadanie #274 ma małą i prostą implementację: współdzielony wrapper nie ingeruje
  w wewnętrzne style Radix.
- Zadanie #275 poprawnie porównuje cały preset i dodaje `aria-pressed`.
- Funkcje konwersji wymiarów są niewielkie, niezależne od DOM i dobrze
  przetestowane.
- Zmienione komponenty mieszczą się w miękkim limicie 150 linii.
- `git diff --check` nie wykazał problemów formatowania.
- Drzewo robocze było czyste przed przeglądem i pozostało bez zmian po
  uruchomieniu testów.

## Prostota kodu

Większość lokalnych rozwiązań jest tak prosta, jak powinna:

- `SegmentedControlScroll` ma jedną odpowiedzialność,
- porównanie presetów jest jawne i łatwe do rozszerzenia,
- logika formularza jest podzielona na małe komponenty,
- konwersje jednostek są skupione w jednym module.

Największym wyjątkiem jest model wymiarów. Przechowywanie liczby próbek i
`metersPerSample`, a następnie rekonstruowanie `WorldDimensions` jako `MapInfo`,
jest bardziej złożone niż jeden kanoniczny kontrakt w konfiguracji. Uproszczenie
tego przepływu jednocześnie domknęłoby zadanie #267 i ograniczyło ryzyko
rozbieżności między generatorem, snapshotem i UI.

## Zgodność z roadmapą

Zmiany są zgodne z ogólnym kierunkiem roadmapy, ale realizacja nie jest jeszcze
kompletna:

- ograniczenie `MacroRegionStage` do maski zostało wykonane poprawnie,
- kontrakt i funkcje konwersji `WorldDimensions` zostały dodane,
- UI rozdziela metry od gęstości próbkowania,
- `WorldDimensions` nie jest jeszcze kanonicznym elementem konfiguracji,
- generator nie egzekwuje samodzielnie wspólnego budżetu,
- renderer nadal tworzy pełnowymiarowe bufory mimo zwiększenia dostępnych
  rozdzielczości,
- roadmapa i README nie opisują aktualnego stanu.

## Weryfikacja

Uruchomiono:

```text
pnpm run check:all
```

Wynik:

- TypeScript: bez błędów,
- ESLint: bez błędów,
- Stylelint: bez błędów,
- Prettier: bez błędów,
- Vitest: 82 pliki testowe i 362 zaliczone testy.

## Rekomendacja przed wydaniem

Nie wydawać kolejnej wersji przed poprawieniem lub znaczącym ograniczeniem
budżetu pamięci. Następnie domknąć model `WorldDimensions`, przenosząc walidację
na granicę generatora. Aktualizację dokumentacji i nazewnictwa współrzędnych
można wykonać w tym samym cyklu, ale nie są one blokujące dla działania aplikacji.

## Uzupełnienie recenzji — Grok

Poniższe uwagi zostały dodane w imieniu Groka na podstawie jego niezależnego
podsumowania tego samego zakresu zmian.

### Ocena ogólna

Grok zgadza się z oceną ogólną oraz rekomendacją, aby nie wydawać wersji 0.6.0,
dopóki budżet pamięci nie zacznie uwzględniać rzeczywistego szczytu albo limit
siatki nie zostanie obniżony. Kierunek zmian jest dobry, lokalny kod pozostaje
prosty, a największym problemem jest limit chroniący jedynie surowe rastry.

### Ocena realizacji zadań

| Zadanie | Ocena |
| --- | --- |
| #256 — maska makroregionów | Zrealizowane zgodnie z opisem. |
| #266 — kontrakt `WorldDimensions` | Typy, konwersje i testy są gotowe, ale wspólny budżet nie jest egzekwowany przez generator. |
| #267 — propagacja wymiarów | Zrealizowane częściowo: dodano `metersPerSample` i `MapInfo`, lecz etapy nadal korzystają z surowych `width` i `height`. |
| #268 — metry i detal w formularzu | UI pokazuje rozmiar siatki i szacunek pamięci zgodnie z zakresem zadania. |
| #274 i #275 — poprawki UI | Małe rozwiązania zgodne z zakresem zadań. |

Roadmapa wskazuje rasteryzację do viewportu jako pracę pozostającą do wykonania.
Jednocześnie oceniany diff zwiększa dostępną siatkę do 10 000 × 10 000 przy
pełnowymiarowych canvasach. Jest to rozjazd z planem wydajności, a nie wyłącznie
niezrealizowany punkt przyszłej roadmapy.

### Doprecyzowanie ryzyka pamięci

Szacunek około 28 bajtów na próbkę w szczycie jest wiarygodny. Overlay granicy
świata jest renderowany do viewportu i nie wchodzi do tego przeliczenia. Około
2,8 GB dla siatki 10 000 × 10 000 jest szacunkiem pamięci po stronie CPU;
rzeczywiste wykorzystanie może być wyższe po doliczeniu zasobów GPU i narzutu
przeglądarki.

Nawet jeżeli sterta JavaScript pomieści rastry, pojedynczy canvas 10 000 × 10 000
potrzebuje około 400 MB na bufor RGBA. Taka alokacja może nie udać się na
urządzeniach mobilnych i w przeglądarkach z niższymi limitami powierzchni lub
pamięci canvasu, w szczególności Safari. Problem może więc wystąpić już dla
preseta `Big` z najdrobniejszym detalem, a nie tylko przy maksymalnej siatce.

### Walidacja jako efekt uboczny `selectMapInfo`

Walidacja budżetu nie tylko znajduje się poza generatorem — jest obecnie efektem
ubocznym składania metadanych podglądu. Funkcja odpowiedzialna za zebranie
`MapInfo` staje się przypadkowo bramką bezpieczeństwa dla całego pipeline'u.
Miesza to dwie odpowiedzialności i pozwala ominąć limit każdemu konsumentowi,
który uruchomi generator bez wcześniejszego wywołania `selectMapInfo`.

Walidacja `WorldDimensions` powinna działać bezpośrednio na wejściu
`MapGenerator`, przed pierwszą alokacją `width * height`.

### Zamknięte zadania a kryteria akceptacji

Zadania #266 i #267 są zamknięte, mimo że ich kryteria akceptacji nie zostały
w pełni spełnione. Przed wydaniem 0.6.0 należy je ponownie otworzyć albo utworzyć
jednoznaczne zadania uzupełniające. W przeciwnym razie status boardu sugeruje, że
generator egzekwuje wspólny limit i korzysta z kanonicznego kontraktu wymiarów,
chociaż kod nadal tego nie robi.

### Stan dokumentacji w drzewie roboczym

Punkt dotyczący nieaktualnej roadmapy jest prawdziwy dla commitniętego `HEAD`.
W drzewie roboczym istnieje jednak niezacommitowana poprawka
`docs/world-generation-roadmap.md`, która aktualizuje opis zadania #256, metrów,
detalu i budżetu. Po jej zacommitowaniu problem dokumentacyjny pozostanie przede
wszystkim w `README.md`, które nadal opisuje dwa etapy i pomija
`MacroRegionStage`, oraz w nazewnictwie pikseli w inspekcji mapy.

### Standardy i prostota

Grok nie znalazł dodatkowego błędu logicznego w makroregionach, presetach ani
przewijaniu kontrolek. Lokalnie rozwiązania są proste:

- `SegmentedControlScroll` ma jedną odpowiedzialność,
- `activePresetId` i `aria-pressed` rozwiązują problem presetu bez dodatkowego
  stanu,
- formularz jest podzielony na małe pola,
- `world-dimensions.ts` jest czytelny i niezależny od DOM.

Odstępstwo komponentów pozostaje formalne: `DetailField` i `GridSummaryField`
nie mają własnych testów ani arkuszy SCSS, ale ich zachowanie jest częściowo
pokryte testem formularza nadrzędnego. Grok również nie rekomenduje dodawania
pustych arkuszy. Rozsądniejsze jest doprecyzowanie zasady do „arkusz tylko wtedy,
gdy komponent ma własne style” oraz dodanie dedykowanych testów pól.

Największa zbędna komplikacja pozostaje w modelu wymiarów:

```text
metry + detal -> siatka -> width/height + metersPerSample -> WorldDimensions
```

Jeden kanoniczny `WorldDimensions` w `WorldConfig`, z etapami korzystającymi z
`sampleWidth` i `sampleHeight`, byłby prostszy i zmniejszyłby ryzyko rozjazdu
między UI, snapshotem i generatorem.

### Rekomendowana kolejność dalszych prac

1. Poprawić budżet pamięci: uwzględnić kopie i canvasy albo tymczasowo obniżyć
   maksymalny rozmiar siatki do czasu rasteryzacji do viewportu.
2. Umieścić kanoniczny `WorldDimensions` w konfiguracji i uruchamiać
   `validateDimensions` na wejściu generatora.
3. Ponownie otworzyć #266 i #267 albo utworzyć zadania uzupełniające.
4. Zaktualizować README i nazewnictwo współrzędnych; te zmiany nie muszą blokować
   działania aplikacji.

## Zmiany po recenzji

Zakres prac: #281. Poniżej lista zmian wraz z uzasadnieniem.

1. **Budżet pamięci (znalezisko 1)** — doprecyzowany jako budżet **danych
   generatora** (rastry etapów w workerze plus kopiowana wiadomość do głównego
   wątku; `6 B` na próbkę), a nie budżet całej aplikacji. Canvasy warstw
   i prezentacji są liczone osobno w statystykach renderowania i zostają
   w pełnym rozmiarze, bo uwalnianie ich powodowałoby miganie przy przełączaniu
   warstw. Limitów nie obniżono. Redukcja pełnowymiarowych canvasów
   (rasteryzacja do rozmiaru viewportu) oraz kopii `postMessage` (jednorazowa
   wysyłka wyników albo `SharedArrayBuffer` z COOP/COEP; transfer per etap
   niemożliwy, bo worker potrzebuje buforów w kolejnych etapach) trafiła do
   sekcji wydajności roadmapy. Dodałem też test `formatBytes`, żeby formularz
   i statystyki nie rozjechały się jednostkami.

2. **Kanoniczny `WorldDimensions` (znalezisko 2)** — `WorldConfig` niesie teraz
   `dimensions`, a etapy czytają `sampleWidth` i `sampleHeight`; kanał `MapInfo`
   przekazuje wymiary bezpośrednio z konfiguracji, bez rekonstrukcji. Usunęło to
   łańcuch `metry + detal → siatka → width/height + detal → WorldDimensions`
   i domknęło kryteria #267.

3. **Walidacja na wejściu generatora (znalezisko 3)** — `MapGenerator` przyjmuje
   opcję `validateConfig` i uruchamia `validateDimensions` przed pierwszym
   etapem; `selectMapInfo` nie waliduje już niczego. Limit obowiązuje więc
   każdego konsumenta pipeline'u, a nie jest efektem ubocznym budowania
   metadanych podglądu. Test w `pipeline-factory.test.ts` pilnuje, że przy
   przekroczeniu budżetu nie startuje żaden etap.

4. **Nazewnictwo współrzędnych (znalezisko 4)** — readout pokazuje `cell`
   zamiast `px`. `PointerSample` wskazuje komórkę źródłowego rastra, nie piksel
   ekranu, więc `px` mylił przy skalowaniu podglądu.

5. **Dokumentacja (znalezisko 5)** — README opisuje trzy etapy, jednostki
   fizyczne, budżet, odczyt i kanał `MapInfo`; roadmapa została przebudowana
   chronologicznie (od fundamentów po szczegóły) i ma znaczniki
   `[działa]`/`[częściowo]`/`[planowane]`. Powód: dokumentacja opisywała stan
   sprzed #256, #266, #267 i #268.

6. **Standard komponentów (znalezisko 6)** — `DetailField` i `GridSummaryField`
   mają własne testy, a asercje przeniesiono z testu formularza nadrzędnego;
   `AGENTS.md` mówi wprost, że `module.scss` dodaje się tylko wtedy, gdy
   komponent ma własne style. Bez pustych arkuszy.

Zmiany dodatkowe poza recenzją:

- `formatBytes` liczy w MB dziesiętnych i zaokrągla MB do pełnych (`6 MB`,
  `384 MB`), a `GridSummaryField` korzysta z tej samej funkcji co statystyki.
  Rozbieżność `366.2` vs `384 MB` wynikała z mieszania MiB i MB oraz z lokalnego
  formattera w formularzu, nie z różnicy danych.
- Readout `Position`/`Distance` ma sztywne kolumny osi (`minmax(13ch, …)`),
  więc wartości `X`/`Y` nie przesuwają się przy zmianie liczby cyfr.

Stan po zmianach: `pnpm run check:all` zielone — 85 plików testowych, 365
testów. Otwarte pozostają punkty wymagające osobnych zadań: rasteryzacja do
viewportu, zero-copy dla workera oraz ewentualne ponowne otwarcie #266/#267.
