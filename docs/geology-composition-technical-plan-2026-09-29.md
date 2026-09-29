# Geology: kompozycja obszarów i form — plan techniczny implementacji

Data: 2026-09-29. Status: **plan do wdrożenia**, nie opis ukończonej funkcji.

Dokument jest samodzielną specyfikacją kolejnej iteracji geology i heightmapy.
Uwzględnia uwagi użytkownika po wdrożeniu poprzedniego formularza i presetów.
Polecenie zapisania dokumentu nie jest poleceniem wdrożenia kodu. Przed pracą
implementacyjną stosować aktualne instrukcje użytkownika i `AGENTS.md`.

## 1. Ustalenia produktowe

- Pozostają trzy typy obszarów: `ordinary`, `volcanic`, `atoll`.
- Ordinary tworzy zwykłe, nieregularne wyspy. Może tworzyć dużą wyspę,
  niziny, wzgórza oraz lokalny wyniesiony masyw. Masyw jest wariantem ordinary.
- Volcanic tworzy wyraźne wyniesienia, strome fragmenty i miejscami łagodniejsze
  obrzeża większych wysp. Małe skaliste wyspy mogą towarzyszyć głównym formom.
- Atoll oznacza obszar lagun i wysepek: nieregularne laguny, otwarte łuki,
  częściowo zanurzone obrzeża i małe wyspy bez laguny. Nie jeden wielki atol.
- Wyspy barierowe pozostają poza zakresem tej iteracji.
- Pozostają presety świata: Random, Archipelag, Wyspy wulkaniczne, Laguny i atole.
- **Każdy preset świata generuje minimum 5 obszarów, również na małej mapie.**
  Większa mapa pozwala na więcej obszarów. Przy pięciu: przybliżona kompozycja
  centrum + otoczenie, ze zmiennością położeń, rozmiarów i kierunków.
- Minimum pięciu jest regułą receptur świata. Ręczna lista nadal pozwala usuwać
  obszary, również do zera; generator nie dopisuje ich bez wiedzy użytkownika.
- Obszary są względnie równomiernie rozmieszczone. Mogą współtworzyć większy ląd;
  pięć obszarów nie oznacza obowiązkowo pięciu rozłącznych wysp.
- Size jest wyborem mały / średni / duży, dotyczy obszaru, bez procentów.
- Brak ręcznego pozycjonowania w UI. `fixed` pozostaje w kontrakcie.
- Przyciski dodawania obszarów pozostają nad listą.
- Zmiana fizycznej wielkości świata tworzy nową mapę; nie projektować zachowania
  poprzednich wysp przy resize. Zmiana rozdzielczości próbkowania to inna operacja.

## 2. Punkt wyjścia i potwierdzone przyczyny problemów

Stan kodu odczytany podczas przygotowania dokumentu; przed edycją sprawdzić
aktualny diff, ponieważ w repo są już zmiany związane z poprzednią iteracją.
Nie przywracać usuwanych dokumentów ani nie nadpisywać cudzych zmian.

| Miejsce | Obecne zachowanie wymagające zmiany |
| --- | --- |
| `stages/geology/presets.ts` | Liczba obszarów zaczyna się od 1; wspólna receptura liczby i pokrycia; wymuszony pierwszy typ; dodawane obszary mają takie same parametry geometrii |
| `stages/geology/plan.ts` | Rafy mają środek i promień, bez minimalnej separacji; placement ocenia uproszczony dysk |
| `stages/heightmap/field.ts` | Szelf rozszerza zasięg całego pola, także wyniesienia; density mnoży amplitudę; rafa jest radialnym pierścieniem |
| `forms/geology-form/lib/area-fields.ts` | Kontrolki opisują inne zjawiska niż rzeczywiste działanie; procentowy Size; Terrain height wybiera profil |
| `map-renderer/layer/geology-plan-vector-layer.ts` | Podgląd podstawowej elipsy nie odpowiada rozszerzonemu wpływowi pola |

Ścieżki `stages/*` są względem `src/utils/map-generator/`, a `forms/*`
względem `src/components/settings-panel/`.

