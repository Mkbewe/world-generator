import { Theme } from '@radix-ui/themes';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { GeologyForm } from './geology-form';
import {
  GEOLOGY_FORM_DEFAULTS,
  useGeologyFormStore,
  useWorldShapeFormStore,
} from '../../../../stores';
import type { StageFailure } from '../../../../utils/map-generator';
import {
  createGeologicalArea,
  MAX_GEOLOGICAL_AREAS,
} from '../../../../utils/map-generator/stages/geology';

function renderForm(failures?: readonly StageFailure[]) {
  render(
    <Theme>
      <GeologyForm failures={failures} />
    </Theme>
  );
}

function card(id: string) {
  return within(screen.getByRole('group', { name: id }));
}

function areasOf(character: 'shallow-archipelago' | 'volcanic' | 'atoll') {
  useGeologyFormStore.setState({
    geology: { areas: [createGeologicalArea('area-1', character)] },
    preset: undefined,
    edited: true,
  });
}

describe('GeologyForm', () => {
  beforeEach(() => {
    useGeologyFormStore.setState({ ...GEOLOGY_FORM_DEFAULTS });
    useWorldShapeFormStore.setState({ sizeMeters: 1000, shape: 'disc' });
  });

  it('lists areas by id and never promises island counts', () => {
    renderForm();

    expect(screen.getByDisplayValue('area-1')).toBeInTheDocument();
    expect(screen.getByText(/one area can grow zero, one or many islands/i)).toBeInTheDocument();
  });

  it('adds and removes areas through the form store', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Volcanic' }));
    expect(useGeologyFormStore.getState().geology.areas).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Remove area-1' }));
    expect(useGeologyFormStore.getState().geology.areas.map(area => area.id)).toEqual(['area-2']);
  });

  it('shows only the controls of the area character', () => {
    areasOf('atoll');
    renderForm();

    expect(card('area-1').getByLabelText('Size')).toBeInTheDocument();
    expect(card('area-1').getByLabelText('Atoll density')).toBeInTheDocument();
    expect(card('area-1').getByLabelText('Lagoon rim')).toBeInTheDocument();
    expect(card('area-1').queryByLabelText('Rotation')).not.toBeInTheDocument();
    expect(card('area-1').queryByLabelText('Seabed offset')).not.toBeInTheDocument();
  });

  it('commits the size slider to the area', async () => {
    const user = userEvent.setup();
    renderForm();

    const slider = within(card('area-1').getByLabelText('Size')).getByRole('slider');
    slider.focus();
    await user.keyboard('{ArrowLeft}');

    expect(useGeologyFormStore.getState().geology.areas[0].extent).toBeCloseTo(
      GEOLOGY_FORM_DEFAULTS.geology.areas[0].extent - 0.01
    );
  });

  it('turns the atoll density into the reef scale the field consumes', async () => {
    const user = userEvent.setup();
    areasOf('atoll');
    const before = useGeologyFormStore.getState().geology.areas[0].upliftScaleMeters;
    renderForm();

    const slider = within(card('area-1').getByLabelText('Atoll density')).getByRole('slider');
    slider.focus();
    await user.keyboard('{ArrowRight}');

    expect(useGeologyFormStore.getState().geology.areas[0].upliftScaleMeters).toBeLessThan(before);
  });

  it('fills the list from a geography preset and marks later edits', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('radio', { name: 'Volcanic islands' }));

    const areas = useGeologyFormStore.getState().geology.areas;
    expect(areas.length).toBeGreaterThan(0);
    expect(areas[0].character).toBe('volcanic');
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

    await user.click(screen.getByRole('button', { name: 'Duplicate area-1' }));

    const areas = useGeologyFormStore.getState().geology.areas;
    expect(areas.map(area => area.id)).toEqual(['area-1', 'area-2']);
    expect(areas[1].placement).toEqual({ kind: 'automatic' });
    expect(areas[1].character).toBe(areas[0].character);
  });

  it('keeps an empty list as an explicit ocean world', () => {
    useGeologyFormStore.setState({ geology: { areas: [] }, preset: undefined, edited: true });
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
      preset: undefined,
      edited: true,
    });
    renderForm();

    expect(screen.getByRole('button', { name: 'Ordinary' })).toBeDisabled();
    expect(card('area-1').getByRole('button', { name: 'Duplicate area-1' })).toBeDisabled();
  });

  it('marks only the areas named in the structured failures', () => {
    useGeologyFormStore.setState({
      geology: {
        areas: [
          createGeologicalArea('area-1', 'shallow-archipelago'),
          createGeologicalArea('area-2', 'volcanic'),
        ],
      },
      preset: undefined,
      edited: true,
    });
    renderForm([{ id: 'area-2', message: 'no valid spot keeps 60% inside the world' }]);

    expect(card('area-2').getByText(/Could not be placed/)).toBeInTheDocument();
    expect(card('area-1').queryByText(/Could not be placed/)).not.toBeInTheDocument();
  });

  it('rebuilds an untouched preset for a larger new world', async () => {
    renderForm();
    const initialCount = useGeologyFormStore.getState().geology.areas.length;
    act(() => useWorldShapeFormStore.getState().setSizeMeters(4000));

    await waitFor(() => {
      expect(useGeologyFormStore.getState().geology.areas.length).toBeGreaterThan(initialCount);
    });
  });
});
