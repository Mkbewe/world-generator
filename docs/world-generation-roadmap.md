# World generation roadmap

Aplikacja jest narzędziem deweloperskim: generuje i podgląda proceduralne światy,
a docelowa gra powstanie w Godocie. Ten dokument zbiera ogólny kierunek rozwoju;
szczegóły implementacji żyją w kodzie i zadaniach, nie tutaj.

Legenda: **[działa]** — używane w aplikacji, **[częściowo]** — fundament jest,
**[planowane]** — brak implementacji, **[odłożone]** — poza aktywnym planem.

## 1. Zasady — [działa]

- Generator to rozszerzalny pipeline niezależny od renderowania i UI; kolejność
  etapów jest zdefiniowana w jednym miejscu.
- Świat używa jednego układu współrzędnych i jednej miary odległości; jeden seed
  daje niezależne, nazwane strumienie losowości dla etapów.
- Rozdzielczość danych nie określa fizycznego rozmiaru świata: świat ma metry,
  a podgląd i eksport to wizualizacje tych samych danych.
- Etapy deklarują wejścia i wyjścia; zmiana konfiguracji przelicza tylko
  potrzebne etapy, a generowanie działa w tle (Web Worker).

## 2. Stan: co już działa

- **Pipeline** — etapy World shape, Macro regions, Geology i Heightmap działają
  w workerze, z postępem, statystykami, selektywnym przeliczaniem i pamięcią
  sesji między widokami.
- **Geologia** — świat dzieli się na prowincje o typie i charakterze
  (ordinary, volcanic, lagoon, fjord), z granicami, presetami i udziałami
  powierzchni; parametry rzeźby regionu wędrują do planu geologii.
- **Heightmapa** — rzeźba powstaje z form wysp na region: od archipelagu po
  jedną skupioną wyspę, z płaskimi i górzystymi masami, klifami, kraterami
  i lagunami; poziom wody jest stały w rastrze (bez suwaka poziomu morza),
  a wysepki pojawiają się tylko na płytkim szelfie przy brzegach.
- **Ustawienia** — zakładka na etap: kształt i rozmiar świata, makroregiony,
  geologia (typ regionu) oraz heightmapa (rzeźba globalna i suwaki regionów);
  stan formularzy jest pamiętany, a spięcie zakładek z podglądem opcjonalne.
- **Podgląd** — katalog warstw (shape, macro, geology, heightmap), nakładki,
  odczyt pod kursorem, zoom/pan, tryb pełnoekranowy, miarka i skala; warstwy
  rysują się progresywnie, w rozdzielczości ekranu.
- **Statystyki** — czasy i metryki etapów oraz renderowania, osobna strona
  statystyk.

## 3. Rzeźba terenu — co zostaje — [częściowo]

- Kalibracja archetypów i wieku regionów po testach wzrokowych: kratery,
  pierścienie lagun, wcięcia fjordów, erozja starych regionów.
- Mierzalna walidacja wariacji wysp, spójności między rozdzielczościami oraz
  czasu i pamięci generowania.

## 4. Kolejne etapy pipeline'u — [planowane]

Kolejność może się jeszcze zmienić; każdy etap czyta wyniki poprzednich.

1. **Klimat** — temperatura, opady i wilgotność; maska lądu wynika z heightmapy.
2. **Hydrologia** — rzeki, jeziora i zlewiska z wysokości i opadów.
3. **Formacje terenu** — klify, plaże, doliny i płaskowyże wynikające z nachyleń.
4. **Biomy** — klasyfikacja z warunków środowiskowych, z wariantami gameplayowymi
   zależnymi od zagrożenia regionu.
5. **Lokacje** — punkt startowy, zasoby, przeciwnicy i nagrody.

## 5. Presety świata i geografia — [planowane]

Preset świata (topologia, strefy klimatyczne, zagrożenie) i preset geografii
(lista prowincji) będą niezależnymi wyborami, które można łączyć i edytować.
Na start kilka gotowych światów i geografii, później tryb zaawansowany.

## 6. Topologia i krawędzie — [planowane]

Na razie dysk albo prostokąt bez zawijania. Docelowo: świat cylindryczny
z bezszwowym zawijaniem, konfigurowalne krawędzie (klif, ocean, lodowa ściana)
oraz spójna okresowość szumu i sąsiedztw.

## 7. Eksploracja i eksport — [planowane]

- Prosta podstrona zwiedzania świata z kamerą i znacznikiem postaci; to demo,
  nie silnik gry.
- Eksport paczki danych dla Godota (rastry i manifest z seedem, wymiarami,
  warstwami i lokacjami) jako pomysł na przyszłość, bez integracji.

## 8. Wydajność i pamięć — [częściowo]

Podgląd rysuje w rozdzielczości okna i nie trzyma pełnowymiarowych canvasów.
Otwarte tematy: kopie danych przy `postMessage` (albo SharedArrayBuffer),
budżet pamięci cache warstw, reużycie workera i — dopiero po pomiarach —
przeniesienie ciężkiego rysowania na WebGL/WebGPU.

## 9. Pozostałe kierunki — [planowane / odłożone]

- Odświeżanie podglądu po zmianie kontrolek (odłożone).
- Odświeżenie wyglądu shella i ewentualne dekoracyjne tło.
- Udostępnianie świata linkiem, samouczek i strona o projekcie.
- Wsparcie innych języków interfejsu (odległe).
