/** Maximum number of geological areas in one configuration. */
export const MAX_GEOLOGICAL_AREAS = 20;

/** Influence radius range in normalized world units. */
export const MIN_AREA_EXTENT = 0.04;
export const MAX_AREA_EXTENT = 0.6;

/** Uplift wavelength range in metres. */
export const MIN_UPLIFT_SCALE_METERS = 100;
export const MAX_UPLIFT_SCALE_METERS = 4000;

/**
 * Local seabed offset range in metres, relative to the global ocean base; a
 * negative offset deepens the area, a positive one shallows it.
 */
export const MIN_SEABED_OFFSET_METERS = -400;
export const MAX_SEABED_OFFSET_METERS = 200;

/** Shallow apron width range in metres; 0 leaves the area without a shelf. */
export const MIN_SHELF_WIDTH_METERS = 0;
export const MAX_SHELF_WIDTH_METERS = 1500;

/** Provenance index of a cell outside every geological area. */
export const PROVENANCE_OUTSIDE = -1;
