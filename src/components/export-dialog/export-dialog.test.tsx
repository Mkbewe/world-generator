import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ExportDialog, type ExportFormatOption } from './export-dialog';

const JSON_FORMAT: readonly ExportFormatOption[] = [{ id: 'json', label: 'JSON file' }];

describe('ExportDialog', () => {
  it('renders nothing while closed', () => {
    render(
      <Theme>
        <ExportDialog
          isOpen={false}
          onOpenChange={() => {}}
          title='Export Statistics'
          formats={JSON_FORMAT}
          onExport={() => {}}
        />
      </Theme>
    );

    expect(screen.queryByText('Export Statistics')).not.toBeInTheDocument();
  });

  it('shows the given title and description and exports the only format', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    render(
      <Theme>
        <ExportDialog
          isOpen
          onOpenChange={() => {}}
          title='Export Statistics'
          description='Download the statistics as JSON?'
          formats={JSON_FORMAT}
          onExport={onExport}
        />
      </Theme>
    );

    expect(screen.getByText('Download the statistics as JSON?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Export' }));

    expect(onExport).toHaveBeenCalledWith('json');
  });

  it('lets the user choose between formats', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    render(
      <Theme>
        <ExportDialog
          isOpen
          onOpenChange={() => {}}
          title='Export Map'
          formats={[
            { id: 'png', label: 'PNG image', description: 'A picture of the map.' },
            { id: 'json', label: 'JSON file' },
          ]}
          onExport={onExport}
        />
      </Theme>
    );

    await user.click(screen.getByRole('radio', { name: /JSON file/ }));
    await user.click(screen.getByRole('button', { name: 'Export' }));

    expect(onExport).toHaveBeenCalledWith('json');
  });

  it('reports closing when cancelled', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Theme>
        <ExportDialog
          isOpen
          onOpenChange={onOpenChange}
          title='Export Statistics'
          formats={JSON_FORMAT}
          onExport={() => {}}
        />
      </Theme>
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
