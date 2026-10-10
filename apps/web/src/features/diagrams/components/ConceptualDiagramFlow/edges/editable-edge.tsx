import { BaseEdge, EdgeLabelRenderer, type Node, Position, useInternalNode, useReactFlow } from '@xyflow/react';
import { useEffect, useRef, useState } from 'react';
import type { DiagramPosition, EdgeControlPoints } from '../../../hooks/editor/editor.types';
import type { EdgeReconnectConnection } from '../flow.types';
import { smoothConnectionControlPoints } from '../nodes/connection-geometry';

type EdgePointProps = {
  edgeId: string;
  selected?: boolean;
  source: string;
  target: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  sourceHandleId?: string;
  targetHandleId?: string;
  sourceAnchor?: { xRatio: number; yRatio: number };
  targetAnchor?: { xRatio: number; yRatio: number };
  controlPoints?: EdgeControlPoints;
  onControlPointsChange?: (edgeId: string, controlPoints: EdgeControlPoints) => void;
  onControlPointsCommit?: (edgeId: string, controlPoints: EdgeControlPoints) => void;
  onReconnect?: (connection: EdgeReconnectConnection) => void;
};

export function useEditableEdgePath({
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourceHandleId,
  targetHandleId,
  sourceAnchor,
  targetAnchor,
  controlPoints,
}: EdgePointProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const start = nodeAnchorPoint(sourceNode, sourceAnchor ?? anchorFromHandleId(sourceHandleId), sourceX, sourceY);
  const end = nodeAnchorPoint(targetNode, targetAnchor ?? anchorFromHandleId(targetHandleId), targetX, targetY);
  const points = controlPoints ?? defaultControlPoints(start, end, sourceNode);

  return {
    path: `M ${start.x},${start.y} C ${points.controlPoint1.x},${points.controlPoint1.y} ${points.controlPoint2.x},${points.controlPoint2.y} ${end.x},${end.y}`,
    points,
    labelPosition: cubicPointAt(start, points.controlPoint1, points.controlPoint2, end, 0.5),
  };
}

export function EdgeControlPointsEditor({
  edgeId,
  selected,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourceHandleId,
  targetHandleId,
  sourceAnchor,
  targetAnchor,
  controlPoints,
  onControlPointsChange,
  onControlPointsCommit,
  onReconnect,
}: EdgePointProps) {
  const { getNodes, screenToFlowPosition } = useReactFlow();
  const [endpointDrag, setEndpointDrag] = useState<{
    endpoint: 'source' | 'target';
    position: DiagramPosition;
  } | null>(null);
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const start = nodeAnchorPoint(sourceNode, sourceAnchor ?? anchorFromHandleId(sourceHandleId), sourceX, sourceY);
  const end = nodeAnchorPoint(targetNode, targetAnchor ?? anchorFromHandleId(targetHandleId), targetX, targetY);
  const points = controlPoints ?? defaultControlPoints(start, end, sourceNode);
  const curvePoint1 = cubicPointAt(start, points.controlPoint1, points.controlPoint2, end, 1 / 3);
  const curvePoint2 = cubicPointAt(start, points.controlPoint1, points.controlPoint2, end, 2 / 3);
  const pointsRef = useRef(points);

  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  if (!selected || !onControlPointsChange || !onControlPointsCommit) return null;

  const beginDrag = (point: keyof EdgeControlPoints) => (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const updatePoint = (moveEvent: PointerEvent) => {
      const position = screenToFlowPosition({ x: moveEvent.clientX, y: moveEvent.clientY });
      const next = moveCurvePointTo(point, position, start, end, pointsRef.current);
      pointsRef.current = next;
      onControlPointsChange(edgeId, next);
    };
    const finishDrag = (upEvent: PointerEvent) => {
      updatePoint(upEvent);
      onControlPointsCommit(edgeId, pointsRef.current);
      window.removeEventListener('pointermove', updatePoint);
      window.removeEventListener('pointerup', finishDrag);
    };

    window.addEventListener('pointermove', updatePoint);
    window.addEventListener('pointerup', finishDrag, { once: true });
  };

  const beginEndpointDrag = (endpoint: 'source' | 'target') => (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!onReconnect) return;

    event.preventDefault();
    event.stopPropagation();
    setEndpointDrag({
      endpoint,
      position: endpoint === 'source' ? start : end,
    });

    const updateEndpoint = (moveEvent: PointerEvent) => {
      setEndpointDrag({
        endpoint,
        position: screenToFlowPosition({ x: moveEvent.clientX, y: moveEvent.clientY }),
      });
    };
    const finishEndpoint = (upEvent: PointerEvent) => {
      const position = screenToFlowPosition({ x: upEvent.clientX, y: upEvent.clientY });
      const handle = closestHandle(getNodes(), position);
      if (handle) {
        onReconnect(
          endpoint === 'source'
            ? {
                source: handle.nodeId,
                sourceHandle: handle.handleId,
                target,
                targetHandle: targetHandleId ?? null,
              }
            : {
                source,
                sourceHandle: sourceHandleId ?? null,
                target: handle.nodeId,
                targetHandle: handle.handleId,
              },
        );
      }
      setEndpointDrag(null);
      window.removeEventListener('pointermove', updateEndpoint);
      window.removeEventListener('pointerup', finishEndpoint);
    };

    window.addEventListener('pointermove', updateEndpoint);
    window.addEventListener('pointerup', finishEndpoint, { once: true });
  };

  const previewPath = endpointDrag
    ? endpointDrag.endpoint === 'source'
      ? `M ${endpointDrag.position.x},${endpointDrag.position.y} L ${end.x},${end.y}`
      : `M ${start.x},${start.y} L ${endpointDrag.position.x},${endpointDrag.position.y}`
    : null;

  return (
    <>
      {previewPath && (
        <BaseEdge
          id={`${edgeId}-reconnect-preview`}
          path={previewPath}
          style={{ stroke: '#64748b', strokeDasharray: '4 4', strokeWidth: 1.5, pointerEvents: 'none' }}
        />
      )}
      <EdgeLabelRenderer>
        {onReconnect &&
          (['source', 'target'] as const).map((endpoint) => {
            const position = endpoint === 'source' ? start : end;
            return (
              <button
                key={endpoint}
                className='nodrag nopan nowheel'
                data-export-editor-control
                type='button'
                aria-label='Reconectar extremidade da conexão'
                style={controlButtonStyle(position, 'crosshair')}
                onPointerDown={beginEndpointDrag(endpoint)}
              >
                <span aria-hidden='true' style={endpointControlStyle} />
              </button>
            );
          })}
        {[
          { key: 'controlPoint1' as const, position: curvePoint1 },
          { key: 'controlPoint2' as const, position: curvePoint2 },
        ].map(({ key, position }) => (
          <button
            key={key}
            className='nodrag nopan nowheel'
            data-export-editor-control
            type='button'
            aria-label='Ajustar curvatura da conexão'
            style={controlButtonStyle(position, 'grab')}
            onPointerDown={beginDrag(key)}
          >
            <span aria-hidden='true' style={curveControlStyle} />
          </button>
        ))}
      </EdgeLabelRenderer>
    </>
  );
}

