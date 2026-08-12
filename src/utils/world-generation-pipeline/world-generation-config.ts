export interface WorldConfig {
  width: number;
  height: number;
  seed: number;
}

export interface SeededWorldConfig {
  world: {
    seed: number;
  };
}

export interface NoiseConfig {
  /** Number of base noise cycles across the normalized world space. */
  frequency: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
}

export interface WorldGeneratorConfig extends SeededWorldConfig {
  world: WorldConfig;
  noise: NoiseConfig;
}
