import { Flex, Heading, Separator } from '@radix-ui/themes';

import { useLandmassFormStore } from '../../../../../stores';
import { SliderField } from '../../../../slider-field';

/** Shelf sliders live here but write to the landmass config, which owns them. */
export function ShelfSection() {
  const shelf = useLandmassFormStore(state => state.landmasses.shelf);
  const setShelf = useLandmassFormStore(state => state.setShelf);

  return (
    <Flex direction='column' gap='4'>
      <Separator size='4' />
      <Heading size='3'>Shelf</Heading>
      <SliderField
        label='Shelf width'
        description='How wide the shallow water band is around every island.'
        value={shelf.width}
        min={0.01}
        max={0.3}
        step={0.01}
        format={value => `${Math.round(value * 100)}%`}
        rangeLabels={['Narrow', 'Wide']}
        onChange={width => setShelf({ width })}
      />
      <SliderField
        label='Shelf depth'
        description='Water depth at the island coast, before the shelf drops to the open ocean.'
        value={shelf.targetDepth}
        min={10}
        max={200}
        step={5}
        format={value => `${Math.round(value)} m`}
        onChange={targetDepth => setShelf({ targetDepth })}
      />
      <SliderField
        label='Shelf falloff'
        description='How the shelf drops to the deep ocean: low is a sharp edge, high a gentle slope.'
        value={shelf.falloff}
        min={0}
        max={1}
        step={0.05}
        format={value => `${Math.round(value * 100)}%`}
        rangeLabels={['Sharp', 'Gentle']}
        onChange={falloff => setShelf({ falloff })}
      />
      <SliderField
        label='Shelf irregularity'
        description='How much the outer shelf edge wobbles instead of forming a perfect ring.'
        value={shelf.irregularity}
        min={0}
        max={1}
        step={0.05}
        format={value => `${Math.round(value * 100)}%`}
        rangeLabels={['Even', 'Broken']}
        onChange={irregularity => setShelf({ irregularity })}
      />
    </Flex>
  );
}