Przykłady mechanizmów do usunięcia:

- Promień rafy jest ograniczony do 35–110 m po przeliczeniu `upliftScaleMeters`.
  Obecny Atoll density przez większość zakresu trafia w ten sam górny limit.
- Ordinary ma domyślnie `extent = 0.18` i szelf 800 m. Na świecie 1 km
  zasięg wzdłuż długiej osi rośnie z 180 do 980 m także dla wyniesienia.
- Wysokość jest wynikiem wielu mnożników i odniesienia do dna oceanu.
  Wybranie mountains nie zapewnia wyraźnej wysokości nad morzem.

## 3. Granice architektury

Przepływ: konfiguracja → receptura świata / intencja obszarów → GeologyPlan
z lokalnymi formami → ciągłe pole wysokości → raster → istniejące dalsze etapy.

- Geology wyznacza kompozycję, położenia, skale i ogólne tendencje rzeźby.
- Heightmap realizuje ciągłą powierzchnię, brzegi, stoki i drobny szczegół.
- Renderer odczytuje tę samą geometrię planu. Nie odtwarza własnego algorytmu.
- Generator nie importuje rendererów, komponentów ani store.
- Wszystkie odległości, transformacje i topologia korzystają ze wspólnego portu
  przestrzennego. Nie dodawać lokalnego wrap ani drugiej normalizacji.
- Strategie typów przechowują zachowanie. Nie rozrzucać `if character === ...`
  po rasteryzacji, workerze i pipeline.
- Konfiguracja i plan przesyłane przez worker są danymi serializowalnymi.
  Funkcje strategii pozostają w rejestrze kodu, nie w wiadomościach workera.
- Etapy deklarują rzeczywiste wejścia i wyjścia. Aktualizować zależności oraz
  invalidację; nie przestawiać etapów jako sposobu naprawiania zależności.
- Bez naprawiania wyniku przez przesuwanie wysp, wycinanie pierścieni lub
  podnoszenie gotowego rastra. Inwarianty wynikają z planowania i konstrukcji pola.

## 4. Kontrakty danych

Nazwy nowych typów poniżej są proponowane; wymagane są ich znaczenie i granice.

### 4.1. Konfiguracja obszaru

W `src/utils/map-generator/types.ts` zastąpić parametry o mylącej semantyce
konfiguracją intencji właściwą dla typu. Zachować stabilne `id`, `character`
i `placement`. Wprowadzić jawny numer wariantu, np. `variationSeed`.

Intencje specyficzne dla typu:

| Typ | Parametr intencji | Działanie |
| --- | --- | --- |
| Ordinary | `islandScale`: small / mixed / large | Rozkład wielkości i liczby lokalnych form |
| Volcanic | `layout`: clustered / scattered / chain | Rozmieszczenie głównych wyniesień |
| Atoll | `composition`: islets / mixed / lagoons | Udział form bez laguny oraz lagunowych |

Użyć typowanej konfiguracji, która nie pozwala ustawić volcanic.layout w atoll.
Mapowanie etykiet UI ma mieszkać w formularzu. Generator otrzymuje intencję
o znaczeniu domenowym, nie procent suwaka.

Rozmiar fizyczny obszaru wyliczać wspólną polityką z wymiarów świata i budżetu
kompozycji. Mały / średni / duży stanowi uporządkowany wybór skali. Mapa świata
nie powinna decydować o skali form przez liczbę komórek rastra.

Usunąć albo jawnie zastąpić `upliftDensity`, `fragmentation`, `rimStrength`
i `upliftScaleMeters`, gdy nowy model przejmie ich zadania. Nie utrzymywać
dwóch konkurencyjnych algorytmów. Wewnętrzne współczynniki profilu są dozwolone,
ale muszą mieć jednoznaczne jednostki i opis rzeczywistego działania.

### 4.2. Plan obszaru i form

`GeologicalAreaPlan` powinien zawierać:

- stabilne id i środek obszaru;
- geometrię zasięgu lądu, z orientacją i ograniczoną deformacją;
- osobną geometrię/politykę szelfu;
- listę lokalnych form ze stabilnymi identyfikatorami;
- rozwiązane parametry wysokości, ukształtowania i szczegółu.

