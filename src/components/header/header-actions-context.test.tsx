import { act, renderHook } from '@testing-library/react';

import { HeaderActionsProvider, useHeaderActions } from './header-actions-context';

describe('HeaderActionsProvider', () => {
  it('starts with everything closed and nothing to export', () => {
    const { result } = renderHook(() => useHeaderActions(), { wrapper: HeaderActionsProvider });

    expect(result.current.isExportDialogOpen).toBe(false);
    expect(result.current.isMapGenerated).toBe(false);
    expect(result.current.canFullscreen).toBe(false);
    expect(result.current.isFullscreen).toBe(false);
  });

  it('confirms an export once and closes the dialog', () => {
    const { result } = renderHook(() => useHeaderActions(), { wrapper: HeaderActionsProvider });
    const exportMap = vi.fn();

    act(() => {
      result.current.exportMapRef.current = exportMap;
      result.current.setIsExportDialogOpen(true);
    });
    act(() => result.current.confirmExport());

    expect(exportMap).toHaveBeenCalledTimes(1);
    expect(result.current.isExportDialogOpen).toBe(false);
  });

  it('keeps working without a provider', () => {
    const { result } = renderHook(() => useHeaderActions());

    expect(result.current.isExportDialogOpen).toBe(false);
    expect(() => result.current.confirmExport()).not.toThrow();
  });
});
