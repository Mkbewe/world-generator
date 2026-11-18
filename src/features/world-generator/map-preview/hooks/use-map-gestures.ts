import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { PointerSample } from '@readout';
import type { MapRenderer } from '@renderer';

import {
  movedBeyondTapTolerance,
  type PointerGestureKind,
  pointerGestureKind,
} from '../lib/pointer-gesture';

const WHEEL_ZOOM_SPEED = 0.0015;

interface MapReadoutPort {
  readonly sampleAt: (event: { clientX: number; clientY: number }) => PointerSample | undefined;
  readonly trackReadout: (event: { clientX: number; clientY: number }) => void;
  readonly togglePin: (position: PointerSample) => void;
  readonly clear: () => void;
}

interface MapMeasurementPort {
  readonly addPoint: (position: PointerSample) => void;
  readonly previewPoint: (position: PointerSample) => void;
  readonly finish: () => void;
  readonly clearPreview: () => void;
}

interface UseMapGesturesOptions {
  readonly rendererRef: RefObject<MapRenderer | null>;
  readonly canvasRef: RefObject<HTMLCanvasElement | null>;
  readonly zoomable: boolean;
  readonly measuring: boolean;
  readonly pinning: boolean;
  readonly readout: MapReadoutPort;
  readonly measurement: MapMeasurementPort;
}

interface PointerGesture {
  readonly kind: PointerGestureKind;
  readonly pointerId: number;
  readonly button: number;
  readonly touch: boolean;
  readonly startX: number;
  readonly startY: number;
  lastX: number;
  lastY: number;
  moved: boolean;
}

interface PointerPosition {
  readonly x: number;
  readonly y: number;
}

interface PinchGesture {
  readonly pointerIds: readonly [number, number];
  lastDistance: number;
}

function pointerDistance(first: PointerPosition, second: PointerPosition): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

