# Heightmapa: model generacji (ustalenia)

Ustalenia z 2026-10-10, przed implementacją. Powiązane: #475 (nadrzędny),
#462 (przywrócenie etapu), #474 (suwaki regionu), #82 (wysepki), #355 (poziom
morza). Ten dokument jest źródłem prawdy dla implementacji. Odłożone zmiany
`dacb835` i gałąź zapasowa `backup/457-geology-heightmap-pre-split` to baza
kodu, ale sposób powstawania lądu, mechanizm brzegów i kontrakt metadanych
różnią się od stanu z gałęzi zapasowej.

## 1. Kontrakt wejść

Geologia (formularz, konfiguracja i plan) niesie wszystko, co czyta heightmapa:

- `type` regionu: `ordinary` | `volcanic` | `atoll`,
- rozmiar regionu (waga -> powierzchnia) i `centre`,
- metadane heightmapy ustawiane suwakami w edytorze regionu:
  - `concentration` — koncentracja lądu: 0 = jedna duża wyspa, 1 = rozsypany
    archipelag,
  - `mountainousness` — górzystość; używana tylko przez typy, które ją
    wspierają (`ordinary`),
  - `landShare` — udział lądu: docelowy udział powierzchni regionu nad wodą,
- rastry: `regionOwnerMap`, `regionBorderDistanceMap`.

Metadane zapisują się w konfiguracji geologii (tam jest formularz) i przechodzą
do planu; etap geologii ich nie używa — tylko przenosi. Formularz pokazuje
suwak wtedy, gdy dany typ go obsługuje (bez warunków po nazwie typu).

Heightmapa ma własne ustawienia globalne:

- `seaLevel` — poziom morza w metrach,
- `relief` — globalny mnożnik wysokości,
- `isletFrequency` — szansa drobnych wynurzeń (wysepki/skały),
- dodatkowo, do włączenia przy implementacji: głębokość oceanu i ziarnistość
  wybrzeża.

Wyjścia: `heightmap` (metry) i `provenanceMap` (region na komórkę).

## 2. Zasady

- Ląd powstaje z szumu: wysokość to złożenie pasm szumu o różnych długościach
  fali, przetworzonych przez suwaki. Nie rozstawiamy figur (środków, promieni,
  profili) — takie podejście już raz zawiodło.
- Naturalny wygląd: pole szumu fraktalnego próbkujemy przez drugi szum
  (zniekształcenie współrzędnych), a linia brzegowa to poziomica tego pola —
  dzięki temu kształty są poszarpane i zróżnicowane, nigdy okrągłe.
- Suwaki przetwarzają pole szumu, a nie ustawiają obiekty:
  - udział lądu — przesuwa pole względem poziomu morza,
  - koncentracja — zmienia mieszankę długości fal: przewaga długiej fali
    scala ląd w jedną masę, przewaga średniej i drobnej rozsypuje go na
    archipelag,
  - górzystość — amplituda i przekształcenie grzbietowe (ostre granie zamiast
    pagórków).
- Przy granicy regionu pole wygasza bramka liczona z `regionBorderDistanceMap`;
  próg bramki zaburza szum, więc cieśniny są poszarpane i zmieniają szerokość.
  Nie ma stałego pasa ani rowu wokół regionu.
- Deterministyczność: to samo ziarno świata, konfiguracja i wymiary dają te
  same rastry.
- Geologia nie liczy wysokości; nie ma osobnego etapu ląd/ocean (#447 zamknięte
  jako niepotrzebne).
- Analiza spójności lądu wraca wyłącznie na potrzeby walidacji (#446), nie jako
  etap potoku generowania.

## 3. Kształty typów (wulkany, laguny, różnorodne wyspy)

- Wspólna podstawa: pole szumu fraktalnego (wiele oktaw) prókowane przez drugi
  szum — makro-oktawy dają masę lądu, średnie półwyspy i zatoki, drobne klify
  i chropowatość wybrzeża; zniekształcenie sprawia, że żadna wyspa nie jest
  okręgiem.
- `ordinary` — gładkie pole z dużym udziałem długiej fali: szerokie, łagodne
  wzniesienie tuż przy poziomie morza (przyszły szelf), a na nim wypiętrzenia
  tworzące wyspy. Górzystość dodaje amplitudy i grzbietów; koncentracja
  decyduje o jednej masie albo archipelagu.
- `volcanic` — szum wskazuje wysokie miejsca; dla każdego szczytu liczone jest
  pole odległości od niego i wysokość jest przekształcana w stożek o lekko
  wklęsłych zboczach; u szczytu odejmowana jest misa krateru, a drobny szum
  grzbietowy dodaje żłobki. Podstawa jest nieregularna, bo pole jest
  zniekształcone. Koncentracja: jeden masyw albo łańcuch stożków.
- `atoll` — pierścień rafy powstaje z pasa wokół poziomicy gładkiego pola
  (pole przepuszczone przez pasmo wokół stałej wartości): zamknięte, powyginane
  rafy, w środku laguna poniżej poziomu morza. Spłaszczenie przy poziomie
  morza daje niskie, płaskie wyspy, a miejsca, gdzie rafa schodzi pod wodę,
  tworzą naturalne wejścia do laguny.

## 4. Generacja krok po kroku

1. Tło: szum długiej fali poniżej poziomu morza — dno oceanu.
2. Pole regionu: mieszanka pasm ustawiona suwakami, przesunięta o udział lądu;
   typ wybiera przekształcenie pola (gładkie, stożkowe z kraterem, pasmo
   poziomicy dla raf).
3. Bramka granicy: wygaszenie liczone z `regionBorderDistanceMap`, z progiem
   zaburzonym szumem.
4. Złożenie: wysokość = tło + pole regionu po bramce.
5. Poziom morza: poniżej — woda; szelf zostaje tuż pod powierzchnią.
6. Wysepki: `isletFrequency` zwiększa szansę drobnych wynurzeń drobnego pasma.
7. Wyjścia: `heightmap`, `provenanceMap`; podniesienie numeru wersji kontraktu
   i zapis danych.

## 5. Czego nie robimy

- Rozstawiania analitycznych figur (środki, promienie, profile, archetypy).
- Stałego pasa wokół granic regionów (stary mechanizm 180 m + 300 m).
- Pętli dopasowujących udziały komórek.
- Osobnego etapu ląd/ocean ani osobnego etapu klasyfikacji wysp.
- Porównań z poprzednim generatorem.

## 6. Formularze

- Heightmapa (globalne): poziom morza, wysokość, wysepki/skały (+ opcjonalne:
  głębokość oceanu, ziarnistość wybrzeża).
- Edytor regionu (geologia): koncentracja lądu, górzystość (tylko typy, które
  ją obsługują), udział lądu.