Lokalna forma opisuje środek, skalę, orientację, nieregularny obrys, zasięg
wpływu oraz parametry wysokości względem morza. Dla laguny potrzebny jest
dodatkowo opis wnętrza, szerokości obrzeża i jego zmiennej wysokości.
Zastąpić `ReefSite { centre, radius }` tym bogatszym opisem.

Nie przechowywać gotowej linii brzegowej jako szablonu wyspy. Obrys wyznacza
strukturę pola; ostateczny brzeg jest przecięciem powierzchni z poziomem morza.

### 4.3. Determinizm i edycja

- Nazwane strumienie: receptura, placement, geometria, formy, relief, detal.
- Wariant obszaru wpływa na jego wnętrze, nie na wybór jego środka.
- Zmiana kolejności rekordów nie zmienia wyniku ani rozstrzygnięć provenance.
- Dodanie obszaru daje własny wariant z seeda świata i stabilnego id, bez
  `Math.random()` i czasu systemowego.
- Dodanie/usunięcie sąsiada może wpłynąć na automatyczne rozmieszczenie;
  nie obiecywać pełnej stabilności placementu przy zmianie listy.
- Operacja „Zmień wariant” zachowuje typ, rozmiar i środek istniejącego obszaru.
  Osiągnąć to przez niezależność strumieni, nie przez ukryte przejście na fixed.

## 5. Algorytmy

### 5.1. Liczba i wielkość obszarów świata

1. Obliczyć fizyczną powierzchnię wnętrza świata przez wspólną geometrię maski.
2. Wyznaczyć liczbę ze skali świata i receptury, z minimum 5 oraz jawnym limitem.
3. Rozdzielić budżet powierzchni wpływu między obszary z ograniczoną zmiennością.
4. Wyliczyć rozmiary z tego budżetu i proporcji osi; uwzględnić wydłużenie.
5. Rozmieścić obszary w dostępnej przestrzeni.

Punkt startowy do strojenia: `N = clamp(round(5 * A / A_ref), 5, MAX_AREAS)`,
gdzie `A_ref` to powierzchnia najmniejszego wspieranego świata danego kształtu.
To propozycja kalibracji, nie zatwierdzona stała. Dobrać krzywą tak, żeby
większe światy miały więcej grup bez szybkiego osiągania limitu i bez pustych
połaci wynikających z za małych obszarów. Obecny limit to 20; ocenić go dla
całego wspieranego zakresu wymiarów i zmienić świadomie, wraz z budżetem kosztu.

Pokrycie obszarami nie jest procentem lądu. Nie wymuszać powierzchni lądu przez
końcowe przesuwanie poziomu morza. Wariant receptury może zmieniać kompozycję,
ale przy ustalonym wariancie liczba nie powinna maleć wraz z powierzchnią mapy.

### 5.2. Rozmieszczanie obszarów

Zastąpić ocenianie samych dysków planowaniem uwzględniającym rzeczywisty zasięg.
Zalecany kierunek: podział wnętrza na przestrzennie rozłożone miejsca docelowe,
następnie ograniczone przesunięcia w ich granicach. Dla pięciu użyć centrum
i czterech miejsc wokół, z obrotem i jitterem; dla większych N rozwinąć
równomierne próbkowanie dostępnego wnętrza.

To jeden konstrukcyjny algorytm: nie losować dowolnie, a potem odpychać
kolizyjnych obszarów drugim przebiegiem. Można oceniać ograniczony zbiór
kandydatów wewnątrz zaplanowanych miejsc. Nakładanie obszarów jest dopuszczalne
według receptury; lokalne laguny mają odrębny warunek separacji.

Receptura dobiera wykonalne rozmiary przed utworzeniem konfiguracji. Później
planner nie zmniejsza ani nie usuwa jawnie skonfigurowanych obszarów po cichu.
Niemożliwe ręczne konfiguracje zgłasza istniejącym typowanym błędem placementu.

