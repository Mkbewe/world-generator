# Plan przebudowy heightmapy: zróżnicowana rzeźba i wysepki na szelfie

Data: 2026-09-27. Status: plan po przeglądzie działających `StructureCharacterStage`
i `HeightmapStage`. Dotyczy jakości pola wysokości przed wdrożeniem
`LandOceanStage`. Punktem odniesienia jest roadmapa §4.1 oraz §4.3–4.6.
Ten dokument aktualizuje kierunek opisany w `heightmap-implementation-plan.md`:
tamten plan dotyczył pierwszej implementacji i nie opisuje obecnej przebudowy.

## Problem i decyzja projektowa

Obecny `crossSection` sprowadza większość wysp do tego samego przekroju:
wyższa oś szkieletu, niższy brzeg. Strefy zmieniają amplitudę tego wzoru,
a istniejący szum głównie zaburza linię brzegową. Zmiana koloru, biomów lub
poziomu morza nie usunie tej powtarzalności. Przy granicy korytarza wysokość
lądu schodzi do około `0 m`, a szelf zaczyna się od `-targetDepth` (domyślnie
`-60 m`); na zewnętrznej granicy szelfu pozostaje kolejny skok. Zbliżenia
ujawniają także schodki z próbkowania szumu najbliższą komórką.

Na szelfie nie powstają małe wysepki, ponieważ gałąź
`probe.distance > probe.radius` w `build.ts` zapisuje wyłącznie
`-shelfDepth`. Szum i strefy
działają tylko po stronie korytarza, a więc wysokość szelfu nigdy nie może
przekroczyć `0 m`. Roadmapa §4.3 zakłada odwrotną możliwość: kilka lokalnych
wyniesień jednej struktury może po przecięciu morzem dać archipelag.

**Kierunek:** zachować szkielet jako wskazówkę dużego układu wysp i wspólnego
szelfu, lecz odebrać mu monopol na wysokość. Jedno ciągłe pole wysokości
powstaje z łagodnego pola bazowego, niezależnych skal szumu i przestrzennych
wpływów stref. Poziom morza przecina to pole; kod heightmapy nie wyznacza
ostatecznych wysp. To jest zastąpienie obecnego algorytmu przekroju, nie
dodatkowy algorytm naprawiający gotowy raster.

## Docelowy model pola

1. Wspólny port przestrzenny zwraca dla punktu najbliższy fragment struktury,
   odległość od osi, lokalny promień oraz przynależność do wspólnego szelfu.
   Dodatnia/ujemna odległość od umownej krawędzi korytarza jest wskazówką
   dużego kształtu, a nie twardą granicą lądu. Wybór najbliższego fragmentu
   uwzględnia jego promień, żeby różne szerokości ramion nie dawały szwów.
2. Wysokość w metrach liczymy z jednego wzoru, którego składniki mają ciągłe
   wagi przestrzenne:

   ```text
   H(p) = baza_kształtu(p)
        + duże_formy(p)
        + średnie_formy(p)
        + wpływ_stref(p)
        + drobny_detal(p)
   ```

   Baza zachowuje rozpoznawalny układ długich, okrągłych i rozgałęzionych
   struktur. Nie wymusza maksimum na osi ani `H = 0` na granicy korytarza.
   Składniki przechodzą w batymetrię szelfu i głęboki ocean bez zmiany wzoru
   w jednym punkcie i bez obcinania lądu do `Math.max(0, H)`.
