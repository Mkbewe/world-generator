import { Theme } from '@radix-ui/themes';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { GeologyForm } from './geology-form';
import { GEOLOGY_FORM_DEFAULTS, useGeologyFormStore } from '../../../../stores';
import {
  createGeologicalArea,
  MAX_GEOLOGICAL_AREAS,
} from '../../../../utils/map-generator/stages/geology';

function renderForm(error?: string) {
  render(
    <Theme>
      <GeologyForm error={error} />
    </Theme>
  );
}

function card(id: string) {
  return within(screen.getByRole('group', { name: id }));
}

describe('GeologyForm', () => {
  beforeEach(() => {
    useGeologyFormStore.setState({ ...GEOLOGY_FORM_DEFAULTS });
  });

  it('lists areas by id and never promises island counts', () => {
    renderForm();

    expect(screen.getByDisplayValue('area-1')).toBeInTheDocument();
    expect(screen.getByText(/one area can grow zero, one or many islands/i)).toBeInTheDocument();
  });

  it('adds and removes areas through the form store', async () => {
    const user = userEvent.setup();
    renderForm();
    const initial = useGeologyFormStore.getState().geology.areas.length;

    await user.click(screen.getByRole('button', { name: 'Add Volcanic' }));
    expect(useGeologyFormStore.getState().geology.areas).toHaveLength(initial + 1);

    await user.click(screen.getByRole('button', { name: 'Remove area-1' }));
    expect(useGeologyFormStore.getState().geology.areas.map(area => area.id)).not.toContain(
      'area-1'
    );
  });

  it('commits the extent slider to the area', async () => {
    const user = userEvent.setup();
    renderForm();

    const slider = within(card('area-1').getByLabelText('Size')).getByRole('slider');
    slider.focus();
    await user.keyboard('{ArrowRight}');

    expect(useGeologyFormStore.getState().geology.areas[0].extent).toBeCloseTo(
      GEOLOGY_FORM_DEFAULTS.geology.areas[0].extent + 0.01
    );
  });

  it('fills the list from a geography preset and marks later edits', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('radio', { name: 'Volcanic chain' }));

    const areas = useGeologyFormStore.getState().geology.areas;
    expect(areas).toHaveLength(3);
    expect(areas.map(area => area.relief)).toEqual(['mountains', 'plains', 'mountains']);
    expect(screen.queryByText(/edited by hand/i)).not.toBeInTheDocument();

    const slider = within(card(areas[0].id).getByLabelText('Uplift density')).getByRole('slider');
    slider.focus();
    await user.keyboard('{ArrowRight}');

    const state = useGeologyFormStore.getState();
    expect(state.edited).toBe(true);
    expect(state.preset).toBeUndefined();
    expect(screen.getByText(/edited by hand/i)).toBeInTheDocument();
  });

  it('duplicates an area with a fresh id and automatic placement', async () => {
    const user = userEvent.setup();
    renderForm();
    const before = useGeologyFormStore.getState().geology.areas.map(area => area.id);

    await user.click(screen.getByRole('button', { name: 'Duplicate area-1' }));

    const areas = useGeologyFormStore.getState().geology.areas;
    expect(areas.map(area => area.id)).toEqual([...before, 'area-2']);
    expect(areas[1].placement).toEqual({ kind: 'automatic' });
    expect(areas[1].relief).toBe(areas[0].relief);
  });

  it('keeps an empty list as an explicit ocean world', () => {
    useGeologyFormStore.setState({ geology: { areas: [] } });
    renderForm();

    expect(screen.getByText(/No areas - the world stays ocean/)).toBeInTheDocument();
  });

  it('disables adding areas at the limit', () => {
    useGeologyFormStore.setState({
      geology: {
        areas: Array.from({ length: MAX_GEOLOGICAL_AREAS }, (_value, index) =>
          createGeologicalArea(`area-${index + 1}`, 'shallow-archipelago')
        ),
      },
    });
    renderForm();

    expect(screen.getByRole('button', { name: 'Add Shallow' })).toBeDisabled();
    expect(card('area-1').getByRole('button', { name: 'Duplicate area-1' })).toBeDisabled();
  });

  it('marks only the areas named in the placement error', () => {
    useGeologyFormStore.setState({
      geology: {
        areas: [
          createGeologicalArea('area-1', 'shallow-archipelago'),
          createGeologicalArea('area-2', 'volcanic'),
        ],
      },
    });
    renderForm('Area "area-2" could not be placed: no valid spot keeps 60% inside the world');

    expect(card('area-2').getByText(/Could not be placed/)).toBeInTheDocument();
    expect(card('area-1').queryByText(/Could not be placed/)).not.toBeInTheDocument();
  });
});
