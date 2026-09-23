# Podgląd ciała struktury landmass

Ten dokument doprecyzowuje `docs/landmass-layout-refactor-plan.md` (§11.2 i
§11.3). Oś szkieletu nadal jest kanoniczną łamaną z modelu (nody + control
pointy). Tutaj ustalony jest sposób, w jaki z tej osi powstaje **ciało** w
podglądzie technicznym.

## 1. Żebra

Żebro to odcinek prostopadły do lokalnej stycznej osi, o długości wynikającej z
promienia wpływu w tym miejscu.

- Na każdym prawdziwym `LandmassNode` jest żebro konstrukcyjne (wyraźniejsze).
- Między dwoma sąsiednimi nodami widać **co najwyżej jedno albo dwa** dodatkowe
  żebra. Control pointy osi mogą być gęstsze — służą przebiegowi łamanej i
  gładkości obrysu, ale nie dostają własnej poprzeczki.
- Control pointy osi pozostają niewidoczne jako kropki.
- Obrys ciała interpoluje próbki osi (nody i control pointy). Widoczne żebra
  tylko kotwiczą ten obrys i nie muszą pokrywać każdej próbki.

Nie wolno skracać pojedynczego żebra „na sztywno” tylko dlatego, że lokalny łuk
jest ciasny. Takie wgniatanie daje wklęsły obrys zbiegający do jednej krótkiej
poprzeczki i fałszuje szerokość zapisaną w modelu. Jeśli korytarz jest za szeroki
na krzywiznę, problem należy rozwiązać w generatorze (promień albo przebieg osi),
a nie w painterze.

## 2. Krzywa obrysu

Między kolejnymi próbkami osi po tej samej stronie rysowana jest **jedna
gładka krzywa** (Catmull–Rom, w praktyce jako cubic Bézier). Widoczne żebra
wypadają na części tych próbek i zawsze trafiają w obrys.

- Lewa strona żeber → lewy rail.
- Prawa strona żeber → prawy rail.
- Krzywa przechodzi przez końce żeber, więc żebro zawsze dotyka ciała.
- Między żebrami krzywa może się wyginać; nie wolno zastępować jej łamaną
  trapezów ani mozaiką paneli.

Oś szkieletu **nie** może być osobno wygładzana innym splajnem niż łamana z
modelu. Wygładzanie dotyczy wyłącznie obrysu ciała, czyli krzywej przez końce
żeber.

## 3. Ciało to tylko kolorowanie obrysu

Ciało jest wypełnieniem obszaru ograniczonego krzywymi raili i skrajnymi
żebrami (albo szwem pierścienia). To jest kolorowanie już wyliczonej ścieżki, a
nie drugi model geometrii.

Zabronione:

- unia elips / kapsuł w każdym punkcie osi,
- osobny wielokąt fill na każdą krawędź albo każdą parę żeber,
- doliczanie powierzchni „na styk” z fillu, niezależnie od obrysu.

Painter:

1. zbiera próbki osi wzdłuż łańcucha,
2. buduje lewą i prawą krzywą przez te próbki,
3. otwarty korytarz: jedna ścieżka (lewy rail, żebro końcowe, prawy rail wstecz)
   plus zaokrąglone kapiele na końcach (elipsa wpływu pierwszego i ostatniego
   noda) — to nie jest unia kapsuł wzdłuż całej osi,
4. pierścień: dwie zamknięte krzywe raili, wypełnione regułą even-odd, żeby szew
   (ostatni segment) był częścią ciała tak samo jak pozostałe,
5. obrysowuje obie krzywe delikatnym strokiem.

Hit testing, kolizje i placement nadal używają kapsuł na kanonicznej łamanej.
Podgląd ciała może być wizualnie gładszy między żebrami, ale nie może pokazywać
innej osi ani innych promieni niż model.

## 4. Pierścień (atoll)

Zamknięty korytarz musi być **okresowy**: koniec osi, styczna i szerokość mają
pasować do początku.

- Nie wolno „sklejać” pierścienia przez nadpisanie ostatniego punktu pierwszym.
  Taki szew zostawia haczyk, załamanie inner rail i control point leżący na
  pierwszym nodzie.
- Control pointy krawędzi zamykającej nie mogą pokrywać się z nodami końców.
- Żebra i krzywa obrysu obchodzą pierścień bez dziury w fillu na szwie.

Otwarta laguna (łuk C) pozostaje otwarta: końce są prawdziwymi kapielami, nie
szwem.

## 5. Czytelność

- Fill i pomocnicze żebra mają wyraźnie mniejszy kontrast niż oś i nody.
- Dodatkowe żebra są legalne, ale nie mogą zamienić podglądu w wachlarz paneli:
  ciało czyta się z krzywej, żebra tylko ją kotwiczą.
- Przy zoomie 1× i dużym przybliżeniu widać: kropki, oś, żebra, gładki obrys i
  spokojne wypełnienie — bez kul, siatki i wgłębień do jednego żebra.