export function useMapGestures({
  rendererRef,
  canvasRef,
  zoomable,
  measuring,
  pinning,
  readout,
  measurement,
}: UseMapGesturesOptions) {
  const gestureRef = useRef<PointerGesture | undefined>(undefined);
  const pointersRef = useRef(new Map<number, PointerPosition>());
  const pinchRef = useRef<PinchGesture | undefined>(undefined);
  const ignoreTouchRef = useRef(false);
  const [panning, setPanning] = useState(false);
  const { sampleAt, trackReadout, togglePin, clear } = readout;
  const { addPoint, previewPoint, finish, clearPreview } = measurement;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !zoomable) {
      return;
    }
    const handleWheel = (event: WheelEvent): void => {
      event.preventDefault();
      const renderer = rendererRef.current;
      if (!renderer || !renderer.currentSize) {
        return;
      }
      renderer.zoomAtPointer(
        event.clientX,
        event.clientY,
        Math.exp(-event.deltaY * WHEEL_ZOOM_SPEED)
      );
    };
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [canvasRef, rendererRef, zoomable]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>): void => {
      if (event.pointerType === 'touch' && zoomable && !measuring) {
        const pointers = pointersRef.current;
        if (pointers.size === 0) {
          ignoreTouchRef.current = false;
        }
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.size === 2) {
          const [firstId, secondId] = [...pointers.keys()];
          if (firstId === undefined || secondId === undefined) {
            return;
          }
          const first = pointers.get(firstId);
          const second = pointers.get(secondId);
          if (first && second) {
            pinchRef.current = {
              pointerIds: [firstId, secondId],
              lastDistance: pointerDistance(first, second),
            };
            gestureRef.current = undefined;
            setPanning(false);
            clear();
          }
          return;
        }
        if (pointers.size > 2) {
          return;
        }
      }
      if (gestureRef.current) {
        return;
      }
      const kind = pointerGestureKind(event, { zoomable, measuring });
      if (!kind) {
        return;
      }
      if (event.button === 1) {
        event.preventDefault();
      }
      event.currentTarget.setPointerCapture?.(event.pointerId);
      gestureRef.current = {
        kind,
        pointerId: event.pointerId,
        button: event.button,
        touch: event.pointerType === 'touch',
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        moved: false,
      };
      if (kind === 'measure') {
        const position = sampleAt(event);
        if (!position) {
          gestureRef.current = undefined;
          return;
        }
        addPoint(position);
        trackReadout(event);
        return;
      }
      trackReadout(event);
    },
    [addPoint, clear, measuring, sampleAt, trackReadout, zoomable]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>): void => {
      if (pinchRef.current && event.pointerType === 'touch') {
        pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const pinch = pinchRef.current;
        const [firstId, secondId] = pinch.pointerIds;
        const first = pointersRef.current.get(firstId);
        const second = pointersRef.current.get(secondId);
        if (first && second) {
          const distance = pointerDistance(first, second);
          if (pinch.lastDistance > 0) {
            rendererRef.current?.zoomAtPointer(
              (first.x + second.x) / 2,
              (first.y + second.y) / 2,
              distance / pinch.lastDistance
            );
          }
          pinch.lastDistance = distance;
        }
        return;
      }
      if (ignoreTouchRef.current && event.pointerType === 'touch') {
        return;
      }
      const gesture = gestureRef.current;
      if (gesture?.pointerId === event.pointerId) {
        const deltaX = event.clientX - gesture.lastX;
        const deltaY = event.clientY - gesture.lastY;
        if (!gesture.moved && movedBeyondTapTolerance(gesture.startX, gesture.startY, event)) {
          gesture.moved = true;
          if (gesture.kind === 'pan') {
            setPanning(true);
          }
        }
        if (gesture.moved && gesture.kind === 'tap' && gesture.touch) {
          clear();
          return;
        }
        if (gesture.moved && gesture.kind === 'pan') {
          gesture.lastX = event.clientX;
          gesture.lastY = event.clientY;
          rendererRef.current?.panByPixels(deltaX, deltaY);
          trackReadout(event);
          return;
        }
      }
      if (measuring && gesture?.kind !== 'pan') {
        const position = sampleAt(event);
        if (position) {
          previewPoint(position);
        }
      }
      trackReadout(event);
    },
    [clear, measuring, previewPoint, rendererRef, sampleAt, trackReadout]
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>): void => {
      if (event.pointerType === 'touch') {
        pointersRef.current.delete(event.pointerId);
      }
      const pinch = pinchRef.current;
      if (pinch?.pointerIds.includes(event.pointerId)) {
        pinchRef.current = undefined;
        gestureRef.current = undefined;
        setPanning(false);
        clear();
        ignoreTouchRef.current = pointersRef.current.size > 0;
        return;
      }
      if (event.pointerType === 'touch' && ignoreTouchRef.current) {
        if (pointersRef.current.size === 0) {
          ignoreTouchRef.current = false;
        }
        return;
      }
      const gesture = gestureRef.current;
      if (gesture?.pointerId !== event.pointerId) {
        return;
      }
      gestureRef.current = undefined;
      setPanning(false);
      if (gesture.kind === 'measure') {
        if (gesture.touch) {
          clear();
        }
        return;
      }
      if (gesture.moved || gesture.button === 1) {
        if (gesture.touch) {
          clear();
        }
        return;
      }
      if (!pinning) {
        if (gesture.touch) {
          clear();
        }
        return;
      }
      const position = sampleAt(event);
      if (position) {
        togglePin(position);
      }
    },
    [clear, pinning, sampleAt, togglePin]
  );

  const handlePointerCancel = useCallback((): void => {
    if (gestureRef.current?.kind === 'measure') {
      clearPreview();
    }
    gestureRef.current = undefined;
    pinchRef.current = undefined;
    pointersRef.current.clear();
    ignoreTouchRef.current = false;
    setPanning(false);
    clear();
  }, [clear, clearPreview]);

  const handleContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement>): void => {
      if (!measuring) {
        return;
      }
      event.preventDefault();
      finish();
    },
    [finish, measuring]
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLCanvasElement>): void => {
      const renderer = rendererRef.current;
      if (!zoomable || !renderer) {
        return;
      }
      const panStep = 24;
      switch (event.key) {
        case 'ArrowLeft':
          renderer.panByPixels(panStep, 0);
          break;
        case 'ArrowRight':
          renderer.panByPixels(-panStep, 0);
          break;
        case 'ArrowUp':
          renderer.panByPixels(0, panStep);
          break;
        case 'ArrowDown':
          renderer.panByPixels(0, -panStep);
          break;
        case '+':
        case '=':
          renderer.zoomIn();
          break;
        case '-':
        case '_':
          renderer.zoomOut();
          break;
        case '0':
          renderer.resetView();
          break;
        default:
          return;
      }
      event.preventDefault();
    },
    [rendererRef, zoomable]
  );

  const handlers = useMemo(
    () => ({
      onPointerMove: handlePointerMove,
      onPointerDown: handlePointerDown,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      onContextMenu: handleContextMenu,
      onKeyDown: handleKeyDown,
    }),
    [
      handleContextMenu,
      handleKeyDown,
      handlePointerCancel,
      handlePointerDown,
      handlePointerMove,
      handlePointerUp,
    ]
  );

  return { handlers, panning };
}