### 5.3. Zasięg lądu i szelfu

- Pole form i jego deformacje mają ograniczony zasięg wewnątrz obszaru.
- Geometria deklaruje maksymalną deformację używaną przy planowaniu odstępów.
- Szelf jest osobnym wpływem na podwodne podłoże. Jego szerokość nie zmienia
  zasięgu wyniesień, amplitudy gór ani skali wysp.
- Docelowa wysokość szelfu pozostaje poniżej poziomu morza. Łączenie samych
  szelfów również nie może tworzyć lądu.
- Ograniczenia konstruować w funkcjach pola; bez końcowego obcinania gotowej
  wyspy do elipsy, które utworzyłoby sztuczną linię brzegową.

### 5.4. Lokalne formy zwykłe i wulkaniczne

Rejestr strategii tworzy rozkład form odpowiedni dla typu i intencji.
Ordinary dobiera formy różnych rozmiarów, dopuszcza kontrolowane łączenie
i umieszcza lokalne wyniesienie na większych wyspach. Masyw ma własną
strukturę wyniesień/grzbietów, a nie tylko większy mnożnik szumu.

Volcanic wyznacza główne wyniesienia oraz mniejsze formy skaliste.
Chain planuje środki wzdłuż łagodnie zakrzywionej osi, z odchyleniami,
nierównymi odstępami i skalami. Nie ustawia wszystkich wysp na prostej.
Pozostałe układy mają odrębne zasady rozmieszczenia widoczne w planie.

### 5.5. Laguny, odstępy i obrzeża

- Planować dostępne miejsca i rozmiary wspólnie. Liczba lokalnych form może
  być mniejsza w ciasnym obszarze; nie dotyczy to minimum obszarów świata.
- Dla oddzielnych form wymagać odległości co najmniej sumy ich ograniczających
  promieni powiększonej o pas wody. Promienie obejmują maksymalną deformację.
  Można później zastosować dokładniejszą ocenę geometrii zamiast dysków.
- Obrys modelować ciągłą, okresową funkcją kierunku o ograniczonej amplitudzie
  lub równoważną zamkniętą krzywą. Nie losować niezależnego promienia per piksel.
- Osobno zmieniać obrys laguny, szerokość obrzeża i jego wysokość wzdłuż łuku.
- Wysokość obrzeża przechodzi przez poziom morza, tworząc naturalne przerwy.
- W każdym mieszanym obszarze uwzględnić zarówno formy lagunowe, jak i wysepki,
  jeśli dostępna liczba form na to pozwala; w przeciwnym razie wybór jest jawnie
  częścią receptury. Nie wymuszać wszystkiego w każdej pojedynczej formie.
- Drobny szum nie może niwelować zaplanowanych odstępów ani zamykać wszystkich
  otwarć laguny. Jego maksymalny wpływ uwzględnić w konstrukcji pola.

### 5.6. Wysokość i łączenie pól

Rozdzielić podłoże podwodne, wyniesienie formy oraz lokalną rzeźbę.
Poziom morza ma jedno źródło prawdy. Docelowa wysokość formy jest wyrażona
w metrach nad tym poziomem, a głębokość dna nie odejmuje się ponownie od już
rozwiązanego celu wysokościowego.

Profile dobierają wysokości według lokalnego rozmiaru i charakteru, nie tylko
globalnego rozmiaru świata. Konkretne zakresy metrów trzeba skalibrować na
wspieranych skalach mapy; nie wpisywać arbitralnie kilometrów wysokości dla
wyspy szerokiej na kilkadziesiąt metrów. Wynik kalibracji zapisać jako tabelę
rozmiar formy → zakres wysokości i nachyleń, z przykładami seedów.

Łączenie wpływów musi być niezależne od kolejności. Zalecany kierunek:
ograniczona obwiednia wysokości z jawnym lokalnym wygładzeniem, zamiast
nieograniczonego sumowania amplitud. Określić maksymalne przekroczenie celu
przez wygładzanie i detal; sprawdzić je liczbowo. Przy zmianie operatora
uaktualnić definicję dominującego wkładu używaną w provenance.

