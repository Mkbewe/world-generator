# Docelowy plan generowania wysp

Data: 2026-09-28. Ten dokument zastępuje starsze plany Landmass, Character
i heightmapy, usunięte z bieżącej dokumentacji. Uwzględnia wcześniejsze
przeglądy Muse, DeepSeek i Grok; ich pełna treść pozostaje w historii gita.
Zakres zadań jest w [planie wdrożenia](geology-island-generation-implementation-plan-2026-09-28.md),
a kontrakty kodu w [planie technicznym](geology-generator-technical-implementation-2026-09-28.md).

## Cel

Generator ma tworzyć zróżnicowane, czytelne archipelagi: wyspy duże i małe,
zwarte i rozczłonkowane, zatoki, przerwy, wynurzenia na płytkim dnie oraz
różną rzeźbę wewnątrz jednej wyspy. Ten sam obszar intencji może dać zero,
jedną albo wiele wysp; kilka obszarów może współtworzyć jeden ląd. Ostateczny
obrys i liczba wysp wynikają z ciągłego pola wysokości przeciętego poziomem
morza. Żaden szkielet ani szelf nie jest gotową wyspą.

## Co dziś nie działa

- `LandmassLayoutStage` buduje głównie korytarze z promieniami. Archetypy
  zmieniają ich skręt, szerokość i gałęzie, więc nawet `irregular` przypomina
  poskręcane pasy. `StructureCharacterStage` przypisuje do tych samych
  korytarzy bazową strefę i najwyżej dwie dodatkowe. To dwa etapy danych
  intencji, które razem nie opisują jeszcze niezależnego obszaru genezy wysp.
- `HeightmapStage` traktuje korytarz jak zasięg lądu. `fillLand` pomija jego
  zewnętrze i obcina wysokość do co najmniej `0 m`; `fillShelves` nie liczy
  dna wewnątrz korytarza, a profil szelfu startuje od `-targetDepth`
  (domyślnie `~-60 m`) i opada do `OCEAN_DEPTH_METERS`; `Math.min(-1, …)` to
  wyłącznie strażnik znaku wody, nie głębokość szelfu. Stąd powtarzalny
  przekrój, skok `0 m` → `~-targetDepth` na brzegu i brak wynurzeń na
  szelfie. Samo zdjęcie jednego ograniczenia stworzyłoby głęboki rów na
  zanurzonej osi.
- Obecny `noiseMap` łączy oktawy w jeden raster, a heightmapa odczytuje
  najbliższą komórkę. Nie dostarcza niezależnych dużych, średnich i drobnych
  form. `irregularity` szelfu nie wpływa na wysokość.
- `shelfIndexMap` jest wyjściem pipeline'u, ale zapis sesji wybiera rastry
  przez katalog warstw, więc może go pominąć. Szacunkowe `6 B` na próbkę
  dotyczy starszego zestawu rastrów i nie pokrywa już heightmapy z indeksem.

## Model docelowy i odpowiedzialność etapów

**Obszar geologiczny** (roboczo `GeologicalArea`) to plan rozmieszczenia i
charakteru form, nie kształt pojedynczej wyspy. „Geologia” jest proponowaną
nazwą sekcji formularza i etapu; nie oznacza symulacji płyt tektonicznych.
Obszar ma położenie i skończony,
łagodnie wygaszany zasięg; rozkład skali i zagęszczenia wyniesień; kierunek i
anizotropię; tendencje do rozcinania lądu, zatok oraz rzeźby; lokalne strefy
profilu; bazę płytkiego lub głębokiego dna. Dla jednego obszaru możliwy jest
wspólny szelf, lecz **nie każdy obszar jest szelfem kontynentalnym**:
wyspy wulkaniczne i atole mogą wyrastać z innej batymetrii. Nazwy wariantów
oznaczają tendencje, a nie gwarantują pierścienia, góry czy liczby wysp.
Wariant atolowy potrzebuje lokalnej radialnej tendencji do wyniesionego,
płytkiego obrzeża i obniżonej laguny; szerokie formy mogą pierścień przerwać.
Nie jest to ogólny wzór wysokości wszystkich obszarów. Rozkład
wynurzeń kontrolują osobno poziom bazowy obszaru, amplituda i zagęszczenie
form. Nie normalizujemy wyniku do sztywnego udziału lądu w każdym obszarze.

