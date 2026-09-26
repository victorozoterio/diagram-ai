import type { ConnectionLineComponentProps } from '@xyflow/react';
import { smoothConnectionControlPoints } from '../nodes/connection-geometry';

export function ChenConnectionLine({
  connectionLineStyle,
  fromNode,
  fromX,
  fromY,
  toX,
  toY,
}: ConnectionLineComponentProps) {
  const sourceCenter = {
    x: fromNode.internals.positionAbsolute.x + (fromNode.measured.width ?? fromNode.width ?? 0) / 2,
    y: fromNode.internals.positionAbsolute.y + (fromNode.measured.height ?? fromNode.height ?? 0) / 2,
  };
  const controlPoints = smoothConnectionControlPoints(
    { x: fromX, y: fromY },
    { x: toX, y: toY },
    { x: fromX - sourceCenter.x, y: fromY - sourceCenter.y },
  );
  const path = `M ${fromX},${fromY} C ${controlPoints.controlPoint1.x},${controlPoints.controlPoint1.y} ${controlPoints.controlPoint2.x},${controlPoints.controlPoint2.y} ${toX},${toY}`;

  return <path className='react-flow__connection-path' d={path} style={{ fill: 'none', ...connectionLineStyle }} />;
}
