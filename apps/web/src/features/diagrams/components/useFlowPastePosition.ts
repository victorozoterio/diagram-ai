import { type PointerEvent, type RefObject, useCallback, useRef } from 'react';

type FlowPosition = { x: number; y: number };

type FlowPositionConverter = {
  screenToFlowPosition: (position: FlowPosition) => FlowPosition;
};

export function useFlowPastePosition(
  flowWrapperRef: RefObject<HTMLElement | null>,
  getFlowInstance: () => FlowPositionConverter | null,
) {
  const lastPointerPosition = useRef<FlowPosition | null>(null);

  const rememberPointerPosition = useCallback((event: PointerEvent<HTMLElement>) => {
    lastPointerPosition.current = { x: event.clientX, y: event.clientY };
  }, []);

  const getPastePosition = useCallback((): FlowPosition | null => {
    const wrapper = flowWrapperRef.current;
    const flow = getFlowInstance();
    if (!wrapper || !flow) return null;

    return resolveFlowPastePosition(lastPointerPosition.current, wrapper.getBoundingClientRect(), flow);
  }, [flowWrapperRef, getFlowInstance]);

  return { rememberPointerPosition, getPastePosition };
}

export function resolveFlowPastePosition(
  pointer: FlowPosition | null,
  bounds: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom' | 'width' | 'height'>,
  flow: FlowPositionConverter,
): FlowPosition {
  const screenPosition =
    pointer &&
    pointer.x >= bounds.left &&
    pointer.x <= bounds.right &&
    pointer.y >= bounds.top &&
    pointer.y <= bounds.bottom
      ? pointer
      : { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };

  return flow.screenToFlowPosition(screenPosition);
}
