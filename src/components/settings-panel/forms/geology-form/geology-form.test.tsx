import { Theme } from '@radix-ui/themes';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { GeologyForm } from './geology-form';
import { GEOLOGY_FORM_DEFAULTS, useGeologyFormStore } from '../../../../stores';
import {
  createGeologicalArea,
  MAX_GEOLOGICAL_AREAS,
} from '../../../../utils/map-generator/stages/geology';

function renderForm() {
  render(
    <Theme>
      <GeologyForm />
    </Theme>
  );
}

describe('GeologyForm', () => {
  beforeEach(() => {
    useGeologyFormStore.setState({ ...GEOLOGY_FORM_DEFAULTS });
  });

  it('lists areas with their relief and never promises island counts', () => {
    renderForm();

    expect(screen.getByText(/area-1 \(plains\)/)).toBeInTheDocument();
    expect(screen.getByText(/One area can grow zero, one or many islands/)).toBeInTheDocument();
  });

  it('adds and removes areas through the form store', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Add Volcanic' }));
    expect(useGeologyFormStore.getState().geology.areas).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Remove area-1' }));
    expect(useGeologyFormStore.getState().geology.areas.map(area => area.id)).toEqual(['area-2']);
  });

  it('commits the extent slider to the area', async () => {
    const user = userEvent.setup();
    renderForm();

    const slider = within(screen.getByLabelText('Extent of area-1')).getByRole('slider');
    slider.focus();
    await user.keyboard('{ArrowRight}');

    expect(useGeologyFormStore.getState().geology.areas[0].extent).toBeCloseTo(
      GEOLOGY_FORM_DEFAULTS.geology.areas[0].extent + 0.01
    );
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
  });
});