## 6. Formularz i podgląd

W `area-fields.ts` zastąpić obecne density/spread/rim nowymi kontrolkami
intencji z sekcji 4. Terrain height usunąć z podstawowego formularza.
Wielkość obszaru prezentować słownie, opcjonalnie z orientacyjną szerokością
w metrach. Szerokość liczyć z tej samej polityki co generator.

W store zapewnić seedowane dodawanie i zmianę wariantu, zachować stan ręcznej
edycji oraz brak samoczynnego nadpisywania listy przez preset. Kopiowanie
obszaru powinno zachować jego intencję i otrzymać nowe id; nowa realizacja
wynika z nowego strumienia. Zmiana wariantu nie zmienia id.

Podgląd geology pokazuje osobno granicę obszaru, ogólne zasięgi lokalnych form
i opcjonalny zasięg szelfu. Korzysta z danych planu i wspólnej geometrii.
Zmiana skali wysp, układu lub udziału lagun musi być widoczna w tym podglądzie.
Nie obiecywać zgodności obrysu formy z dokładną linią brzegową heightmapy.

## 7. Mapa zmian w repozytorium

| Plik / katalog | Zakres |
| --- | --- |
| `src/utils/map-generator/types.ts` | Konfiguracja intencji, plan lokalnych form, jednostki i kontrakty |
| `src/utils/map-generator/stages/geology/defaults.ts` | Limity obszarów/form, zakresy domenowe, bez etykiet UI |
| `src/utils/map-generator/stages/geology/presets.ts` | Receptury świata, minimum 5, rozmiary i kompozycja |
| `src/utils/map-generator/stages/geology/plan.ts` | Placement i delegacja do strategii; wydzielić geometrię i strategie do małych modułów |
| `src/utils/map-generator/stages/geology/geology-check.ts` | Walidacja nowych konfiguracji i planów, ograniczenia geometrii i liczb |
| `src/utils/map-generator/stages/geology/stage.ts` oraz `index.ts` | Wejścia, wyjścia i publiczny eksport |
| `src/utils/map-generator/stages/heightmap/field.ts` oraz `fields.ts` | Rozdzielenie szelfu, pól form, wysokości i szczegółu |
| `src/utils/map-generator/pipeline/stage-definitions.ts` | Zależności i invalidacja zgodna z nowymi wejściami |
| `src/utils/map-generator/worker/` | Serializacja i guardy, tylko jeśli kontrakt wymaga zmian |
| `src/stores/form/geology-form-store.ts` | Nowe intencje, dodawanie, warianty i edycja |
| `src/components/settings-panel/forms/geology-form/` | Kontrolki i opisy faktycznych efektów |
| `src/components/world-generator/lib/generation-config.ts` i powiązane hooki | Przekazywanie konfiguracji, seeda, wymiarów i odświeżanie presetów |
| `src/utils/map-renderer/layer/geology-plan-vector-layer.ts` | Wspólny podgląd geometrii planu |
| `src/utils/map-generator/analysis/`, provenance i map-readout | Odbiór wyniku i poprawne identyfikatory po zmianie modelu |

Przed zmianą kontraktów wyszukać wszystkie konstruktory, guardy, fixture,
cache i ewentualną persystencję. Jeśli istnieją zapisane konfiguracje, migrację
wykonać raz na granicy odczytu z walidacją. Nie dodawać domyślnych starych pól
wewnątrz rastra jako kompatybilności. Jeśli persystencji nie ma, zaktualizować
producentów i konsumentów atomowo, bez zbędnej warstwy migracji.

## 8. Kolejność wdrożenia

1. **Kontrakty i wspólna geometria:** dane form, jednostki, walidacja, strumienie.
2. **Zasięg i wysokości:** rozdzielić szelf, poprawić model odniesienia do morza
   i operator łączenia, podłączyć podstawowe formy do heightmapy.
3. **Strategie lokalne:** ordinary i volcanic, następnie nieregularne laguny,
   odstępy, przerwy i wysepki. Usunąć poprzedni radialny model raf.
