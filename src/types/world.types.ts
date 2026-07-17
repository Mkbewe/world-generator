export interface Params {
  largeCount: number;
  mediumCount: number;
  smallCount: number;
  islandSize: number;
  groupChance: number;
  seaLevel: number;
  roughness: number;
  seed: string;
}

export interface IslandPosition {
  x: number;
  y: number;
  type: 'LARGE' | 'MEDIUM' | 'SMALL';
}

export interface IslandCenter {
  x: number;
  y: number;
  radius: number;
  boost: number;
}
