import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ExportDialog } from './export-dialog';

describe('ExportDialog', () => {
  it('renders nothing while closed', () => {
    render(
      <Theme>
        <ExportDialog isOpen={false} onOpenChange={() => {}} onConfirm={() => {}} />
      </Theme>
    );

    expect(screen.queryByText('Export World Map')).not.toBeInTheDocument();
  });

  it('confirms the export', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <Theme>
        <ExportDialog isOpen onOpenChange={() => {}} onConfirm={onConfirm} />
      </Theme>
    );

    await user.click(screen.getByRole('button', { name: 'Export' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('reports closing when cancelled', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Theme>
        <ExportDialog isOpen onOpenChange={onOpenChange} onConfirm={() => {}} />
      </Theme>
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