function defaultControlPoints(
  source: DiagramPosition,
  target: DiagramPosition,
  sourceNode: ReturnType<typeof useInternalNode>,
): EdgeControlPoints {
  const sourceCenter = sourceNode
    ? {
        x: sourceNode.internals.positionAbsolute.x + (sourceNode.measured.width ?? sourceNode.width ?? 0) / 2,
        y: sourceNode.internals.positionAbsolute.y + (sourceNode.measured.height ?? sourceNode.height ?? 0) / 2,
      }
    : undefined;

  return smoothConnectionControlPoints(
    source,
    target,
    sourceCenter ? { x: source.x - sourceCenter.x, y: source.y - sourceCenter.y } : undefined,
  );
}

function cubicPointAt(
  source: DiagramPosition,
  controlPoint1: DiagramPosition,
  controlPoint2: DiagramPosition,
  target: DiagramPosition,
  t: number,
) {
  const inverse = 1 - t;
  return {
    x:
      inverse ** 3 * source.x +
      3 * inverse ** 2 * t * controlPoint1.x +
      3 * inverse * t ** 2 * controlPoint2.x +
      t ** 3 * target.x,
    y:
      inverse ** 3 * source.y +
      3 * inverse ** 2 * t * controlPoint1.y +
      3 * inverse * t ** 2 * controlPoint2.y +
      t ** 3 * target.y,
  };
}

function moveCurvePointTo(
  point: keyof EdgeControlPoints,
  position: DiagramPosition,
  source: DiagramPosition,
  target: DiagramPosition,
  controlPoints: EdgeControlPoints,
): EdgeControlPoints {
  const t = point === 'controlPoint1' ? 1 / 3 : 2 / 3;
  const inverse = 1 - t;
  const sourceWeight = inverse ** 3;
  const firstControlWeight = 3 * inverse ** 2 * t;
  const secondControlWeight = 3 * inverse * t ** 2;
  const targetWeight = t ** 3;

  if (point === 'controlPoint1') {
    return {
      ...controlPoints,
      controlPoint1: {
        x:
          (position.x -
            sourceWeight * source.x -
            secondControlWeight * controlPoints.controlPoint2.x -
            targetWeight * target.x) /
          firstControlWeight,
        y:
          (position.y -
            sourceWeight * source.y -
            secondControlWeight * controlPoints.controlPoint2.y -
            targetWeight * target.y) /
          firstControlWeight,
      },
    };
  }

  return {
    ...controlPoints,
    controlPoint2: {
      x:
        (position.x -
          sourceWeight * source.x -
          firstControlWeight * controlPoints.controlPoint1.x -
          targetWeight * target.x) /
        secondControlWeight,
      y:
        (position.y -
          sourceWeight * source.y -
          firstControlWeight * controlPoints.controlPoint1.y -
          targetWeight * target.y) /
        secondControlWeight,
    },
  };
}