Docelowo jeden etap planowania obszarów geologicznych zastępuje
`LandmassLayoutStage` i `StructureCharacterStage`. Ich logika może pozostać
w osobnych modułach, ale jeden kontrakt danych i jeden etap pipeline'u
pozwalają razem wybrać rozstaw wyniesień, strefy i typ dna. Odrębne etapy
warto zachować tylko wtedy, gdy pomiar wykaże istotną niezależną regenerację
lub użycie ich wyjść przez innych konsumentów. Nie łączymy z nimi
`HeightmapStage`: plan jest mały i niezależny od rozdzielczości, a pole
wysokości jest kosztownym rastrem.
Połączenie etapów nie może zmieniać rozmieszczenia obszarów przy zmianie
samej rzeźby: placement i profile korzystają z odrębnych strumieni seedu.

Podczas przebudowy obecne etapy, ich konfiguracja i formularze zostaną
oznaczone jako przestarzałe (`@deprecated` w kodzie, widoczne oznaczenie w UI).
To etap przejściowy: po podłączeniu „Geologii” stare etapy, kontrolki i
oznaczenia zostaną usunięte, bez utrzymywania starego generatora jako opcji.

`HeightmapStage` liczy jedno ciągłe pole `H(p)` w metrach: batymetria bazowa,
łagodny potencjał obszarów, niezależne szerokie i średnie formy oraz drobny
detal ograniczony skalą próbkowania. Wagi stref modyfikują formy lokalnie.
Niska częstotliwość może przerwać nawet oś dawnego korytarza i wynieść ląd
poza nią. Dno wewnątrz zatopionego obszaru, przy brzegu i na zewnątrz jest
częścią tego samego pola. Wkłady obszarów łączą się gładko; ich nośnik
zanika przed granicą obliczanego obszaru. Maska świata pozostaje osobną,
zamierzoną granicą danych. Etykieta pochodzenia lub szelfu nie steruje
znakiem wysokości.

Każdy etap losujący teren ma własny deterministyczny strumień szumu i własne
parametry skali. Wspólny kod dostarcza jedynie funkcję szumu, współrzędne i
próbkowanie; `noiseMap` pozostaje wyjściem `NoiseStage` dla podglądu i
opcjonalnego deformowania makroregionów. `HeightmapStage` nie odczytuje tej
mapy i nie zależy od formularza `Noise`. Surowe duże formy są takie same w
tym samym punkcie niezależnie od rozdzielczości; drobne pasma wolno tłumić,
gdy siatka nie potrafi ich reprezentować. Wpływ drobnego detalu blisko
poziomu morza musi być ograniczony także na docelowej siatce, żeby nie
powstawały jednokomórkowe wysepki. Szum heightmapy jest zakotwiczony w
punktach świata: przesunięty obszar zachowuje swoje ID i parametry, ale
może trafić na inny lokalny detal szumu.

`LandOceanStage` dopiero przecina `H(p)` poziomem morza, wyznacza spójne
wyspy i wodę oraz nadaje ich identyfikatory. Relacja obszar–wyspa może
być wiele do wielu; indeks szelfu nie jest identyfikatorem wyspy. Klimat,
hydrologia i biomy korzystają z tego wyniku i nie naprawiają wysokości.

**Klimat i typy wysp.** Atole mogą mieć preferencję ciepłych wód, ale pełna
temperatura i wilgotność zwykle wymagają już położenia lądu, wysokości i
oceanu. Nie tworzymy ukrytego cyklu „klimat → wyspy → klimat”. Na początku
używamy dostępnych wcześniej danych, np. szerokości geograficznej jako
wstępnej preferencji, bez gwarancji powstania atolu. Późniejsze ścisłe
powiązanie wymaga jawnego modelu dwuprzebiegowego i osobnej decyzji.

## Formularz „Geologia”

