import { createReadoutRegistry, createReadoutRenderer } from '@readout';
import { READOUT_DEFINITIONS } from '@readout/sources/manifest';

/** Composition root: the registry is built once and injected into the renderer. */
export const readoutRegistry = createReadoutRegistry(READOUT_DEFINITIONS);

export const readoutItems = createReadoutRenderer(readoutRegistry);