function anchorFromHandleId(handleId?: string) {
  const side = handleId?.match(/(?:^|-)(left|right|top|bottom)(?:-|$)/)?.[1];
  const offsetMatch = handleId?.match(/(?:^|-)((?:25|50|75))(?:$)/);
  const offset = offsetMatch ? Number(offsetMatch[1]) / 100 : 0.5;

  if (side === 'left') return { xRatio: 0, yRatio: offset };
  if (side === 'right') return { xRatio: 1, yRatio: offset };
  if (side === 'top') return { xRatio: offset, yRatio: 0 };
  return { xRatio: offset, yRatio: 1 };
}

function nodeAnchorPoint(
  node: ReturnType<typeof useInternalNode>,
  anchor: { xRatio: number; yRatio: number },
  fallbackX: number,
  fallbackY: number,
) {
  if (!node) return { x: fallbackX, y: fallbackY };

  const width = node.measured.width ?? node.width;
  const height = node.measured.height ?? node.height;
  if (!width || !height) return { x: fallbackX, y: fallbackY };

  return {
    x: node.internals.positionAbsolute.x + width * anchor.xRatio,
    y: node.internals.positionAbsolute.y + height * anchor.yRatio,
  };
}

type ReconnectHandle = { nodeId: string; handleId: string };

function closestHandle(nodes: Node[], position: DiagramPosition): ReconnectHandle | null {
  let closest: (ReconnectHandle & { distance: number }) | null = null;
  const sides = ['left', 'right', 'top', 'bottom'] as const;
  const offsets = [0.25, 0.5, 0.75];

  for (const node of nodes) {
    const width = node.measured?.width ?? node.width;
    const height = node.measured?.height ?? node.height;
    if (!width || !height) continue;

    const prefix = node.type === 'relationship' ? 'relationship' : node.type === 'attribute' ? 'attribute' : 'entity';

    for (const side of sides) {
      for (const offset of offsets) {
        const point = handlePoint(node.position, width, height, side, offset);
        const distance = Math.hypot(position.x - point.x, position.y - point.y);
        if (distance > 18 || (closest && distance >= closest.distance)) continue;

        closest = {
          nodeId: node.id,
          handleId: handleIdFor(prefix, side, offset),
          distance,
        };
      }
    }
  }

  return closest ? { nodeId: closest.nodeId, handleId: closest.handleId } : null;
}

function handlePoint(
  nodePosition: DiagramPosition,
  width: number,
  height: number,
  side: 'left' | 'right' | 'top' | 'bottom',
  offset: number,
) {
  if (side === 'left') return { x: nodePosition.x, y: nodePosition.y + height * offset };
  if (side === 'right') return { x: nodePosition.x + width, y: nodePosition.y + height * offset };
  if (side === 'top') return { x: nodePosition.x + width * offset, y: nodePosition.y };
  return { x: nodePosition.x + width * offset, y: nodePosition.y + height };
}

function handleIdFor(prefix: string, side: 'left' | 'right' | 'top' | 'bottom', offset: number) {
  if (prefix === 'relationship' && offset === 0.5) {
    if (side === 'left') return 'target-left';
    if (side === 'right') return 'source-right';
    if (side === 'top') return 'source-top';
    return 'source-bottom';
  }

  return offset === 0.5 ? `${prefix}-${side}` : `${prefix}-${side}-${offset * 100}`;
}

function controlButtonStyle(position: DiagramPosition, cursor: string) {
  return {
    position: 'absolute' as const,
    zIndex: 4,
    display: 'grid',
    width: 20,
    height: 20,
    padding: 0,
    border: 0,
    placeItems: 'center',
    background: 'transparent',
    cursor,
    pointerEvents: 'all' as const,
    transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)`,
  };
}

const endpointControlStyle = {
  width: 9,
  height: 9,
  border: '1px solid #334155',
  borderRadius: '50%',
  background: '#e2e8f0',
};

const curveControlStyle = {
  width: 8,
  height: 8,
  border: '1px solid #64748b',
  borderRadius: '50%',
  background: '#ffffff',
};
