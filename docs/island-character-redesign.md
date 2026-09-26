# Plan wdrożenia — StructureCharacterStage redesign

## Zakres

Tylko `structure-character/` i `types.ts`. Kod poza tym zakresem się nie zmienia.
HeightmapStage nie istnieje — nie trzeba go teraz tykać.

---

## Kroki

### 1. `types.ts` — nowe typy, stare do usunięcia

**Dodać:**
```ts
export type TerrainCharacter = 'plains' | 'hills' | 'mountains';

export type ZoneGeometry =
  | { readonly kind: 'whole' }
  | { readonly kind: 'half'; readonly axis: 'along' | 'x' | 'y'; readonly side: 'low' | 'high' }
  | { readonly kind: 'center'; readonly radiusFraction: number }
  | { readonly kind: 'edge';   readonly widthFraction: number }
  | { readonly kind: 'point';  readonly center: WorldPoint; readonly influenceRadius: number };

export interface CharacterZone {
  readonly id: string;
  readonly structureId: string;
  readonly character: TerrainCharacter;
  readonly geometry: ZoneGeometry;
  /** Concrete field values sampled within the character's ranges. */
  readonly values: TerrainProfile;
}
```

**Usunąć z `MapState`:**
```ts
structureProfiles?: readonly StructureTerrainProfile[];
structureRegions?: readonly StructureRegionDefinition[];
```

**Dodać do `MapState`:**
```ts
structureZones?: readonly CharacterZone[];
```

**Typy:**
- `TerrainProfile` — zostaje jako zestaw wartości strefy (`CharacterZone.values`),
- `StructureTerrainProfile`, `StructureRegionDefinition` — `@deprecated`, do usunięcia przy HeightmapStage.

---

### 2. Nowy plik: `character-ranges.ts`

Zakresy wartości heightmapy per `TerrainCharacter`. Każdy zakres to `[min, max]`.

```ts
export type CharacterRanges = {
  // primary
  elevation: [number, number];
  roughness: [number, number];
  mountainStrength: [number, number];
  hillStrength: [number, number];
  // feature (not a character)
  plateauStrength: [number, number];
  // secondary (derived)
  lakePotential: [number, number];
  erosionStrength: [number, number];
  coastalCliffStrength: [number, number];
};

export const CHARACTER_RANGES: Record<TerrainCharacter, CharacterRanges> = {
  plains:    { elevation: [0.40, 0.60], roughness: [0.10, 0.30],
               mountainStrength: [0.00, 0.10], hillStrength: [0.00, 0.20], plateauStrength: [0.00, 0.15],
               lakePotential: [0.30, 0.80], erosionStrength: [0.10, 0.30], coastalCliffStrength: [0.00, 0.20] },
  hills:     { elevation: [0.45, 0.65], roughness: [0.30, 0.50],
               mountainStrength: [0.00, 0.20], hillStrength: [0.50, 0.90], plateauStrength: [0.00, 0.20],
               lakePotential: [0.10, 0.40], erosionStrength: [0.20, 0.50], coastalCliffStrength: [0.00, 0.30] },
  mountains: { elevation: [0.60, 0.90], roughness: [0.60, 1.00],
               mountainStrength: [0.70, 1.00], hillStrength: [0.00, 0.30], plateauStrength: [0.00, 0.15],
               lakePotential: [0.00, 0.10], erosionStrength: [0.30, 0.70], coastalCliffStrength: [0.20, 0.60] },
};

// Lagoon / atoll: plains with the features kept minimal, so the ring land is flat.
export const LAGOON_RANGES: CharacterRanges = {
  ...CHARACTER_RANGES.plains,
  lakePotential: [0.00, 0.05],
  coastalCliffStrength: [0.00, 0.05],
  erosionStrength: [0.05, 0.15],
};
```

---

### 3. Nowy plik: `archetype-pools.ts`

Pule dozwolonych charakterów, podziałów i reguł per archetype. Całe zachowanie
siedzi w danych — brak `if`-ów na archetyp/typ splitu w generatorze.