Zastępujemy obecny wybór archetypów wysp edytorem obszarów geologicznych,
inspirowanym formularzem makroregionów. Preset geografii tworzy listę obszarów
zwykłej konfiguracji; użytkownik może dodać, powielić, usunąć i zmienić każdy
z nich. Po ręcznej zmianie formularz pokazuje konfigurację jako edytowaną.
Preset świata i preset geografii pozostają oddzielnymi wyborami: preset
geografii wypełnia listę obszarów, a preset świata może jedynie wskazać
domyślny preset geografii przy tworzeniu nowej konfiguracji. Nie zawiera
własnej kopii obszarów. Zmiana presetu świata
nie nadpisuje ręcznie edytowanej listy bez jawnego działania użytkownika.
Przykład: dwa obszary z gęstymi małymi wyspami, dwa o tendencji wulkanicznej
i jeden atolowy. Liczba wpisów oznacza liczbę obszarów, **nie liczbę wysp**.

Dla pojedynczego obszaru podstawowe ustawienia to: typ bazowego dna i
charakter form, wielkość zasięgu, położenie automatyczne lub wskazane,
zwartość albo wydłużenie *zasięgu*, gęstość i skala potencjalnych wyniesień,
stopień rozczłonkowania oraz dominująca rzeźba. Presety („płytki archipelag”,
„wulkaniczny”, „atolowy”) są zestawami tych samych parametrów, które można
edytować; nie stanowią osobnego algorytmu ani obietnicy dokładnego obrysu.
Mimo tego nazwany preset musi dawać rozpoznawalny typ wyniku w większości
testowanych seedów. Niezależne obszary mogą na siebie wpływać, więc reguły
rozmieszczenia i nakładania projektujemy osobno od makroregionów, które
dzielą cały świat. Jeśli zadana liczba obszarów nie mieści się na mapie,
formularz lub wynik generacji musi to pokazać; generator nie powinien
po cichu pomijać wpisów użytkownika. Niewykonalna konfiguracja ręczna
blokuje generację i wskazuje problematyczny wpis w formularzu.
Kolejność kart nie jest priorytetem wysokości: dla tej samej listy obszarów
przestawienie kart nie zmienia mapy. Nałożone wpływy łączą się gładko,
a etykieta dominującego pochodzenia nie określa wysokości. Jedna wyspa może
zawierać komórki przypisane różnym obszarom.

**Wiek geologiczny** warto przewidzieć w projekcie jako kierunek rozwoju,
ale nie dodawać do formularza, dopóki nie ma obserwowalnego wpływu na pole.
Młodszy obszar może sprzyjać ostrzejszej rzeźbie, a starszy większemu
obniżeniu i rozczłonkowaniu. Wiek nie jest jednak prostym suwakiem
„młody = stromy, stary = gładki”: na wygląd wpływają także rodzaj podłoża,
klimat, aktywność i poziom morza. Późniejszy model powinien określić, które
z tych skutków liczy wysokość, a które dopiero erozja lub cechy terenu.

## Ocena trzech przeglądów

