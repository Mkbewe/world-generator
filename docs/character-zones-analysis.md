# Analiza: monolityczność wysp i geometria stref charakteru

Dokument zbiera zewnętrzną analizę obecnego etapu `StructureCharacterStage`
(strefy `whole` + jedna dodatkowa) oraz wnioski z niej płynące. Nie jest
zadaniem ani planem wdrożenia — to materiał do decyzji o modelu stref.

## 1. Dlaczego większość wysp jest monolityczna?

- **Agresywne bramkowanie losowości.** `zones.ts` odrzuca split, gdy
  `structureExtent < ZONE_EXTENT_THRESHOLD` **lub** `!random.chance(characterVariation)`.
  Przy domyślnym `characterVariation: 0.5` połowa struktur odpada od razu i
  dostaje tylko `whole`.
- **Maksymalnie 2 strefy na wyspę.** Nawet po przejściu warunku struktura
  dostaje wyłącznie jedną dodatkową strefę (`zone-1` i ewentualnie `zone-2`).
  Nie da się uzyskać 3 stref (np. góry w centrum, pagórki wokół, niziny na
  wybrzeżu).
- **Uboższe pule archetypów.** `elongated` ma tylko `['plains', 'hills']`
  (bez gór), a `lagoon` ma split `none` w 100%.

## 2. Dlaczego geometria stref („środek" albo „granica") słabo działa?

Obecne `zone-geometry.ts` operuje na płaskich figurach 2D w przestrzeni świata,
zamiast na szkielecie wyspy (graf węzłów / korytarz):

- **`center` jako okrąg wokół środka ciężkości.** `structureCentre` to średnia
  arytmetyczna pozycji węzłów. Dla wyspy podłużnej, wygiętej w łuk (C/U) albo
  rozgałęzionej środek wypada w zatoce, oceanie lub na pustym obszarze, a okrąg
  o promieniu `radiusFraction * extent` obejmuje losowy wycinek kształtu.
- **`half` jako prosta linia w osiach X/Y.** Cięcie nie podąża za krzywizną
  wyspy ani łańcuchem węzłów; dla wyspy po przekątnej wygląda jak odcięcie
  nożem. `along` i tak wybiera `x`/`y` po rozpiętości bounding boxa, a
  `HALF_WOBBLE` (0.05) jest zbyt subtelne, żeby to zamaskować.

## 3. Proponowany kierunek

### A. Geometria oparta o szkielet struktury

Zamiast ciąć wyspę figurami 2D, strefy powinny wynikać z budowy geologicznej:

- **Podział wzdłużny (chain)** — pierwsza połowa węzłów korytarza to jeden
  charakter, druga (lub odgałęzienia) inny.
- **Rdzeń vs obwód (spine / rim)** — pas przy osi szkieletu ma wyższy
  charakter (np. mountains), a bliżej zewnętrznego promienia przechodzi w
  hills/plains.
- **Prawdziwy center na grafie** — centralne węzły głównego łańcucha (np. od
  25% do 75% długości grzbietu).

### B. Większa elastyczność liczby stref

- Mała wyspa: 1 strefa (`whole`).
- Średnia wyspa: 2 strefy (podział na części albo rdzeń w środku).
- Duża wyspa: 2–3 strefy (góry w centrum grzbietu, pagórki po bokach, niziny
  na krańcach).
- Bazowa szansa splitu uzależniona od rozmiaru i liczby węzłów, nie tylko od
  stałego rzutu 50%.

## 4. Moje przemyślenia

**Zgadzam się z diagnozą techniczną.** Wszystkie cztery obserwacje z sekcji 1 i 2
są zgodne z kodem: bramka `characterVariation` faktycznie odsiewa połowę, model
tworzy najwyżej dwie strefy, `structureCentre` to średnia węzłów, a `half`/
`along` nie podążają za łańcuchem.

**Trzy niuanse, których analiza nie rozróżnia:**

1. **Pule `elongated` i `lagoon` to świadome decyzje, nie wada.** `elongated`
   bez gór oraz atol zawsze nizinny wynikają z ustalonego modelu. Nie traktuję
   ich jak „zubożenia" do naprawy.
2. **`center`/`half` są już współdzielone** przez malowanie i hit-test w jednym
   module `zone-geometry.ts` (`containsZone` + `clipZone`). Dzięki temu zmiana
   modelu jest tania po stronie podglądu.
3. **Kontrakt `ZoneGeometry` należy jednak do generatora (#219) i heightmapy
   (#57).** Przejście na geometrię szkieletową to zmiana umowy, nie tweak
   rendera: `HeightmapStage` musi umieć policzyć odległość do **odcinka
   łańcucha**, a nie do środka elipsy. Dlatego nowe warianty trzeba zaprojektować
   w kategoriach znormalizowanych (np. `chain: { from, to }`, `spine: { width }`),
   a nie rendererowych.

**Do propozycji A.** Kierunek dobry i mamy dane: `mainChainNodes` (główny
łańcuch vs gałęzie) oraz `structureSegments` (oś). Realizacja jest deterministyczna
i nie wymaga nowych danych wejściowych. `chain` zastąpiłby `half`, a `spine`
zastąpiłby `center` i naprawił przypadek „środek w oceanie".

**Do propozycji B.** Rozdzieliłbym dwie osie:

- **ile stref** — rosnące z rozmiarem i liczbą węzłów (1 / 2 / 2–3),
- **jaki charakter** — z puli, z preferencjami (rdzeń → góry, obwód → niziny).

**Brakuje decyzji o nakładaniu.** Dziś model tworzy `whole` + jedną strefę bez
nakładania, a komentarz w typach mówi, że heightmapa ma blendować „najbliższą".
Bez rozstrzygnięcia, czy strefy mogą się nakładać i jaka jest kolejność, nie da
się sensownie zaprojektować 3 stref.

**Brakuje też funkcji, nie tylko progu.** Analiza proponuje „zwiększyć bazową
szansę", a właściwym mechanizmem jest zależność liczby splitu od rozmiaru i
liczby węzłów; próg `ZONE_EXTENT_THRESHOLD` jest dziś prawie zawsze spełniony,
więc realnie decyduje wyłącznie rzut 50%.

**`edge`/`point` wpisać w nowy model.** Właśnie uruchomione warianty częściowo
adresują „obwód vs rdzeń"; w modelu szkieletowym powinny stać się `spine`/`rim`
albo pozostać jako pasma przy krawędzi.

## 5. Wnioski

- Diagnoza trafna; największa wartość to przejście z figur 2D na szkielet.
- Propozycja A to właściwy kierunek, B sensowna po rozstrzygnięciu nakładania
  i zależności od rozmiaru.
- Największe ryzyko to nie renderer, tylko kontrakt `ZoneGeometry` współdzielony
  z `HeightmapStage` (#57). To zadanie na #219/#57, nie na sam overlay podglądu.
