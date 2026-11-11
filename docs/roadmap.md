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

- **Pipeline** — etapy World shape, Macro regions, BaseClimate, Geology
  i Heightmap działają w workerze, z postępem, statystykami, selektywnym
  przeliczaniem i pamięcią sesji między widokami.
- **BaseClimate** — domyślny preset Ring world definiuje strefy ciepła; bazowa
  wilgotność i prądy dochodzą w tym samym etapie, a overlaye
  Heat zones, Moisture baseline i Ocean currents są dostępne w podglądzie.
- **Geologia** — świat dzieli się na prowincje o typie i charakterze
  (ordinary, volcanic, lagoon, fjord), z granicami, presetami i udziałami
  powierzchni; strefa ciepła w środku każdej formy wyspy wybiera wariant
  rzeźby, a `geologyCoupling` skaluje to dopasowanie.
- **Heightmapa** — rzeźba powstaje z form wysp na region: od archipelagu po
  jedną skupioną wyspę, z płaskimi i górzystymi masami, klifami, kraterami
  i lagunami; poziom wody jest stały w rastrze (bez suwaka poziomu morza),
  a wysepki pojawiają się tylko na płytkim szelfie przy brzegach.
- **Ustawienia** — formularze ogólne, World shape, Macro regions, BaseClimate,
  Geology i Heightmap; stan formularzy jest pamiętany, a spięcie zakładek
  z podglądem opcjonalne.
- **Podgląd** — katalog warstw World shape, Macro regions, Heat zones, Moisture,
  Ocean currents, Geology i Heightmap; dostępne są też nakładki, odczyt pod
  kursorem, zoom/pan, tryb pełnoekranowy, miarka i skala. Warstwy rysują się
  progresywnie, w rozdzielczości ekranu.
- **Statystyki** — czasy i metryki etapów oraz renderowania na osobnej stronie;
  dostępny jest eksport statystyk do JSON.

## 3. Rzeźba terenu — co zostaje — [częściowo]

- Kalibracja archetypów i wieku regionów po testach wzrokowych: kratery,
  pierścienie lagun, wcięcia fjordów, erozja starych regionów.
- Mierzalna walidacja wariacji wysp, spójności między rozdzielczościami oraz
  czasu i pamięci generowania.

## 4. Kolejne etapy pipeline'u — [planowane]

Etapy deklarują dane wejściowe i wyjściowe. Wykonanie respektuje te zależności;
sama pozycja etapu na liście nie oznacza zależności od wszystkich etapów przed
nim.

1. **Climate** — ciągła temperatura, wilgotność, hydrologia i woda; gradienty
   stref, wpływ wysokości, wiatru i cienia opadowego.
2. **Formacje terenu** — klify, plaże, doliny i płaskowyże wynikające z nachyleń.
3. **Biomy** — klasyfikacja z warunków środowiskowych, z wariantami gameplayowymi
   zależnymi od zagrożenia regionu.
4. **Lokacje** — punkt startowy, zasoby, przeciwnicy i nagrody.

## 5. Presety świata i geografia — [planowane]

Główne presety świata (m.in. topologia, strefy ciepła i zagrożenie) oraz presety
geografii (lista prowincji) będą niezależnymi wyborami, które można łączyć
i edytować. To presety całego świata, a nie presety pojedynczych formularzy
etapów. Na start kilka gotowych światów i geografii, później tryb zaawansowany.

## 6. Topologia i krawędzie — [planowane]

Na razie dysk albo prostokąt bez zawijania. Docelowo: świat cylindryczny
z bezszwowym zawijaniem, konfigurowalne krawędzie (klif, ocean, lodowa ściana)
oraz spójna okresowość szumu i sąsiedztw.

## 7. Eksploracja i eksport — [częściowo]

- **Eksploracja** — prosta podstrona zwiedzania świata z kamerą i znacznikiem
  postaci; to demo, nie silnik gry [planowane].
- **Eksport** — eksport statystyk do JSON działa. Eksport paczki danych dla
  Godota (rastry i manifest z seedem, wymiarami, warstwami i lokacjami) oraz
  eksport warstw mapy pozostają planami; nie ma jeszcze integracji z Godotem.

## 8. Wydajność i pamięć — [częściowo]

Podgląd rysuje w rozdzielczości okna i nie trzyma pełnowymiarowych canvasów.
Otwarte tematy: kopie danych przy `postMessage` (albo SharedArrayBuffer),
budżet pamięci cache warstw, reużycie workera i — dopiero po pomiarach —
przeniesienie ciężkiego rysowania na WebGL/WebGPU. Wyniki researchu i propozycja
etapowego prototypu: [renderer GPU](./map-renderer-gpu-proposal.md).

## 9. Pozostałe kierunki — [planowane / odłożone]

- Odświeżanie podglądu po zmianie kontrolek (odłożone).
- Odświeżenie wyglądu shella i ewentualne dekoracyjne tło.
- Udostępnianie świata linkiem, samouczek i strona o projekcie.
- Wsparcie innych języków interfejsu (odległe).
- `legacy-generator` pozostaje w projekcie do odwołania. To świadoma decyzja
  produktowa, nie dług do spłaty: nie zgłaszać jego usunięcia ani odłączenia
  w review, dopóki użytkownik nie zdecyduje inaczej.
