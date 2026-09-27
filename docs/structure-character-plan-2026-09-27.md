# Plan stref charakteru struktur — 2026-09-27

Status: punkty 1–6 wdrożone; punkt 7 pozostaje propozycją. Dokument rozwija obserwacje z
`character-zones-analysis.md` i zastępuje wcześniejsze założenie, że `spine` oraz
`rim` zawsze obejmują cały szkielet. Opisuje docelowe zachowanie; obecne lokalne
zmiany w kodzie nie realizują go jeszcze w całości.

## Cel

`StructureCharacterStage` zapisuje zamiar ukształtowania terenu na strukturze
geologicznej, zanim powstanie heightmapa. Małe struktury mogą pozostać jednolite.
Duże, szczególnie rozgałęzione, powinny móc mieć kilka czytelnych obszarów o
różnym charakterze. Podgląd nie przedstawia jeszcze faktycznych wysp po
zastosowaniu poziomu morza.

Na długiej lub rozgałęzionej strukturze charakter przy brzegu ma występować
lokalnie: na jednym odcinku może być nizina, dalej wzgórza, a po przerwie znów
nizina. Nie tworzymy automatycznie jednolitej obwódki wokół wszystkich ramion.

## Reguły modelu

1. Charakter (`plains`, `hills`, `mountains`) określa rodzaj terenu, a położenie
   strefy określa osobna geometria. Dopuszczamy zarówno wyższy grzbiet i niższe
   brzegi, jak i niższy grzbiet otoczony wyższymi obrzeżami. Ten drugi układ
   powinien być świadomie wybranym wariantem, a nie przypadkiem wynikającym z
   kolejności nakładania stref.
2. Główny grzbiet i każde odgałęzienie są osobnymi, ciągłymi ścieżkami grafu.
   Pozycję wzdłuż ścieżki mierzymy jej długością. Nie łączymy końca jednego
   ramienia z początkiem drugiego tylko dlatego, że ich krawędzie są sąsiadami
   na liście.
3. Strefa wzdłużna wskazuje ścieżkę oraz zakres `from`–`to`. Pas przy osi
   (`spine`) i pas przy brzegu (`rim`) również mogą być ograniczone takim
   zakresem; `share` wyznacza ich szerokość względem lokalnego promienia.
   Pozwala to umieścić pas tylko na części brzegu i zostawić przerwę przed
   następnym pasem.
4. Dla całej struktury losujemy najpierw układ terenu, potem charaktery i
   fragmenty ścieżek. Odcinki mają minimalną długość, a liczba zmian jest
   ograniczona przez rozmiar i złożoność struktury. Małe wyspy nie dostają
   drobnych, przypadkowych pasków. Atol zachowuje własną regułę nizinnego
   charakteru.
5. Strefa `whole` pozostaje wartością bazową. Jedna domenowa funkcja wpływu
   stref rozstrzyga ich pokrycie, priorytet i przejście między charakterami.
   Podgląd, odczyt pod kursorem i przyszła heightmapa korzystają z tej samej
   semantyki. Kolor podglądu może pokazywać dominujący charakter, natomiast
   wysokość przy granicach powinna zmieniać się płynnie.

## Kolejność wdrożenia

1. **Ustalić kontrakt geometrii.** W `ZoneGeometry` opisać identyfikator
   ścieżki, zakres długości i opcjonalną szerokość pasa. Określić sposób
   traktowania skrzyżowań ramion, nakładania stref i struktury bez krawędzi.
   Zaktualizować walidację danych oraz dokumentację kontraktu heightmapy.
2. **Wyznaczać stabilne ścieżki struktury.** Wspólny kod przestrzenny ma zwracać
   główny grzbiet i ramiona z jednoznaczną kolejnością odcinków. Naprawić
   obecny `chain`, który skleja odrębne ramiona w jeden wielokąt. Sprawdzić
   strukturę z jednym węzłem oraz zamknięty łuk laguny.
3. **Dodać lokalne pasy.** `chain`, `spine` i `rim` mają działać na wybranym
   zakresie jednej ścieżki. Generator może nadać kilka rozdzielonych zakresów
   temu samemu charakterowi. Podział ma działać również w środku długiego
   grzbietu, a nie tylko od jego początku lub końca.
4. **Losować układy terenu.** Pule archetypów przechowują dostępne warianty i
   ich wagi, w tym wariant z nizinną osią i wyższymi obrzeżami. Liczba stref
   rośnie z użyteczną długością, szerokością i liczbą ramion. Samo zwiększenie
   `characterVariation` nie powinno być jedynym sposobem uzyskania zróżnicowania
   na dużej strukturze.
5. **Ujednolicić rozstrzyganie stref.** Przenieść obliczenie wpływu i pokrycia
   do warstwy domenowej niezależnej od renderera. Rysowanie i hit-test mają
   odzwierciedlać ten wynik; przyszły `HeightmapStage` użyje tej samej
   definicji zamiast odtwarzać geometrię po swojemu.
6. **Zmienić paletę podglądu.** `plains` = zielony, `hills` = żółty lub
   pomarańczowy, `mountains` = brązowy. Kolor oznacza charakter niezależnie od
   tego, czy strefa leży na grzbiecie, czy przy brzegu. Zmienić paletę i jej
   testy, bez zmiany znaczenia danych generatora.
7. **Zweryfikować wynik na kształtach.** Sprawdzić wyspę okrągłą, długą
   wygiętą, rozgałęzioną i atol. Na rozgałęzionej wymagany jest przykład
   przerwanego pasa brzegowego oraz przykład obu układów wysokości. Porównać
   kolor z odczytem pod kursorem wzdłuż granic, na połączeniach ramion i w
   miejscach nakładania stref. Na zestawie seedów ocenić udział struktur
   jednolitych i wielostrefowych, zamiast poprzestać na teście, że podział
   kiedykolwiek występuje.

## Kryteria zakończenia

- Na rozgałęzionej strukturze lokalny `rim` może skończyć się w połowie
  ramienia, pozostawić fragment bez pasa i pojawić się ponownie dalej.
- `chain` nie maluje połączeń pomiędzy niepołączonymi częściami grafu.
- Podgląd i odczyt wskazują ten sam dominujący charakter w danym punkcie.
- Duża struktura może mieć sensowną strefę wewnętrzną i kilka zewnętrznych;
  mała struktura oraz atol nie są zmuszane do zbędnych podziałów.
- Zielony zawsze oznacza niziny, żółty lub pomarańczowy wzgórza, a brązowy
  góry, także w wariancie z wyższymi obrzeżami.