```ts
export type ZoneSplit = 'none' | 'half' | 'center' | 'edge' | 'point';

export type ArchetypePool = {
  readonly characters: readonly TerrainCharacter[];
  readonly splits: readonly { split: ZoneSplit; weight: number }[];
  /** Nadpisanie zakresów (lagoon = płaska nizina bez jezior/klifów). */
  readonly ranges?: CharacterRanges;
  /** Stała oś splitu; brak = struktura losuje x/y. */
  readonly splitAxis?: 'along' | 'x' | 'y';
  /** Preferowani drudzy charaktery dla splitu center/half. */
  readonly centerSecondary?: readonly TerrainCharacter[];
  readonly halfSecondary?: readonly TerrainCharacter[];
};

export const ARCHETYPE_POOLS: Record<LandmassArchetype, ArchetypePool> = {
  lagoon: {
    characters: ['plains'],   // ranges handled by LAGOON_RANGES, never split
    splits: [{ split: 'none', weight: 1.0 }],
    ranges: LAGOON_RANGES,
  },
  round: {
    characters: ['plains', 'hills', 'mountains'],
    splits: [{ split: 'half', weight: 0.5 }, { split: 'center', weight: 0.5 }],
    centerSecondary: ['mountains', 'hills'], halfSecondary: ['plains', 'hills'],
  },
  irregular: {
    characters: ['plains', 'hills', 'mountains'],
    splits: [
      { split: 'half', weight: 0.45 }, { split: 'center', weight: 0.3 },
      { split: 'edge', weight: 0.15 }, { split: 'point', weight: 0.1 },
    ],
    centerSecondary: ['mountains', 'hills'], halfSecondary: ['plains', 'hills'],
  },
  elongated: {
    characters: ['plains', 'hills'],   // no mountains
    splits: [{ split: 'half', weight: 0.8 }, { split: 'center', weight: 0.2 }],
    splitAxis: 'along', centerSecondary: ['hills', 'plains'],
    halfSecondary: ['plains', 'hills'],
  },
  branched: {
    characters: ['plains', 'hills', 'mountains'],
    splits: [
      { split: 'half', weight: 0.4 }, { split: 'center', weight: 0.3 },
      { split: 'edge', weight: 0.15 }, { split: 'point', weight: 0.15 },
    ],
    centerSecondary: ['mountains', 'hills'], halfSecondary: ['plains', 'hills'],
  },
};
```

---

### 4. Nowy plik: `zones.ts`

Zastępuje `profiles.ts` i `regions.ts`. Eksportuje `buildZones`.

```ts
export function buildZones(
  structures: readonly GeologicalStructure[],
  config: StructureCharacterConfig,
  random: SeededRandom
): CharacterZone[]

// wewnętrznie:
// - losuje character jednostajnie z puli archetypu
// - buduje strefę 'whole' z wylosowanymi wartościami pól
// - jeśli struktura ≥ ZONE_EXTENT_THRESHOLD (0.02) i characterVariation wylosuje
//   split: buduje drugą strefę (half/center) z innym charakterem
// - dla lagoon: LAGOON_RANGES zamiast CHARACTER_RANGES['plains'], bez splitu
```

---

### 5. Usunąć stare pliki

- `profiles.ts` → **usunąć**
- `regions.ts` → **usunąć**
- `tendencies.ts` → **usunąć** (zastąpiony przez `archetype-pools.ts` i `character-ranges.ts`)

---

### 6. `stage.ts` — podmiana outputs

```ts
// Przed:
const structureProfiles = buildProfiles(...)
const structureRegions = buildRegions(...)
return { structureProfiles, structureRegions }

// Po:
const structureZones = buildZones(layout.structures, config, random)
return { structureZones }
```

Zaktualizować `writes`, `validate` i `summarize`.

---

### 7. `character-check.ts` — nowa walidacja

Usunąć `isStructureProfile`, `isStructureRegion`, `isStructureProfiles`, `isStructureRegions`, `validateCharacter` w obecnej formie.

Dodać:
```ts
export function validateZones(
  zones: readonly CharacterZone[],
  layout: LandmassLayout,
  shape: WorldShape
): void
// - każda struktura ma co najmniej jedną strefę 'whole'
// - każdy structureId istnieje w layout
// - point centers są wewnątrz world shape
// - radiusFraction/widthFraction są w 0..1
```

---

### 8. Testy

| Stary plik | Nowy plik | Co sprawdzić |
|---|---|---|
| `profiles.test.ts` | `zones.test.ts` | character losowany z puli archetypów; lagoon = zawsze plains; wartości w 0..1; determinizm seeda |
| `regions.test.ts` | wchłonięte do `zones.test.ts` | duże struktury dostają split; małe nie; split geometry poprawna |
| `stage.test.ts` | bez zmian struktury | outputs to `structureZones`, validate przechodzi |

---

## Kolejność

```
1 → 2 → 3 → 4 → (5 po ukończeniu 4) → 6 → 7 → 8
```

Kroki 2 i 3 można pisać równolegle. Krok 5 (usunięcie starych plików) dopiero gdy `zones.ts` i `stage.ts` działają i testy przechodzą.
