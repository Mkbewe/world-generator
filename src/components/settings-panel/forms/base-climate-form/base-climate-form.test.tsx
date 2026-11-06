import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { BaseClimateForm } from './base-climate-form';
import { BASE_CLIMATE_FORM_DEFAULTS, useBaseClimateFormStore } from '../../../../stores';

function renderForm() {
  render(
    <Theme>
      <BaseClimateForm />
    </Theme>
  );
}

describe('BaseClimateForm', () => {
  beforeEach(() => {
    useBaseClimateFormStore.setState({ ...BASE_CLIMATE_FORM_DEFAULTS });
  });

  it('stacks presets, layout and heat zones', () => {
    renderForm();

    const sections = [
      screen.getByText('Presets'),
      screen.getByText('Layout'),
      screen.getByText('Boundaries'),
      screen.getByText('Heat zones (3)'),
      screen.getByText('Moisture'),
    ];

    for (let index = 1; index < sections.length; index++) {
      expect(
        sections[index - 1].compareDocumentPosition(sections[index]) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    }
  });
});
