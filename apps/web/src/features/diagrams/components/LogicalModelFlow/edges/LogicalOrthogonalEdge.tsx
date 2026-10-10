import { BaseEdge, type Edge, type EdgeProps, Position, useReactFlow } from '@xyflow/react';
import { useEffect, useState } from 'react';
import styles from './LogicalOrthogonalEdge.module.css';

export type LogicalOrthogonalEdgeData = {
  routeOffset?: number;
  onUpdateRoute?: (edgeId: string, routeOffset: number) => void;
};

type Segment = 'vertical' | 'horizontal';

export function LogicalOrthogonalEdge({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  selected,
  style,
  label,
  data,
}: EdgeProps<Edge<LogicalOrthogonalEdgeData>>) {
  const { getViewport } = useReactFlow();
  const [routeOffset, setRouteOffset] = useState(data?.routeOffset ?? 0);
  const [dragging, setDragging] = useState<{
    segment: Segment;
    startClientX: number;
    startClientY: number;
    startOffset: number;
  } | null>(null);

  useEffect(() => {
    if (!dragging) setRouteOffset(data?.routeOffset ?? 0);
  }, [data?.routeOffset, dragging]);

  const bendX = defaultBendX(sourceX, sourcePosition, targetX, targetPosition) + routeOffset;
  const path = `M ${sourceX} ${sourceY} L ${bendX} ${sourceY} L ${bendX} ${targetY} L ${targetX} ${targetY}`;
  const horizontalSource = `M ${sourceX} ${sourceY} L ${bendX} ${sourceY}`;
  const verticalMiddle = `M ${bendX} ${sourceY} L ${bendX} ${targetY}`;
  const horizontalTarget = `M ${bendX} ${targetY} L ${targetX} ${targetY}`;

  function startDragging(segment: Segment, event: React.PointerEvent<SVGPathElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging({
      segment,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffset: routeOffset,
    });
  }

  function moveDragging(event: React.PointerEvent<SVGPathElement>) {
    if (!dragging) return;

    const zoom = getViewport().zoom || 1;
    const delta =
      dragging.segment === 'vertical'
        ? (event.clientX - dragging.startClientX) / zoom
        : (event.clientY - dragging.startClientY) / zoom;
    setRouteOffset(dragging.startOffset + delta);
  }

  function finishDragging(event: React.PointerEvent<SVGPathElement>) {
    if (!dragging) return;

    event.stopPropagation();
    event.currentTarget.releasePointerCapture(event.pointerId);
    data?.onUpdateRoute?.(id, routeOffset);
    setDragging(null);
  }

  return (
    <>
      <BaseEdge
        id={id}
        className='diagram-export-logical-edge'
        path={path}
        label={label}
        interactionWidth={20}
        style={style}
      />
      {selected && (
        <>
          <path
            d={horizontalSource}
            data-export-editor-control
            className={`${styles.segmentHitArea} ${styles.horizontalSegment}`}
            onPointerDown={(event) => startDragging('horizontal', event)}
            onPointerMove={moveDragging}
            onPointerUp={finishDragging}
            onPointerCancel={finishDragging}
          />
          <path
            d={verticalMiddle}
            data-export-editor-control
            className={`${styles.segmentHitArea} ${styles.verticalSegment}`}
            onPointerDown={(event) => startDragging('vertical', event)}
            onPointerMove={moveDragging}
            onPointerUp={finishDragging}
            onPointerCancel={finishDragging}
          />
          <path
            d={horizontalTarget}
            data-export-editor-control
            className={`${styles.segmentHitArea} ${styles.horizontalSegment}`}
            onPointerDown={(event) => startDragging('horizontal', event)}
            onPointerMove={moveDragging}
            onPointerUp={finishDragging}
            onPointerCancel={finishDragging}
          />
        </>
      )}
    </>
  );
}

function defaultBendX(sourceX: number, sourcePosition: Position, targetX: number, targetPosition: Position) {
  if (sourcePosition === Position.Left && targetPosition === Position.Left) {
    return Math.min(sourceX, targetX) - 60;
  }

  if (sourcePosition === Position.Right && targetPosition === Position.Right) {
    return Math.max(sourceX, targetX) + 60;
  }

  return (sourceX + targetX) / 2;
}
