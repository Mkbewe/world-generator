# User Guide

World Generator is a browser-based tool for creating and inspecting procedural
world maps. This guide describes the features currently available in the app.

## Generate a world

1. In **General**, enter a seed or choose **Randomize**. Reusing the same seed
   and settings produces a reproducible world.
2. In **World Shape**, choose a disc or rectangle, set the world size, and
   select terrain detail. Size presets are 3, 6, and 12 km; custom sizes range
   from 3 to 12 km. Terrain detail choices are 1, 2, 4, 8, or 16 m per sample.
   Finer detail creates a larger grid and takes more memory and time.
3. Configure **Macro Regions**, **BaseClimate**, **Geology**, and **Heightmap**.
   Preset controls, where available, configure that settings section. They are
   not presets for the complete world.
4. Choose **Generate** to apply the current settings. The progress panel below
   the map shows the active stage and its progress. Changing settings does not
   automatically regenerate the map.

The app estimates the grid and its generation-memory cost. If the requested
detail exceeds the shared sample budget, the grid is limited and the form
shows a warning; the requested physical world size is retained.

## Inspect the map

Use the layer tabs to view **World Shape**, **Macro Regions**, **Heat Zones**,
**Moisture**, **Ocean Currents**, **Geology**, or **Heightmap**. Toggle available
overlays in the sidebar; an overlay may be unavailable for some base layers.

The cursor readout in the sidebar shows information for the map position under
the pointer. Click or tap the map to pin the readout. Click or tap again to
resume following the pointer.

Use **Measure** in the sidebar controls to measure a path: click to add points,
right-click to finish, right-click again to clear, and press **Backspace** to
undo the last point.

The fullscreen control is in the page header. In fullscreen, use the mouse
wheel or the sidebar zoom controls to zoom, drag the map to pan, and use reset
to fit the whole map in view. Leaving fullscreen restores the fitted view.

## Statistics and export

After generating a world, open **Statistics** to see generation and rendering
metrics. Use **Export** on that page to download the statistics as JSON.
Generated map data and statistics are kept in memory while navigating the app;
refreshing the page clears them.

## Current scope

The current climate data includes heat zones, baseline moisture, and ocean
currents. Continuous climate simulation, hydrology, biomes, whole-world preset
selection, map-layer export, and a Godot data package are not currently
available.
