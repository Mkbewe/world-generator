export const TAP_MOVE_TOLERANCE_PX = 8;

export type PointerGestureKind = 'pan' | 'measure' | 'tap';

export interface PointerGestureOptions {
  readonly zoomable: boolean;
  readonly measuring: boolean;
}

export interface PointerGestureInput {
  readonly button: number;
  readonly pointerType: string;
}

export function pointerGestureKind(
  event: PointerGestureInput,
  { zoomable, measuring }: PointerGestureOptions
): PointerGestureKind | undefined {
  const touch = event.pointerType === 'touch';
  if (measuring && (event.button === 0 || touch)) {
    return 'measure';
  }
  if (zoomable && (event.button === 1 || (touch && !measuring))) {
    return 'pan';
  }
  return event.button === 0 ? 'tap' : undefined;
}

export function movedBeyondTapTolerance(
  startX: number,
  startY: number,
  event: { readonly clientX: number; readonly clientY: number }
): boolean {
  return Math.hypot(event.clientX - startX, event.clientY - startY) > TAP_MOVE_TOLERANCE_PX;
}