3. Szerokie i średnie formy są oddzielnymi deterministycznymi pasmami szumu.
   Ich skala i amplituda są podane w jednostkach świata; próbki między
   komórkami są interpolowane. Obecny `noiseMap` miesza już oktawy i nie daje
   dwóch niezależnych pasm przez dwukrotne odczytanie. Ustalić jeden port
   szumu dla generatora (zgodny z planowanym `StageNoise`, #356), bez lokalnej
   normalizacji współrzędnych i bez szumu w rendererze.
4. Strefy charakteru sterują lokalną amplitudą, częstością i znakiem form:
   pasmo grzbietowe, płaskowyż, kotlina czy częściowo wyniesiony brzeg mogą
   występować na różnych fragmentach tej samej struktury. Geometria `rim`
   zachowuje przerwy; `chain` nie skleja ramion. Profil i wagi stref pochodzą
   ze wspólnego `createZoneSampler`, a sposób modyfikacji pola powinien być
   danymi wariantu, nie kolejną gałęzią po nazwie archetypu w pętli rastra.
5. Linia brzegowa to zbiór punktów `H = poziom_morza`. Duże formy mogą ją
   przesuwać na zewnątrz i do wewnątrz korytarza. Dzięki temu zatoka, półwysep
   i oddzielona wysepka wynikają z wysokości, zamiast być dopisane po fakcie.

## Wysepki i archipelagi na wspólnym szelfie

Pole dużych i średnich form działa również nad płytkim dnem szelfu. Jego
amplituda i obwiednia zależą od głębokości bazowej oraz odległości od lądu:
lokalne wyniesienie może przejść przez `0 m`, podczas gdy otaczające je dno
pozostaje pod wodą. Dalej na zewnątrz wpływ zanika płynnie, więc ocean nie
zapełnia się losowymi punktami lądu. `irregularity` ma zmieniać geometrię
i wysokość szelfu w określonej skali, zamiast pozostawać martwym parametrem.

Nie wymuszamy jednej wysepki na każdym szelfie ani nie stemplujemy okręgów
na gotowym rastrze. Testujemy rozkład wielu seedów: część szelfów bez wysepek,
część z jedną, część z kilkoma, przy zachowaniu rozpoznawalnej głównej
struktury. Wielkość wysepek musi przekraczać kilka komórek przy docelowej
rozdzielczości; pojedyncze piksele lądu traktujemy jako błąd jakości pola.

`shelfIndexMap` ma opisywać wspólne pochodzenie geologiczne także dla
wynurzeń na szelfie, a przyszły `LandOceanStage` osobno oznaczy wodę szelfową
i spójne wyspy. Kontrakt indeksu, przypisanie przy nakładających się szelfach
oraz zapis mapy do sesji trzeba ustalić przed tym etapem; obecnie katalog
warstw nie zachowuje `shelfIndexMap` w zapisanym stanie.

## Zadania wdrożeniowe

| # | Zadanie | Wynik i warunek zakończenia |
|---|---|---|
| 1 | Naprawić podgląd ujemnych wysokości | Renderer odróżnia brak próbki od wartości `< 0`; ciemne plamy i miganie przy zmianie skali znikają. Test obejmuje ujemny raster i przełączanie rozdzielczości. |
| 2 | Zmierzyć punkt wyjścia | Dla stałych seedów zapisać mapy i przekroje: wysokość osi, brzegu, szelfu; udział wysp z kilkoma wzniesieniami i liczbę wysepek na szelfach. Ten sam zestaw posłuży do porównania prototypu. |
| 3 | Zbudować wspólny port wieloskalowego szumu i zapytania przestrzennego | Deterministyczne, interpolowane próbki w kanonicznym układzie współrzędnych; jawne duże, średnie i drobne pasmo; pomiar kosztu dla dużej siatki. |
| 4 | Zastąpić obecne `crossSection` ciągłym polem | Wysokość nie musi maleć od osi do brzegu; brak skoków ląd–szelf–ocean i dużych płatów dokładnego `0 m`; brak twardego wycięcia na granicy prostokąta struktury. |
| 5 | Włączyć strefy oraz wyniesienia szelfowe | Fragmentaryczny `rim`, wewnętrzna kotlina i kilka osobnych wzniesień działają w tym samym modelu. Niektóre płytkie szelfy tworzą naturalne wysepki bez osobnego etapu ich doklejania. |
| 6 | Domknąć dane i konfigurację | `shelfIndexMap` jest trwałym wejściem późniejszego etapu, `targetDepth` jest zgodne z poziomem dna oceanu, `irregularity` działa, a budżet pamięci obejmuje oba nowe rastry. |
| 7 | Ocenić prototyp i dopiero potem stroić | Porównać te same seedy, przekroje, czas i pamięć. `pnpm run check:all` uruchomić po zakończeniu prac; testy przypadków brzegowych dopisać po ustaleniu algorytmu. |

## Kryterium decyzji o szkieletach

Porównujemy obecny algorytm z prototypem na identycznych strukturach, seedach
i rozdzielczościach. Przyjmujemy model hybrydowy tylko wtedy, gdy wyspy
różnią się nie tylko obrysem, ale też położeniem wzniesień, mają płynne
przejścia oraz pojawiają się wiarygodne wynurzenia szelfowe. Jeśli szkielet
nadal nadaje każdej wyspie ten sam wygląd albo wymaga wielu wyjątków,
ograniczamy go do organizacji archipelagów i testujemy wariant, w którym
duże pole szumu wyznacza również główny obrys. Nie dodajemy kolejnych etapów
terenu ani kontrolek, dopóki ten wybór nie zostanie poparty obrazami
i pomiarami.

`LandOceanStage` pozostaje odpowiedzialny za przecięcie wybraną wysokością
morza, etykietowanie spójnych wysp i klasyfikację wody. Hydrologia, biomy
i renderer nie odpowiadają za naprawianie bazowej wysokości.
