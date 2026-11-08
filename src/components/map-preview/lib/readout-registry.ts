import { createReadoutRegistry, createReadoutRenderer } from '../../../utils/map-readout';
import { READOUT_DEFINITIONS } from '../../../utils/map-readout/sources/manifest';

/** Composition root: the registry is built once and injected into the renderer. */
export const readoutRegistry = createReadoutRegistry(READOUT_DEFINITIONS);

export const readoutItems = createReadoutRenderer(readoutRegistry);