| Uwaga | Ocena i decyzja |
|---|---|
| Muse: osobny kontrakt szumu, rozróżnienie masek, próg wysepek i rozbicie zadania porządkowego | Zasadne. Etapy mają własne strumienie szumu i wspólny kod próbkowania; heightmapa nie czeka na pełną przebudowę `NoiseStage` (#356). Maska świata zostaje; znikają cięcia od korytarza i bboxa wpływu. Metrykę wysepek ustalamy w metrach i próbkach referencyjnych przed implementacją. |
| Muse: śledzenie planu na boardzie | Organizacyjnie sensowne, ale nie jest warunkiem poprawności algorytmu. Ten dokument nie tworzy ani nie zmienia issue. |
| deapseek: zatopiona oś, skończony nośnik, łączenie wkładów, kalibracja, persystencja i pamięć | Zasadne. Szczególnie krytyczny jest rów pod zatopioną osią. Poziom bazowy i amplitudy sterują wynurzeniem bez sztywnego udziału lądu. Podczas wdrożenia tymczasowo wyłączymy obecny limit próbek; nowy ustalimy później po pomiarze. |
| deapseek: pasma szumu jako gotowe rastry niższej rozdzielczości | Jedna możliwa implementacja, nie kontrakt. Wybór między próbkowaniem proceduralnym a buforami zależy od benchmarku czasu i pamięci. |
| Grok: oba przebiegi heightmapy trzeba zastąpić, testy starego przekroju wymienić, skok na brzegu wynosi około `0` do `-60 m` | Zasadne i potwierdzone w kodzie. Zewnętrzna granica szelfu dochodzi już do dna oceanu; nie przypisujemy jej dawnego skoku. |
| Grok: wąski sampler niezależnych pasm, lokalny układ przestrzenny, skala detalu i próg w metrach | Zasadne. Można zacząć od wąskiego portu spójnego z przyszłym #356. Oś, lokalna styczna i promień są danymi kierunkowymi, ale nie mogą znowu narzucać obrysu. Drobny detal nie tworzy jednokomórkowych wysp. |
| Grok: `targetDepth` oraz budżet | Zasadne. `targetDepth` jest głębokością wewnętrznej części obecnego pasa, a nie głębokością oceanu. `heightmap` i `shelfIndexMap` już istnieją; koszt trzeba doliczyć do starego budżetu. |

## Krótka kolejność prac

1. **Kryteria nowego generatora.** Ustalić zestaw seedów i skal oraz wymagane
   cechy nowych map: przekroje, liczbę wysp na obszar geologiczny, wielkości
   wysepek, czas i szczyt pamięci. Obecny algorytm zostanie zastąpiony;
   nie budujemy zestawu porównań ze starymi mapami.
   Spójne wyspy liczy wspólny moduł używany potem przez `LandOceanStage`.
   Próg czytelnej wysepki określić jej polem i minimalną szerokością w metrach,
   z wybraną regułą sąsiedztwa komórek i krawędzi świata.
2. **Kontrakt obszaru i formularza.** Zaprojektować warianty jako rozkłady skali,
   zagęszczenia i form, z osobną batymetrią i lokalnymi strefami. Pokazać
   przykłady jednego obszaru dającego 0, 1 i kilka wysp. Określić presety,
   edycję listy oraz znaczenie każdej kontrolki. Wdrożyć połączony etap
   planowania wraz ze zmianą konfiguracji, sesji w pamięci i podglądu;
   nie dokładać kolejnych korytarzy do starych archetypów.
3. **Szum etapowy i port pola.** Współdzielić kod deterministycznego szumu,
   lecz każdemu etapowi dać własny strumień. Heightmapa próbkuje niezależne
   pasma w jednostkach świata bez odczytu `noiseMap`. Dodać zapytanie o
   łagodny wpływ obszaru; określić wygaszanie, interpolację i koszt.
4. **Wymiana heightmapy.** Zastąpić `fillLand`/`fillShelves` jednym polem
   wysokości i osobną etykietą pochodzenia. Uwzględnić zatopioną oś,
   wynurzenia na płytkim dnie, różne położenie wzniesień, ciągłość ląd–woda
   i ograniczenie drobnego detalu. Wymienić testy starego przekroju.
5. **Kontrakty danych.** Przenieść ustawienia szelfu do Geologii, ustalić
   znaczenie `irregularity` albo je usunąć; nadać `featureScale` nowe
   znaczenie albo usunąć. Oddzielić rastry generatora od katalogu warstw,
   poprawić zależności konfiguracji i statystyki poziomu morza. Pomiar
   pamięci informuje o koszcie, lecz tymczasowo nie ogranicza siatki.
6. **Ocena nowego generatora.** Ocenić wyniki dla ustalonych seedów i skal.
   Wynik odpada, jeśli wciąż
   przypomina poskręcane pasy, daje szwy lub nie generuje czytelnych
   przypadków 0/1/wielu wysp na obszar. Sprawdzić też, czy rozkład typów
   wysp daje się sterować bez twardego stemplowania ich obrysów. Dopiero
   wtedy utrwalić API i przejść do `LandOceanStage`.
