import { ArchiveIcon, GlobeIcon, LayersIcon } from '@radix-ui/react-icons';
import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { VerticalTabs, type VerticalTabsProps } from './vertical-tabs';

const items = [
  {
    value: 'shape',
    label: 'World shape',
    icon: <GlobeIcon />,
    content: <p>Shape content</p>,
  },
  {
    value: 'noise',
    label: 'Noise',
    icon: <LayersIcon />,
    content: <p>Noise content</p>,
  },
  {
    value: 'export',
    label: 'Export',
    icon: <ArchiveIcon />,
    content: <p>Export content</p>,
  },
];

function renderTabs(props: Partial<VerticalTabsProps> = {}) {
  return render(
    <Theme>
      <VerticalTabs items={items} {...props} />
    </Theme>
  );
}

describe('VerticalTabs', () => {
  it('renders one trigger per item, named after its label', () => {
    renderTabs();

    expect(screen.getByRole('tab', { name: 'World shape' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Noise' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Export' })).toBeInTheDocument();
  });

  it('renders the active item label as the panel title', () => {
    renderTabs();

    expect(screen.getByRole('heading', { name: 'World shape' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Noise' })).not.toBeInTheDocument();
  });

  it('shows the first tab by default', () => {
    renderTabs();

    expect(screen.getByText('Shape content')).toBeInTheDocument();
    expect(screen.queryByText('Noise content')).not.toBeInTheDocument();
    expect(screen.queryByText('Export content')).not.toBeInTheDocument();
  });

  it('honours defaultValue', () => {
    renderTabs({ defaultValue: 'export' });

    expect(screen.getByText('Export content')).toBeInTheDocument();
    expect(screen.queryByText('Shape content')).not.toBeInTheDocument();
  });

  it('switches the active panel when a trigger is clicked', async () => {
    const user = userEvent.setup();
    renderTabs();

    await user.click(screen.getByRole('tab', { name: 'Noise' }));

    expect(screen.getByText('Noise content')).toBeInTheDocument();
    expect(screen.queryByText('Shape content')).not.toBeInTheDocument();
  });

  it('reports the new value when the tab changes', async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    renderTabs({ onValueChange });

    await user.click(screen.getByRole('tab', { name: 'Export' }));

    expect(onValueChange).toHaveBeenCalledWith('export');
  });

  it('keeps every trigger in the natural tab order', () => {
    renderTabs();

    for (const trigger of screen.getAllByRole('tab')) {
      expect(trigger).toHaveAttribute('tabindex', '0');
    }
  });

  it('moves through tabs with the up and down arrow keys', async () => {
    const user = userEvent.setup();
    renderTabs();

    await user.click(screen.getByRole('tab', { name: 'World shape' }));
    await user.keyboard('{ArrowDown}');

    expect(screen.getByText('Noise content')).toBeInTheDocument();
  });

  it('marks the active trigger with data-state active', async () => {
    const user = userEvent.setup();
    renderTabs();

    expect(screen.getByRole('tab', { name: 'World shape' })).toHaveAttribute(
      'data-state',
      'active'
    );
    expect(screen.getByRole('tab', { name: 'Noise' })).toHaveAttribute('data-state', 'inactive');

    await user.click(screen.getByRole('tab', { name: 'Noise' }));

    expect(screen.getByRole('tab', { name: 'Noise' })).toHaveAttribute('data-state', 'active');
    expect(screen.getByRole('tab', { name: 'World shape' })).toHaveAttribute(
      'data-state',
      'inactive'
    );
  });

  it('places the strip on the requested side', () => {
    const { container } = renderTabs({ side: 'right' });

    expect(container.querySelector('[data-side="right"]')).not.toBeNull();
  });
});
