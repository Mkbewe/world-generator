# Changelog

## [0.8.1](https://github.com/Mkbewe/world-generator/compare/v0.8.0...v0.8.1) (2026-09-21)

### Features

* **[324](https://github.com/Mkbewe/world-generator/issues/324):** allow zooming out and free panning in the preview ([#326](https://github.com/Mkbewe/world-generator/issues/326)) ([f5e9165](https://github.com/Mkbewe/world-generator/commit/f5e916560cd56b053b57bfa07c1a92e79ae0086e))

  - keep the default zoom at 1 and allow zooming out to the 0.5 minimum
  - derive the zoom steps and control limits from the scale constants
  - pan the map by a fixed viewport fraction at any zoom, including fit
  - track the fitted placement in the renderer state so Reset unlocks on
  pan

### Bug Fixes

* **[279](https://github.com/Mkbewe/world-generator/issues/279):** keep generation running across page navigation ([#328](https://github.com/Mkbewe/world-generator/issues/328)) ([3b06d33](https://github.com/Mkbewe/world-generator/commit/3b06d33184c3353911303606284c3197ec263af5))

  - own the run in a shared session that outlives the preview
  - attach/detach the renderer instead of cancelling the run on unmount
  - replay collected layers to a renderer attached mid-run and restore the
  snapshot after
  - keep progress and the preview selection in their stores so the UI
  resumes on return
  - prepare replayed layers silently so they do not walk the preview tabs
* **[306](https://github.com/Mkbewe/world-generator/issues/306):** keep the world boundary stroke outside the map ([#329](https://github.com/Mkbewe/world-generator/issues/329)) ([b926893](https://github.com/Mkbewe/world-generator/commit/b926893513818ce513f04ca612b54cfb90e772da))

  - reserve a presentation padding so the stroke fits at the canvas edge
  - offset the boundary path outward so the line hugs the coloured edge
  from outside
  - share the padding between the view target, layer buffers and the
  overlay
  - take the pointer projection from the view target instead of the canvas
  - drop the canvas overscan and inline placement
* **[322](https://github.com/Mkbewe/world-generator/issues/322):** rework the macro region preset picker and layout state ([#325](https://github.com/Mkbewe/world-generator/issues/325)) ([4a05698](https://github.com/Mkbewe/world-generator/commit/4a05698bf9afd4624b7ba0d0401072fb431cb33f))

  - replace the preset toggle buttons with radio cards
  - track the chosen preset in the store and clear it on every manual edit
  - do not re-select a preset when edited values match it again
  - keep the distribution shares when switching the base layout
  - remove the value-based active preset matching

### Performance Improvements

* **[287](https://github.com/Mkbewe/world-generator/issues/287):** fix the laggy boundary drag in the macro region form ([#323](https://github.com/Mkbewe/world-generator/issues/323)) ([6fa2b69](https://github.com/Mkbewe/world-generator/commit/6fa2b696159bd50d2942bb6d474df36120d33d5d))

  - preview boundaries in a local draft and commit once on pointer up
  - cache the distribution track rect on pointer down
  - memoize the active preset derivation
  - keep the region card percentages live during a drag
  - split the form into one component per folder with colocated tests
  - move the irregularity helpers into lib/

## [0.8.0](https://github.com/Mkbewe/world-generator/compare/v0.7.0...v0.8.0) (2026-09-20)

### Features

* **[319](https://github.com/Mkbewe/world-generator/issues/319):** render boundaries from shared geometry ([#320](https://github.com/Mkbewe/world-generator/issues/320)) ([4eeb7ad](https://github.com/Mkbewe/world-generator/commit/4eeb7ad20e411776a7a18ff0a4ef41e1db85e8f3))

  - share the macro-region classifier between generation and painting
  - sample region, world and clipped edges with coverage at screen
  resolution
  - draw the world outline and fill from one path
  - store the region geometry in the snapshot for identical restored maps
  - composite progressive stage tiles and finish frames before catching up
  - paint every layer at display resolution and drop the 1 px per cell
  path
  - precompute boundary cells in one pass and count them in layer buffers

### Performance Improvements

* **[158](https://github.com/Mkbewe/world-generator/issues/158):** release the layer stage buffer after commit ([#318](https://github.com/Mkbewe/world-generator/issues/318)) ([c19181a](https://github.com/Mkbewe/world-generator/commit/c19181aec8f17cd3a506e80f993bd1a0affa44d5))

  - free the in-flight stage buffer once a frame is committed, or when the
  render is aborted, so a layer at rest keeps only its frame and overview
  - document the smaller at-rest buffers in the roadmap and performance
  notes
  - align the statistics page copy with the viewport buffers: pixel ratio,
  first tile, buffer resolution and at-rest sizes
* **[285](https://github.com/Mkbewe/world-generator/issues/285):** render layers at the viewport resolution ([#316](https://github.com/Mkbewe/world-generator/issues/316)) ([5cb3b87](https://github.com/Mkbewe/world-generator/commit/5cb3b87972ad72de69a68e978078595d06ec0544))

  - draw layers and the presentation into a viewport-sized buffer with a
  1.5x margin instead of full-resolution canvases
  - keep a stable frame and an in-flight stage buffer per layer, so a
  render never wipes the displayed image
  - paint a small whole-map overview under the sharp frame while the view
  outruns the buffer
  - repaint on pan, zoom and resize, aborting outdated renders and
  coalescing rapid changes, and release the render state after aborts
  - split the view math into preview-targets, layer-presenter and
  pointer-sampling modules
  - document the new renderer memory model in the roadmap and the
  performance notes
* **[315](https://github.com/Mkbewe/world-generator/issues/315):** filter viewport sampling and cap layer buffers ([#317](https://github.com/Mkbewe/world-generator/issues/317)) ([765fc74](https://github.com/Mkbewe/world-generator/commit/765fc74f9a26f1885da15873cc1e474088f9f15c))

  - render magnified layers at one pixel per cell and let the display
  scale them up, so small maps and zoomed views keep small buffers
  - average a sample grid for float layers when minifying, skipping cells
  outside the clip mask; keep masks and discrete palettes nearest
  - report source and output resolutions and estimated buffer bytes per
  layer in the render statistics
  - allow panning a quarter of the viewport past the map edge when zoomed,
  fading in so zooming out never snaps the centre
  - document the sampling and buffer model in the roadmap and performance
  notes

## [0.7.0](https://github.com/Mkbewe/world-generator/compare/v0.6.0...v0.7.0) (2026-09-17)

### Features

* **[262](https://github.com/Mkbewe/world-generator/issues/262):** open the preview in a fullscreen overlay ([#295](https://github.com/Mkbewe/world-generator/issues/295)) ([490ded7](https://github.com/Mkbewe/world-generator/commit/490ded77e4455db4318048d6aa96c05005d1f40b))

  - add a fullscreen toggle and badges to the header and lock the body
  scroll
  - stretch the preview to the viewport, drop the card chrome and center
  the layer strip
  - float the panels over the map with collapse and top/middle/bottom
  anchors
  - keep the cursor readout while the pointer is over the panels
  - keep fullscreen desktop-only, with the panels flowing below the map on
  mobile
  - extract the panels, their header and the layer views into MapPanels
* **[263](https://github.com/Mkbewe/world-generator/issues/263):** keep focus inside the fullscreen preview ([#298](https://github.com/Mkbewe/world-generator/issues/298)) ([b8a7ca0](https://github.com/Mkbewe/world-generator/commit/b8a7ca0976fcc570a4a5c7f3f89149e5e6119ac4))

  - move focus into the preview overlay when fullscreen opens
  - keep the page behind the overlay out of the tab order with inert
  - cover the overlay focus, the trigger focus return and the inert
  background
* **[264](https://github.com/Mkbewe/world-generator/issues/264):** render the map at the viewport resolution ([#305](https://github.com/Mkbewe/world-generator/issues/305)) ([92e2ab3](https://github.com/Mkbewe/world-generator/commit/92e2ab376be2c4a6098c70cb609e589bc3bbe1d9))
* **[289](https://github.com/Mkbewe/world-generator/issues/289):** refresh the preview layout and empty state ([#290](https://github.com/Mkbewe/world-generator/issues/290)) ([6d19871](https://github.com/Mkbewe/world-generator/commit/6d198718164532e6ee16a66adf44e631dff4a925))

  - move the cursor readout into a card pinned to the sidebar footer
  - replace the layer tabs with a vertical icon strip
  - style the overlays section as a card with an icon
  - drop the gray square and frame around the map
  - add a slowly spinning placeholder before the first generation
  - tighten the panel gap and keep the crosshair only once a map exists
* **[299](https://github.com/Mkbewe/world-generator/issues/299):** draw the world boundary analytically ([#301](https://github.com/Mkbewe/world-generator/issues/301)) ([d5a89b1](https://github.com/Mkbewe/world-generator/commit/d5a89b1cf4e460bcfa9e0e70f2eb669d2a23b95c))

  - stroke the disc and rectangle at display resolution instead of tracing
  mask cells
  - pass the world shape from the config and from restored snapshots to
  the overlay renderer
  - make the world shape required in the config with a single default
  constant
  - keep the cell trace as a fallback for renderers without a known shape
* **[64](https://github.com/Mkbewe/world-generator/issues/64):** add fullscreen zoom and pan to the preview ([#307](https://github.com/Mkbewe/world-generator/issues/307)) ([215e743](https://github.com/Mkbewe/world-generator/commit/215e74346a5d7d9e248c4289eb8edd38dff1bdc2))

  - model the view as a normalized transform (1x-4x, centre) and project
  the map into the canvas preserving its aspect ratio
  - zoom with the wheel at the cursor or with the minus/plus steps in the
  fullscreen View section
  - pan with a drag (mouse and touch), while a tap or click pins the
  readout
  - fill the fullscreen workspace with the canvas so zooming reveals more
  of the map, and reset the view when the mode closes
  - widen the world boundary to 3 px and separate the panel sections
  - measure the viewport synchronously so entering fullscreen no longer
  paints a stretched frame

### Bug Fixes

* **[302](https://github.com/Mkbewe/world-generator/issues/302):** lock the page scroll on the html element in fullscreen ([#303](https://github.com/Mkbewe/world-generator/issues/303)) ([0eb59f7](https://github.com/Mkbewe/world-generator/commit/0eb59f72f56be1d53235ff2503a53ecf0abf43ca))

### Documentation

* sync the roadmap and add generator performance notes ([#291](https://github.com/Mkbewe/world-generator/issues/291)) ([d8d6158](https://github.com/Mkbewe/world-generator/commit/d8d6158a40da23b0db4530c53aef32681ae60bd2)), references [#285](https://github.com/Mkbewe/world-generator/issues/285) [#158](https://github.com/Mkbewe/world-generator/issues/158) [#288](https://github.com/Mkbewe/world-generator/issues/288)

  - reference the split preview tasks (#285, #158) in the performance
  section
  - describe the planned shell refresh (#288) and its out-of-scope items
  - add notes about data formats, memory copies and stage costs

### Code Refactoring

* **[294](https://github.com/Mkbewe/world-generator/issues/294):** split and rename the preview and generator components ([#297](https://github.com/Mkbewe/world-generator/issues/297)) ([701528d](https://github.com/Mkbewe/world-generator/commit/701528d4f1a112c2241bdc2d711c9ba254e61613))

  - move the layer tabs, canvas and sidebar out of the preview map
  - rename MapLayerControls, MapPanels and MapInspector to LayerTabs,
  MapCanvas, MapSidebar and CursorReadout
  - rename preview-map to map-preview with hooks and lib folders
  - split useWorldGeneration into a config builder, a session hook and run
  state
  - move readout to utils so the sidebar no longer imports preview
  internals
  - update the README structure notes and redistribute the tests
* **[65](https://github.com/Mkbewe/world-generator/issues/65):** add map fullscreen mode plus review ([#310](https://github.com/Mkbewe/world-generator/issues/310)) ([a607a77](https://github.com/Mkbewe/world-generator/commit/a607a775a8c94e37e7f9c09d1de888a1a4f5634e))

  - sync the README and roadmap with the shipped fullscreen mode: Esc only
  closes it, the readout pin works outside it, the preview placeholder and
    the viewport-sized presentation canvas are documented
  - prefer the hooks/ folder for hooks in AGENTS.md
  - remove the dead samplePointer from map-readout and stop sampling
  pointer
    cells outside the projected map
  - read the layer selection from the preview store instead of mutating
  the
    navigation tree, and type the layer tab icons with MapBaseLayerId
  - require the world shape for the boundary overlay and drop the
  pixel-traced
    fallback
  - key the cursor readout lines by index and silence the act warnings in
  the
    world generator tests
  - keep the 0.7.0 review notes in review.0.7.0.md

### Continuous Integration

* **[292](https://github.com/Mkbewe/world-generator/issues/292):** alias release deployments and link them in releases ([#293](https://github.com/Mkbewe/world-generator/issues/293)) ([aab60c2](https://github.com/Mkbewe/world-generator/commit/aab60c2c6c974439bc16bbefe5266055c1b59160))

  - create a wg-<version> alias for every promoted deployment
  - append the deployment URL and alias to the GitHub release notes
  - pass the promoted deployment URL from the promote job to the release
  job
  - document the alias scheme in the README

## [0.6.0](https://github.com/Mkbewe/world-generator/compare/v0.5.3...v0.6.0) (2026-09-15)

### Features

* **[268](https://github.com/Mkbewe/world-generator/issues/268):** add meters and terrain detail to the world shape form ([#280](https://github.com/Mkbewe/world-generator/issues/280)) ([ce9a8ae](https://github.com/Mkbewe/world-generator/commit/ce9a8ae387dcac64f1a344847d14e00fde7182ad))

  - replace pixel size presets and the custom input with meters
  - add a terrain detail control expressed as meters per sample
  - show the derived sample grid and the estimated memory
  - clamp oversized grids to the sample budget and warn about it
  - derive the sample budget from a 600 MB layer memory budget
* **[275](https://github.com/Mkbewe/world-generator/issues/275):** show the active preset in the macro region preset picker ([#278](https://github.com/Mkbewe/world-generator/issues/278)) ([b8a1730](https://github.com/Mkbewe/world-generator/commit/b8a17307bb7a190edc325598c7c1ceff498715e5))

### Bug Fixes

* **[274](https://github.com/Mkbewe/world-generator/issues/274):** keep segmented controls scrollable on narrow screens ([#276](https://github.com/Mkbewe/world-generator/issues/276)) ([24abaaa](https://github.com/Mkbewe/world-generator/commit/24abaaabf71c267fe67ad01212d65a2b2ec1ee44))

  - add a shared scroll container for segmented controls

### Code Refactoring

* **[266](https://github.com/Mkbewe/world-generator/issues/266):** define the world dimensions contract and conversions ([#272](https://github.com/Mkbewe/world-generator/issues/272)) ([da8c8ab](https://github.com/Mkbewe/world-generator/commit/da8c8ab5aee1d8d8992ce4d51ae282bf1a6c2f9d))
* **[267](https://github.com/Mkbewe/world-generator/issues/267):** propagate world dimensions via the config and pipeline ([#273](https://github.com/Mkbewe/world-generator/issues/273)) ([988db9e](https://github.com/Mkbewe/world-generator/commit/988db9efd6b8a3dac05a94fb1da1af7a9fc7adeb))

  - carry meters per sample in the world config with a 1 m default
  - derive and validate world dimensions when collecting map info
  - capture dimensions with the snapshot info and expose them to the
  readout
  - show position and distance as aligned X/Y rows in the preview readout
* **[281](https://github.com/Mkbewe/world-generator/issues/281):** resolve the review findings around dimensions ([#282](https://github.com/Mkbewe/world-generator/issues/282)) ([012e95d](https://github.com/Mkbewe/world-generator/commit/012e95d61d9fbefbd02b170b96f319d26b4e20f6))

  - make WorldDimensions canonical in WorldConfig and drop width/height
  - validate dimensions at the MapGenerator entry before any stage runs
  - show sample coordinates as cells and keep the readout columns fixed
  - format bytes as decimal megabytes shared with the statistics
  - give DetailField and GridSummaryField their own tests
  - document the generator-only memory budget and the remaining perf work
  - sync the README, AGENTS.md and the restructured roadmap
  - keep the 0.6.0 review notes in review.0.6.0.md

### Performance Improvements

* **[256](https://github.com/Mkbewe/world-generator/issues/256):** compute macro regions only inside the world shape ([#271](https://github.com/Mkbewe/world-generator/issues/271)) ([b1d92ad](https://github.com/Mkbewe/world-generator/commit/b1d92adb60adb2df379eb3917233c3318d53b49e))

  - require a valid world mask and skip cells outside the shape
  - compute normalized coordinates only for masked cells

## [0.5.3](https://github.com/Mkbewe/world-generator/compare/v0.5.2...v0.5.3) (2026-09-15)

### Bug Fixes

* **[255](https://github.com/Mkbewe/world-generator/issues/255):** show macro region labels from the generated map ([#265](https://github.com/Mkbewe/world-generator/issues/265)) ([bdd6a50](https://github.com/Mkbewe/world-generator/commit/bdd6a50d8a2eadbb0761673fd1d6c97704539dd4))

  - add a generic MapInfo channel shared by the snapshot and renderer
  state
  - derive map info from the generation config through MAP_INFO_CATALOG
  - resolve macro region labels by index in the readout with a Region N
  fallback
  - document the info channel in the roadmap

### Documentation

* update roadmap notes ([#269](https://github.com/Mkbewe/world-generator/issues/269)) ([09bf274](https://github.com/Mkbewe/world-generator/commit/09bf274a8b698aee62fbe1935231e44e1ad2f176))

## [0.5.2](https://github.com/Mkbewe/world-generator/compare/v0.5.1...v0.5.2) (2026-09-15)

### Chores

* limit commit subjects to 72 characters ([#251](https://github.com/Mkbewe/world-generator/issues/251)) ([59083b2](https://github.com/Mkbewe/world-generator/commit/59083b23fdcc7e42442792d3f334402526de744a))

### Code Refactoring

* **239:** split preview-map into renderer and readout hooks ([#254](https://github.com/Mkbewe/world-generator/issues/254)) ([27a4b63](https://github.com/Mkbewe/world-generator/commit/27a4b632c77efbc778fbac067343fcfadd0463d7))
* **243:** define and enforce component conventions ([#253](https://github.com/Mkbewe/world-generator/issues/253)) ([40e533d](https://github.com/Mkbewe/world-generator/commit/40e533d7bc0ce78ceb3e3df1d018af2d3eab5a4a))
* **246:** rename basic-form to general-form ([#250](https://github.com/Mkbewe/world-generator/issues/250)) ([1e6b5fc](https://github.com/Mkbewe/world-generator/commit/1e6b5fc39391cd975ced1c6653404ca4f3f8b6c4))

### Tests

* **240:** add tests for the general and world-shape forms ([#259](https://github.com/Mkbewe/world-generator/issues/259)) ([a763b99](https://github.com/Mkbewe/world-generator/commit/a763b994ba4ce54a864be3e948997fce17fb8e75))
* **241:** add tests for dialog, overlays and slider ([#252](https://github.com/Mkbewe/world-generator/issues/252)) ([f19c82a](https://github.com/Mkbewe/world-generator/commit/f19c82a97032053d89aeee032339cb8c3d926686))

## [0.5.1](https://github.com/Mkbewe/world-generator/compare/v0.5.0...v0.5.1) (2026-09-14)

### Code Refactoring

* **[238](https://github.com/Mkbewe/world-generator/issues/238):** split world-shape-form into one component per file ([#248](https://github.com/Mkbewe/world-generator/issues/248)) ([9c1287c](https://github.com/Mkbewe/world-generator/commit/9c1287cbec6de8e773c834450ab4f924a3f08b6a))
* **[237](https://github.com/Mkbewe/world-generator/issues/237):** split mobile-menu into sections ([#247](https://github.com/Mkbewe/world-generator/issues/247)) ([67afee0](https://github.com/Mkbewe/world-generator/commit/67afee0ba96c109762a3889cb52e3cff274772d1))
* **[236](https://github.com/Mkbewe/world-generator/issues/236):** split generation-progress into stage list and bar ([#245](https://github.com/Mkbewe/world-generator/issues/245)) ([f580a7a](https://github.com/Mkbewe/world-generator/commit/f580a7aa46a4712daf34eaa43536450c1ee802ec))
* **[235](https://github.com/Mkbewe/world-generator/issues/235):** split region-distribution into bar and handle components ([#244](https://github.com/Mkbewe/world-generator/issues/244)) ([7b4d048](https://github.com/Mkbewe/world-generator/commit/7b4d048fb1eb1ff57157fd7b4a42285b6bcb969e))
* **[233](https://github.com/Mkbewe/world-generator/issues/233):** remove the unused dummy form ([#234](https://github.com/Mkbewe/world-generator/issues/234)) ([61eae00](https://github.com/Mkbewe/world-generator/commit/61eae00967faa289ba40ae1661cffad7b036a7e5))

## [0.5.0](https://github.com/Mkbewe/world-generator/compare/v0.4.1...v0.5.0) (2026-09-14)

### Features

* **228:** move the borders section above base regions in the macro r… ([#230](https://github.com/Mkbewe/world-generator/issues/230)) ([de66a90](https://github.com/Mkbewe/world-generator/commit/de66a90bd399f721c17512b15801ff3f55a98f71))

  …egion form

### Bug Fixes

* **preview-map:** follow touch drags and toggle the pin on tap ([#211](https://github.com/Mkbewe/world-generator/issues/211)) ([968f684](https://github.com/Mkbewe/world-generator/commit/968f68444d6487b81fe5957a1bcc5fdf77900e10))

  - drag follows the finger, tap toggles the pin

### Chores

* **208:** migrate releases from standard-version to release-it ([#209](https://github.com/Mkbewe/world-generator/issues/209)) ([d498574](https://github.com/Mkbewe/world-generator/commit/d498574d3bf339ce4db802833f776201513b2e52))

  - changelog entries now include commit bodies
* **213:** make git hook errors short and readable ([#214](https://github.com/Mkbewe/world-generator/issues/214)) ([78045ec](https://github.com/Mkbewe/world-generator/commit/78045ec9bd4148dd0ddf9a63f4fc9ce55d39656f))
* **215:** add cli task picker and commit message generator ([#216](https://github.com/Mkbewe/world-generator/issues/216)) ([8cca8cf](https://github.com/Mkbewe/world-generator/commit/8cca8cfff9db43eceb77891662957609fabc98d4))

  - pick a task straight from the GitHub board and get a ready git branch
  - generate the commit header from the task: type, issue number and title
  - copy the finished commit message to the clipboard in one step

### Documentation

* **226:** sync roadmap and agent docs with current architecture ([#227](https://github.com/Mkbewe/world-generator/issues/227)) ([991658c](https://github.com/Mkbewe/world-generator/commit/991658c00afb56e19d32c9a8a52c63cc7f6712a3))

### Code Refactoring

* **212:** show total generation time once + add macro-region def… ([#229](https://github.com/Mkbewe/world-generator/issues/229)) ([2278221](https://github.com/Mkbewe/world-generator/commit/227822149ea8051e023ab67eb4b24344cb94abf7))

  …ormation metrics
* **layers:** replace painter classes with a declarative layer ([#207](https://github.com/Mkbewe/world-generator/issues/207)) ([37125c3](https://github.com/Mkbewe/world-generator/commit/37125c316fa4226d092c0f5e270da78891a49eb8))

  replace painter classes with a declarative layer ctalog

  - add DOM-free map-layers with LayerSpec, palette specs
  (solid/ramp/discrete), compiled palette writers, the flat catalog and
  shared region colors
  - add generic CatalogLayer that validates typed data, clips to mask
  layers and paints through a compiled palette
  - drive LayerRegistry from the catalog with independent order and
  topological buildOrder
  - switch MapScene, cache and restore to catalog entries, keeping
  persistence and render statistics
  - remove WorldShapeLayer, NoiseLayer, MacroRegionLayer and
  layer-definition.ts; replace class tests with catalog, palette and scene
  tests
  - update macro region form imports for the moved region palette
  - keep parity: world-shape value === 1, exact noise rounding, cyclic
  region colors
  - document the staged migration in plans/declarative-layer-catalog.md

### [0.4.1](https://github.com/Mkbewe/world-generator/compare/v0.4.0...v0.4.1) (2026-09-13)


### Features

* **macro-region:** add overlay irregularity and draggable boundary h… ([#205](https://github.com/Mkbewe/world-generator/issues/205)) ([080542d](https://github.com/Mkbewe/world-generator/commit/080542d043a0e53f47db606845befd5bd3f91922))

## [0.4.0](https://github.com/Mkbewe/world-generator/compare/v0.3.1...v0.4.0) (2026-09-13)


### Features

* **106:** add macro regions ([#196](https://github.com/Mkbewe/world-generator/issues/196)) ([e07352e](https://github.com/Mkbewe/world-generator/commit/e07352ed27267a7fa4766a1a1a5c71adf74d8522))
* **165:** add map coordinate and value inspection ([#201](https://github.com/Mkbewe/world-generator/issues/201)) ([c1a4039](https://github.com/Mkbewe/world-generator/commit/c1a40393a3d1e76f2b1ea30b7bf8a7196666b92b))
* **195:** macro region form ([#200](https://github.com/Mkbewe/world-generator/issues/200)) ([3f45190](https://github.com/Mkbewe/world-generator/commit/3f45190bc53fd5ef1deef6d75d14385603010c18))


### Bug Fixes

* **202:** reset stale progress when a run starts ([#203](https://github.com/Mkbewe/world-generator/issues/203)) ([4070dbb](https://github.com/Mkbewe/world-generator/commit/4070dbb9d6a6a5a02d12d2807f8942073c37dd00))


### Documentation

* sync readme and roadmap with current architecture ([#193](https://github.com/Mkbewe/world-generator/issues/193)) ([48ed5b5](https://github.com/Mkbewe/world-generator/commit/48ed5b5315f611bf8a96814f4e759530760101b3))


### Code Refactoring

* **181:** generator ([#194](https://github.com/Mkbewe/world-generator/issues/194)) ([7b41964](https://github.com/Mkbewe/world-generator/commit/7b41964c71fd155f00df13f67e4996711804e387))

### [0.3.1](https://github.com/Mkbewe/world-generator/compare/v0.3.0...v0.3.1) (2026-09-12)


### Code Refactoring

* **179:** code quality ([#186](https://github.com/Mkbewe/world-generator/issues/186)) ([1c40a2d](https://github.com/Mkbewe/world-generator/commit/1c40a2de0a23b33be23f47c377971483e45bfa70))
* **180:** world generator previev ([#190](https://github.com/Mkbewe/world-generator/issues/190)) ([a3b73f7](https://github.com/Mkbewe/world-generator/commit/a3b73f764408064210ad4ae8fa33c05cfe1963eb))
* **182:** progess bar is disapera after change route ([#189](https://github.com/Mkbewe/world-generator/issues/189)) ([ae6fae9](https://github.com/Mkbewe/world-generator/commit/ae6fae9a001b0922cc3e8407b2a8795fe3eb22f6))


### Chores

* **185:** fix generating changelog ([#187](https://github.com/Mkbewe/world-generator/issues/187)) ([64ce646](https://github.com/Mkbewe/world-generator/commit/64ce646fe5e51f339a318ae9cf4e7705e9c9129c))
* add auto detect release version ([#191](https://github.com/Mkbewe/world-generator/issues/191)) ([e934828](https://github.com/Mkbewe/world-generator/commit/e934828da5722333a6bd54c3e2786b1ea66aebdc))
* remove repai release notes ([#188](https://github.com/Mkbewe/world-generator/issues/188)) ([3e0d336](https://github.com/Mkbewe/world-generator/commit/3e0d3363f03b5206985c9180aa4f7b887855684c))

## [0.3.0](https://github.com/Mkbewe/world-generator/compare/v0.2.4...v0.3.0) (2026-09-12)


### Features

* **163:** add a segmented generation stage indicator ([#169](https://github.com/Mkbewe/world-generator/issues/169)) ([4879eb0](https://github.com/Mkbewe/world-generator/commit/4879eb0f77dd0347c3d42010bdd5dc5015d3a665))
* **167:** add progres to generator ([#171](https://github.com/Mkbewe/world-generator/issues/171)) ([b9d8b5a](https://github.com/Mkbewe/world-generator/commit/b9d8b5a9dec2bd96ca656cbd5a369fec99bf0a1c))
* **170:** extend statistic ([#173](https://github.com/Mkbewe/world-generator/issues/173)) ([1be52a1](https://github.com/Mkbewe/world-generator/commit/1be52a1ea2cb533652930f56178c072b5e6d6e3f))
* **172:** add map statistic to statistic page ([#175](https://github.com/Mkbewe/world-generator/issues/175)) ([d600c84](https://github.com/Mkbewe/world-generator/commit/d600c84f98537f96c9cb52326f2ec20d8c2d9761))
* **174:** add tab por noise stage ([#178](https://github.com/Mkbewe/world-generator/issues/178)) ([1f201cf](https://github.com/Mkbewe/world-generator/commit/1f201cfc80607f8d88edbc58c5ef96abcc83e049))


### Bug Fixes

* **169:** improve navigation link hover contrast ([#166](https://github.com/Mkbewe/world-generator/issues/166)) ([357548a](https://github.com/Mkbewe/world-generator/commit/357548a659ebccc3e32aecfabc1e0172182f8062))


### Code Refactoring

* **105:** map preview and add progressive rendering ([#159](https://github.com/Mkbewe/world-generator/issues/159)) ([188dbd6](https://github.com/Mkbewe/world-generator/commit/188dbd6ee740d4380e4cf0a0ea2d2d0f7998db13))
* **169:** fix preview loading and refactor map renderer ([#168](https://github.com/Mkbewe/world-generator/issues/168)) ([254907b](https://github.com/Mkbewe/world-generator/commit/254907be34a1ebce29f4fcb40e4bf938025d53e5))
* **176:** simplify in map renderer ([#177](https://github.com/Mkbewe/world-generator/issues/177)) ([7728300](https://github.com/Mkbewe/world-generator/commit/77283002b22b841bc95c9957b5b24c74140c06fd))

### [0.2.4](https://github.com/Mkbewe/world-generator/compare/v0.2.3...v0.2.4) (2026-09-09)


### Bug Fixes

* quality-fix ([#156](https://github.com/Mkbewe/world-generator/issues/156)) ([6216257](https://github.com/Mkbewe/world-generator/commit/62162579937d3d0843603129d492b0c8afc0c654))

### [0.2.3](https://github.com/Mkbewe/world-generator/compare/v0.2.2...v0.2.3) (2026-09-07)


### Features

* **67:** add map layers ([#154](https://github.com/Mkbewe/world-generator/issues/154)) ([8f3b6c0](https://github.com/Mkbewe/world-generator/commit/8f3b6c0c4a5953f012ea56b5187733237eab5dfa))
* **69:** add generation progress bar ([#152](https://github.com/Mkbewe/world-generator/issues/152)) ([504f05f](https://github.com/Mkbewe/world-generator/commit/504f05ff15b35d50974eacea5419c6defae0d371))

### [0.2.2](https://github.com/Mkbewe/world-generator/compare/v0.2.1...v0.2.2) (2026-09-07)


### Bug Fixes

* fix scroll bar issue and fix drawer ([#149](https://github.com/Mkbewe/world-generator/issues/149)) ([88b87f2](https://github.com/Mkbewe/world-generator/commit/88b87f27dabd60cc75de204593e93b158c784155))
* view-port-fix ([#148](https://github.com/Mkbewe/world-generator/issues/148)) ([197ccc5](https://github.com/Mkbewe/world-generator/commit/197ccc57d98356a042c85d510bf09d5306ed3250))


### Chores

* update release scripts ([#147](https://github.com/Mkbewe/world-generator/issues/147)) ([4201adc](https://github.com/Mkbewe/world-generator/commit/4201adc8e426e34e32398406e92dc9403668b1f6))

### [0.2.1](https://github.com/Mkbewe/world-generator/compare/v0.2.0...v0.2.1) (2026-09-02)


### Features

* **118:**  add vertical tabs component ([#137](https://github.com/Mkbewe/world-generator/issues/137)) ([c6901d2](https://github.com/Mkbewe/world-generator/commit/c6901d21c8bafe2202bf3201369b11f07e90f08d))
* **119:** add statistic page and conect it to state ([#142](https://github.com/Mkbewe/world-generator/issues/142)) ([21509de](https://github.com/Mkbewe/world-generator/commit/21509def35396edacc388c868cdca57a92bc5616))
* **127:** add errors pages ([#135](https://github.com/Mkbewe/world-generator/issues/135)) ([8f7daf7](https://github.com/Mkbewe/world-generator/commit/8f7daf7e816ff120cac1f9ec52fe3bc4c22e5471))
* **136:** rebuild form using vertical tab ([#138](https://github.com/Mkbewe/world-generator/issues/138)) ([7732748](https://github.com/Mkbewe/world-generator/commit/773274821f04f55779144f8827c33040cd52406c))
* **139:** add global state ([#140](https://github.com/Mkbewe/world-generator/issues/140)) ([29589d4](https://github.com/Mkbewe/world-generator/commit/29589d4469f802ccb86800353af2603033fdfda7))
* **144:** create navigation menu ([#145](https://github.com/Mkbewe/world-generator/issues/145)) ([78cf485](https://github.com/Mkbewe/world-generator/commit/78cf485101069389205628ce3b6a2df972778bbc))


### Code Refactoring

* **141:** move export png button to legacy generator ([#143](https://github.com/Mkbewe/world-generator/issues/143)) ([f262051](https://github.com/Mkbewe/world-generator/commit/f2620514ca63d3149815e982a298c8074cee8e8c))
* refactor map generator ([#134](https://github.com/Mkbewe/world-generator/issues/134)) ([7de2aaf](https://github.com/Mkbewe/world-generator/commit/7de2aaf0e43d311e8db9505cdb00a5a8efcb5400))

## [0.2.0](https://github.com/Mkbewe/world-generator/compare/v0.1.4...v0.2.0) (2026-08-28)


### Features

* **117:** add router ([#122](https://github.com/Mkbewe/world-generator/issues/122)) ([0ddf99d](https://github.com/Mkbewe/world-generator/commit/0ddf99d77abdc6db7cfe95b9e921489191205aaf))
* **121:** breadcrumps component ([#125](https://github.com/Mkbewe/world-generator/issues/125)) ([de7d874](https://github.com/Mkbewe/world-generator/commit/de7d874085dfd3b311a92aa5c0bc152a06e21923))
* **92:** implement worker to pipline generator ([#120](https://github.com/Mkbewe/world-generator/issues/120)) ([eabcf5c](https://github.com/Mkbewe/world-generator/commit/eabcf5cda6dea02cdc28f08e2eace7d747d504ef))


### Code Refactoring

* **123:** move legacy generator to own route ([#124](https://github.com/Mkbewe/world-generator/issues/124)) ([7f28a51](https://github.com/Mkbewe/world-generator/commit/7f28a51641c777868399a98363d282886f5eff6c))
* **126:** move legacy generator outside components ([#128](https://github.com/Mkbewe/world-generator/issues/128)) ([5623057](https://github.com/Mkbewe/world-generator/commit/5623057f601aa0d9f1b7aef44d415186e116959b))
* **129:** split generator design ([#130](https://github.com/Mkbewe/world-generator/issues/130)) ([1b67fe4](https://github.com/Mkbewe/world-generator/commit/1b67fe46404f680e8fabbf50745547c95c65c6ab))
* breadcrumps fixes ([#131](https://github.com/Mkbewe/world-generator/issues/131)) ([363fd46](https://github.com/Mkbewe/world-generator/commit/363fd46582ffe0425fd1e51b1cdd358cab8a273a))
* clean up world generation pipeline ([#132](https://github.com/Mkbewe/world-generator/issues/132)) ([aace84d](https://github.com/Mkbewe/world-generator/commit/aace84d00680db14cd7fde7628319bf910c7430b))

### [0.1.4](https://github.com/Mkbewe/world-generator/compare/v0.1.3...v0.1.4) (2026-08-15)


### Features

* **107:** add page section componenet ([#109](https://github.com/Mkbewe/world-generator/issues/109)) ([5a67122](https://github.com/Mkbewe/world-generator/commit/5a6712225baa742341f752cde88a7a79a04a8f13))
* **108:** grid component ([#114](https://github.com/Mkbewe/world-generator/issues/114)) ([b372fa3](https://github.com/Mkbewe/world-generator/commit/b372fa33bb586521f721dd5d523d23822fbd7aa5))


### Bug Fixes

* fix feature flags ([#111](https://github.com/Mkbewe/world-generator/issues/111)) ([c99fb61](https://github.com/Mkbewe/world-generator/commit/c99fb6114de0bc402a8cd0a0a9e12522d286796c))


### Continuous Integration

* clean up triggering pipeline on develop ([#110](https://github.com/Mkbewe/world-generator/issues/110)) ([026f086](https://github.com/Mkbewe/world-generator/commit/026f08693a468dac90332db20d350869a53df0c9))


### Chores

* **113:** add style lint configuration ([#115](https://github.com/Mkbewe/world-generator/issues/115)) ([ae244bd](https://github.com/Mkbewe/world-generator/commit/ae244bd706e315a5b8f427e730ffc4e0157731b4))
* fix vercel flags ([#112](https://github.com/Mkbewe/world-generator/issues/112)) ([0344832](https://github.com/Mkbewe/world-generator/commit/0344832c0e2072f3d560528f4173a95d21ecf16a))
* upgrade of feature flags ([#104](https://github.com/Mkbewe/world-generator/issues/104)) ([cce0b46](https://github.com/Mkbewe/world-generator/commit/cce0b46c0e8eb81fd763553385fa1160bfca7886))

### [0.1.3](https://github.com/Mkbewe/world-generator/compare/v0.1.2...v0.1.3) (2026-08-12)


### Features

* add extensible world generation pipeline ([#99](https://github.com/Mkbewe/world-generator/issues/99)) ([28efed4](https://github.com/Mkbewe/world-generator/commit/28efed4409f4e47582daf35e582d41a389db6009))
* add worker for legacy generator for testing performance ([#102](https://github.com/Mkbewe/world-generator/issues/102)) ([8746b6b](https://github.com/Mkbewe/world-generator/commit/8746b6b7ac98dba77a3ed19ff26bb9eafc3808b0))


### Chores

* add git attributes ([#101](https://github.com/Mkbewe/world-generator/issues/101)) ([689ba32](https://github.com/Mkbewe/world-generator/commit/689ba3221fc1fb899bb50c25d6c82e6169d19369))
* fix vercel config ([#100](https://github.com/Mkbewe/world-generator/issues/100)) ([a42b0f7](https://github.com/Mkbewe/world-generator/commit/a42b0f748b99c6314ef06da3cf298197a0fffbac))

### [0.1.2](https://github.com/Mkbewe/world-generator/compare/v0.1.1...v0.1.2) (2026-08-10)


### Features

* add coordinates to map ([#87](https://github.com/Mkbewe/world-generator/issues/87)) ([56bc388](https://github.com/Mkbewe/world-generator/commit/56bc388a4d86fc15a61ecc15f9ee12ec1a7bc8c2))
* resize map generator ([#88](https://github.com/Mkbewe/world-generator/issues/88)) ([6be6d28](https://github.com/Mkbewe/world-generator/commit/6be6d281ec50c04bdd980583d624fb329cb4e2a9))


### Chores

* fix packages version ([#86](https://github.com/Mkbewe/world-generator/issues/86)) ([56de407](https://github.com/Mkbewe/world-generator/commit/56de40771dcf596ef7f7ff6c1081c2b0d36570fc))

### [0.1.1](https://github.com/Mkbewe/world-generator/compare/v0.1.0...v0.1.1) (2026-08-09)


### Features

* **71:** add mobile menu and hamburger button ([#78](https://github.com/Mkbewe/world-generator/issues/78)) ([b5741b0](https://github.com/Mkbewe/world-generator/commit/b5741b00a3a9bbe6623f762c29009363f2df3fc6))
* **80:** confirm export map ([#83](https://github.com/Mkbewe/world-generator/issues/83)) ([c2af89a](https://github.com/Mkbewe/world-generator/commit/c2af89ab8662098facbcbee234c0d54c2851ca17))
* add feature flag ([#55](https://github.com/Mkbewe/world-generator/issues/55)) ([04b78a2](https://github.com/Mkbewe/world-generator/commit/04b78a2d503816ef477a7745fc444e2902da43f2))


### Code Refactoring

* **73:** refactor form to use radix components ([#79](https://github.com/Mkbewe/world-generator/issues/79)) ([6e6611d](https://github.com/Mkbewe/world-generator/commit/6e6611de1ab964fbfcbe3d05ac967230152c3f6e))
* **74:** restructure canvas component to use radix ([#81](https://github.com/Mkbewe/world-generator/issues/81)) ([d27e9d5](https://github.com/Mkbewe/world-generator/commit/d27e9d51317122060b0389353344a407900a2425))
* change css to scss ([#53](https://github.com/Mkbewe/world-generator/issues/53)) ([fb470f8](https://github.com/Mkbewe/world-generator/commit/fb470f8812b285f8166af60c36249996b0aeba81))
* restructure into layouts/pages and decouple canvas/controls ([#54](https://github.com/Mkbewe/world-generator/issues/54)) ([fb3575c](https://github.com/Mkbewe/world-generator/commit/fb3575c56dee7479a7343235d7e852fac3f2aead))

## [0.1.0](https://github.com/Mkbewe/world-generator/compare/v0.0.6...v0.1.0) (2026-08-07)


### Bug Fixes

* test layout change ([#46](https://github.com/Mkbewe/world-generator/issues/46)) ([ffcf991](https://github.com/Mkbewe/world-generator/commit/ffcf9911f4761dee0ede13abdfd0d90a31b684b9))


### Chores

* disable automatic production deployments for master branch ([#37](https://github.com/Mkbewe/world-generator/issues/37)) ([ebc79ca](https://github.com/Mkbewe/world-generator/commit/ebc79ca4b3b64b859b563fe850603425844aa762))
* use commit lint in pr title check ([#38](https://github.com/Mkbewe/world-generator/issues/38)) ([8a95c5b](https://github.com/Mkbewe/world-generator/commit/8a95c5b2c0cf0784bc473f5cf6b52354a5575b61))


### Tests

* test pr ([#48](https://github.com/Mkbewe/world-generator/issues/48)) ([9ddae9a](https://github.com/Mkbewe/world-generator/commit/9ddae9a1156048ca6f4f0067ddb8224b91a14a9a))


### Continuous Integration

* change deployment strategy ([#39](https://github.com/Mkbewe/world-generator/issues/39)) ([c915033](https://github.com/Mkbewe/world-generator/commit/c91503394ee2edbf18ef91f07509e7024673164d))
* clean up vercel ci ([#45](https://github.com/Mkbewe/world-generator/issues/45)) ([98efaf9](https://github.com/Mkbewe/world-generator/commit/98efaf9f6609a44aafe6aecc0f3479f080fd4891))
* final refactor actions and config ([#50](https://github.com/Mkbewe/world-generator/issues/50)) ([4ff74d4](https://github.com/Mkbewe/world-generator/commit/4ff74d4c4b052e4f97789d3b088676b9f1c9d133))
* fix deploy to dev ([#47](https://github.com/Mkbewe/world-generator/issues/47)) ([e4d3793](https://github.com/Mkbewe/world-generator/commit/e4d3793dcfa63789b5f1726ff064209d6ff3bd9f))
* fix vercel deploy yes flag ([#41](https://github.com/Mkbewe/world-generator/issues/41)) ([99e407f](https://github.com/Mkbewe/world-generator/commit/99e407faf78231337d2c84041db7ea57055f2dc2))
* fix vercel deployment ([#40](https://github.com/Mkbewe/world-generator/issues/40)) ([301b9b6](https://github.com/Mkbewe/world-generator/commit/301b9b6b76ba18bb81ef0bb7f091ae1ad18c93bc))
* refactor ci ([#49](https://github.com/Mkbewe/world-generator/issues/49)) ([70712e9](https://github.com/Mkbewe/world-generator/commit/70712e9b23159912024d80c3db0a7e4dbded8f9a))
* update vercel action ([#43](https://github.com/Mkbewe/world-generator/issues/43)) ([8497b55](https://github.com/Mkbewe/world-generator/commit/8497b550640f5bcefd5a5010bad933bd4e756bf2))
* use vercel-action ([#42](https://github.com/Mkbewe/world-generator/issues/42)) ([242376f](https://github.com/Mkbewe/world-generator/commit/242376f1238f8e0f469de8923e91a0cd64ac9379))
* vercel fix ([#44](https://github.com/Mkbewe/world-generator/issues/44)) ([aac3da5](https://github.com/Mkbewe/world-generator/commit/aac3da5e0463e1c93b0931bba93ab61e0919c29f))

### [0.0.6](https://github.com/Mkbewe/world-generator/compare/v0.0.5...v0.0.6) (2026-07-31)


### Features

* add footer ([#33](https://github.com/Mkbewe/world-generator/issues/33)) ([07926ac](https://github.com/Mkbewe/world-generator/commit/07926acf7f3f3158b00af120facd8c7e9aed27af))


### Code Refactoring

* pr title check ([#34](https://github.com/Mkbewe/world-generator/issues/34)) ([56ecc8b](https://github.com/Mkbewe/world-generator/commit/56ecc8b44d2ed0ef490c356bf279204e8a544c83))


### Chores

* add test run to commit lint ([#35](https://github.com/Mkbewe/world-generator/issues/35)) ([df924c4](https://github.com/Mkbewe/world-generator/commit/df924c44cc4b092bfc40686d32f935e831a68e9b))

### [0.0.5](https://github.com/Mkbewe/world-generator/compare/v0.0.4...v0.0.5) (2026-07-25)


### Features

* add header ([#29](https://github.com/Mkbewe/world-generator/issues/29)) ([c782340](https://github.com/Mkbewe/world-generator/commit/c7823406ce10fa070519246a7d9450c416648569))
* add theme and ui library ([#30](https://github.com/Mkbewe/world-generator/issues/30)) ([5a4b9fa](https://github.com/Mkbewe/world-generator/commit/5a4b9fa68cd4366dfb4c39c8526d9aa1091b9a7e))


### Chores

* update readme ([#27](https://github.com/Mkbewe/world-generator/issues/27)) ([615a708](https://github.com/Mkbewe/world-generator/commit/615a70869764236659eef3112a8aab93f1a04521))


### Code Refactoring

* new fav icon ([#26](https://github.com/Mkbewe/world-generator/issues/26)) ([fd89bd3](https://github.com/Mkbewe/world-generator/commit/fd89bd3fe1fe1f8251fb4b680a5291894c1e2dfd))
* refactor world generator components ([#28](https://github.com/Mkbewe/world-generator/issues/28)) ([bac7dbb](https://github.com/Mkbewe/world-generator/commit/bac7dbb990f479e8ce667d61e0f3deb3c10cbfcc))


### Continuous Integration

* add pr title check workflow ([#25](https://github.com/Mkbewe/world-generator/issues/25)) ([d2e62db](https://github.com/Mkbewe/world-generator/commit/d2e62db38b8254f7d5957c53d33e2eb77a605abc))
* add release type to pr tittle check ([21a5b86](https://github.com/Mkbewe/world-generator/commit/21a5b860e37621a706da1295abb3ebc345ccdecc))

### [0.0.4](https://github.com/Mkbewe/world-generator/compare/v0.0.3...v0.0.4) (2026-07-22)


### Features

* add fav icons ([#21](https://github.com/Mkbewe/world-generator/issues/21)) ([02a9ed4](https://github.com/Mkbewe/world-generator/commit/02a9ed4fba1f641dce9ce076c3a797a0967475e7))

### [0.0.3](https://github.com/Mkbewe/world-generator/compare/v0.0.2...v0.0.3) (2026-07-22)


### Chores

* update readme to be up to date with current configuration ([#16](https://github.com/Mkbewe/world-generator/issues/16)) ([1686f26](https://github.com/Mkbewe/world-generator/commit/1686f26a0550906f4f282e92cdd323d66ac0b553))


### Continuous Integration

* add vercel support ([58511c9](https://github.com/Mkbewe/world-generator/commit/58511c9e889079337cdd90e45c36a08f6f9d1f82))

### [0.0.2](https://github.com/Mkbewe/world-generator/compare/v0.0.1...v0.0.2) (2026-07-22)


### Continuous Integration

* create auto change log release notes bum version and tag ([#10](https://github.com/Mkbewe/world-generator/issues/10)) ([46856fb](https://github.com/Mkbewe/world-generator/commit/46856fb741f218d271ba7f25707e0f6efcb931da))