4. **Kompozycja świata:** minimum 5, skala liczby, przestrzenne rozmieszczenie,
   odrębne receptury wszystkich presetów i różne realizacje dodawanych obszarów.
5. **Formularz i podgląd:** kontrolki intencji, Size, warianty, obrysy form/szelfu.
6. **Odbiór:** aktualizacja testów po ukończeniu implementacji zadania,
   porównania wizualne, dokumentacja parametrów i końcowy pełny check.

Nie kończyć zadania na zmianie etykiet lub zwiększeniu minimalnej liczby.
Nie rozpoczynać od rozbudowanego audytu poprzedniego refaktoru; odczyt kodu
ma służyć konkretnemu wdrożeniu powyższych zmian.

## 9. Kryteria odbioru

### Automatyczne

- Każdy preset i najmniejszy wspierany świat daje co najmniej 5 obszarów.
- Większe światy zwiększają liczbę do świadomie ustalonego limitu; ręczna lista
  0–4 obszarów pozostaje prawidłowa.
- Ten sam seed, konfiguracja i wymiary dają ten sam plan; permutacja listy
  nie zmienia pola ani przypisania provenance do id.
- Zmiana metersPerSample nie zmienia fizycznego rozmieszczenia planu.
- Wariant zmienia wnętrze wskazanego obszaru, zachowuje środki i intencje.
- Lokalne formy mieszczą się w zadeklarowanych zasięgach także po deformacji.
- Oddzielne laguny spełniają minimalny odstęp i mają dodatnią szerokość obrzeża.
- Samo poszerzenie szelfu nie rozszerza wsparcia wyniesień i nie tworzy lądu.
- Wynik wysokości jest skończony, niezależny od kolejności nakładania i mieści
  się w zadeklarowanych zakresach z tolerancją detalu/wygładzenia.
- Próbkowanie wybranych punktów i analiza wyników potwierdzają fizyczną
  wysokość głównych form wulkanicznych, nie tylko nazwę mountains w planie.
- Formularz przekazuje właściwe intencje; zmiana kontrolki przebudowuje
  wymagane etapy i podgląd, a nie wyłącznie lokalny stan UI.

Testować własności algorytmu oraz integrację. Nie uzależniać odbioru od
jednego szczęśliwego seeda ani snapshotów samych wartości parametrów.

### Wizualne

Przygotować stały zestaw seedów dla czterech presetów, małego/średniego/dużego
świata i obu wspieranych kształtów. Zapisać konfiguracje oraz porównania
geology/heightmap. Dla porównania kontrolek utrzymywać seed i pozostałe dane.

- Na małej mapie obszary pokrywają centrum i otoczenie, bez regularnego stempla.
- Archipelag daje nieregularne wyspy różnych skal, czasem większy połączony ląd.
- Volcanic ma czytelne wyniesienia i formy skaliste; chain ma widoczny układ.
- Laguny są rozdzielone wodą, różnią się obrysem i otwarciami; obecne są wysepki.
- Ląd pozostaje związany z obszarami geology; szelf ma zrozumiały osobny zasięg.
- Różnice kontrolek i presetów są czytelne bez zaglądania w wartości techniczne.

Po zakończeniu implementacji uruchomić `pnpm run check:all` raz na końcu;
powtarzać tylko po naprawach wykrytych błędów. Samo zapisanie tego dokumentu
nie wymaga uruchamiania testów ani checków projektu.

## 10. Decyzje do kalibracji podczas wdrożenia

Wykonawca dobiera i dokumentuje: krzywą liczby obszarów, limit kosztu,
budżet pokrycia, progi rozmiarów, odstępy między formami, amplitudy deformacji,
zakresy wysokości i udział wariantów. Są to parametry do strojenia, nie powód
do zmiany zaakceptowanej semantyki. Minimum 5, trzy typy, rozdzielenie szelfu
i proste kontrolki pozostają wymaganiami.

Końcowy opis wdrożenia powinien podać zmienione kontrakty, przyjęte wartości
kalibracji, konfiguracje przykładów, wyniki weryfikacji i rzeczywiste ograniczenia.
