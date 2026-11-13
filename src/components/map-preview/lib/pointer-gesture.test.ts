import { movedBeyondTapTolerance, pointerGestureKind } from './pointer-gesture';

describe('pointerGestureKind', () => {
  it('measures left clicks and touch when measuring', () => {
    expect(
      pointerGestureKind({ button: 0, pointerType: 'mouse' }, { zoomable: false, measuring: true })
    ).toBe('measure');
    expect(
      pointerGestureKind({ button: 0, pointerType: 'touch' }, { zoomable: true, measuring: true })
    ).toBe('measure');
  });

  it('pans with the middle button or touch outside measuring', () => {
    expect(
      pointerGestureKind({ button: 1, pointerType: 'mouse' }, { zoomable: true, measuring: false })
    ).toBe('pan');
    expect(
      pointerGestureKind({ button: 0, pointerType: 'touch' }, { zoomable: true, measuring: false })
    ).toBe('pan');
  });

  it('taps with a left click when pan gestures are unavailable', () => {
    expect(
      pointerGestureKind({ button: 0, pointerType: 'mouse' }, { zoomable: false, measuring: false })
    ).toBe('tap');
  });

  it('ignores unsupported buttons', () => {
    expect(
      pointerGestureKind({ button: 2, pointerType: 'mouse' }, { zoomable: true, measuring: false })
    ).toBeUndefined();
    expect(
      pointerGestureKind({ button: 1, pointerType: 'mouse' }, { zoomable: false, measuring: false })
    ).toBeUndefined();
  });
});

describe('movedBeyondTapTolerance', () => {
  it('separates taps from drags', () => {
    expect(movedBeyondTapTolerance(0, 0, { clientX: 5, clientY: 5 })).toBe(false);
    expect(movedBeyondTapTolerance(0, 0, { clientX: 9, clientY: 0 })).toBe(true);
  });
});
