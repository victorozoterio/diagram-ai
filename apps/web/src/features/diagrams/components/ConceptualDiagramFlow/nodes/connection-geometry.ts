import { Position } from '@xyflow/react';

export type ConnectionGeometry = 'rectangle' | 'ellipse' | 'diamond' | 'triangle';
export type ConnectionSide = 'left' | 'right' | 'top' | 'bottom';
export type ConnectionSize = { width: number; height: number };
export type ConnectionPoint = { x: number; y: number; position: Position };
export type ConnectionAnchor = { xRatio: number; yRatio: number };
export type ConnectionVector = { x: number; y: number };

const OFFSETS = [25, 50, 75] as const;
const DEFAULT_SIZE = { width: 112, height: 112 };

const sidePositions: Record<ConnectionSide, Position> = {
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
  bottom: Position.Bottom,
};

function interpolate(start: { x: number; y: number }, end: { x: number; y: number }, amount: number) {
  return {
    x: start.x + (end.x - start.x) * amount,
    y: start.y + (end.y - start.y) * amount,
  };
}

function diamondVertices(size: ConnectionSize) {
  const width = Math.max(1, size.width);
  const height = Math.max(1, size.height);
  const center = { x: width / 2, y: height / 2 };
  const halfWidth = (width * (1 - 2 * 0.18)) / 2;
  const halfHeight = (height * (1 - 2 * 0.18)) / 2;
  const rotate = Math.SQRT1_2;

  const rotatePoint = (x: number, y: number) => ({
    x: center.x + x * rotate - y * rotate,
    y: center.y + x * rotate + y * rotate,
  });

  return {
    top: rotatePoint(-halfWidth, -halfHeight),
    right: rotatePoint(halfWidth, -halfHeight),
    bottom: rotatePoint(halfWidth, halfHeight),
    left: rotatePoint(-halfWidth, halfHeight),
  };
}

function triangleVertices(size: ConnectionSize) {
  return {
    top: { x: size.width * (51 / 102), y: size.height * (3 / 86) },
    right: { x: size.width * (99 / 102), y: size.height * (83 / 86) },
    bottom: { x: size.width / 2, y: size.height * (83 / 86) },
    left: { x: size.width * (3 / 102), y: size.height * (83 / 86) },
  };
}

function ellipsePoint(size: ConnectionSize, angleInDegrees: number): ConnectionPoint {
  const angle = (angleInDegrees * Math.PI) / 180;
  const centerX = size.width / 2;
  const centerY = size.height / 2;

  return {
    x: centerX + (size.width / 2) * Math.cos(angle),
    y: centerY + (size.height / 2) * Math.sin(angle),
    position:
      angleInDegrees >= 270 || angleInDegrees < 330
        ? Position.Top
        : angleInDegrees >= 330 || angleInDegrees < 30
          ? Position.Right
          : angleInDegrees >= 30 && angleInDegrees < 150
            ? Position.Bottom
            : Position.Left,
  };
}

function ellipsePoints(size: ConnectionSize) {
  const anglesBySide: Record<ConnectionSide, [number, number, number]> = {
    top: [240, 270, 300],
    right: [330, 0, 30],
    bottom: [60, 90, 120],
    left: [150, 180, 210],
  };

  return Object.fromEntries(
    Object.entries(anglesBySide).map(([side, angles]) => [side, angles.map((angle) => ellipsePoint(size, angle))]),
  ) as Record<ConnectionSide, ConnectionPoint[]>;
}

function shapePoints(geometry: Exclude<ConnectionGeometry, 'rectangle'>, size: ConnectionSize) {
  if (geometry === 'ellipse') return ellipsePoints(size);
  const vertices = geometry === 'diamond' ? diamondVertices(size) : triangleVertices(size);

  if (geometry === 'diamond') {
    return {
      top: [
        { ...interpolate(vertices.left, vertices.top, 0.5), position: Position.Top },
        { ...vertices.top, position: Position.Top },
        { ...interpolate(vertices.top, vertices.right, 0.5), position: Position.Top },
      ],
      right: [
        { ...interpolate(vertices.top, vertices.right, 0.5), position: Position.Right },
        { ...vertices.right, position: Position.Right },
        { ...interpolate(vertices.right, vertices.bottom, 0.5), position: Position.Right },
      ],
      bottom: [
        { ...interpolate(vertices.right, vertices.bottom, 0.5), position: Position.Bottom },
        { ...vertices.bottom, position: Position.Bottom },
        { ...interpolate(vertices.bottom, vertices.left, 0.5), position: Position.Bottom },
      ],
      left: [
        { ...interpolate(vertices.bottom, vertices.left, 0.5), position: Position.Left },
        { ...vertices.left, position: Position.Left },
        { ...interpolate(vertices.left, vertices.top, 0.5), position: Position.Left },
      ],
    } satisfies Record<ConnectionSide, ConnectionPoint[]>;
  }

  const baseRight = interpolate(vertices.left, vertices.right, 0.75);
  const baseCenter = interpolate(vertices.left, vertices.right, 0.5);
  const baseLeft = interpolate(vertices.left, vertices.right, 0.25);

  return {
    top: [
      { ...interpolate(vertices.top, vertices.left, 0.5), position: Position.Top },
      { ...vertices.top, position: Position.Top },
      { ...interpolate(vertices.top, vertices.right, 0.5), position: Position.Top },
    ],
    right: [
      { ...interpolate(vertices.top, vertices.right, 0.35), position: Position.Right },
      { ...interpolate(vertices.top, vertices.right, 0.7), position: Position.Right },
      { ...baseRight, position: Position.Bottom },
    ],
    bottom: [
      { ...baseRight, position: Position.Bottom },
      { ...baseCenter, position: Position.Bottom },
      { ...baseLeft, position: Position.Bottom },
    ],
    left: [
      { ...baseLeft, position: Position.Bottom },
      { ...interpolate(vertices.left, vertices.top, 0.7), position: Position.Left },
      { ...interpolate(vertices.left, vertices.top, 0.35), position: Position.Left },
    ],
  } satisfies Record<ConnectionSide, ConnectionPoint[]>;
}

export function connectionPoint(
  geometry: ConnectionGeometry,
  side: ConnectionSide,
  offset: number,
  size: ConnectionSize = DEFAULT_SIZE,
): ConnectionPoint {
  if (geometry === 'rectangle') {
    return side === 'left' || side === 'right'
      ? { x: side === 'left' ? 0 : size.width, y: (size.height * offset) / 100, position: sidePositions[side] }
      : { x: (size.width * offset) / 100, y: side === 'top' ? 0 : size.height, position: sidePositions[side] };
  }

  const index = OFFSETS.indexOf(offset as (typeof OFFSETS)[number]);
  return shapePoints(geometry, size)[side][index === -1 ? 1 : index];
}

export function connectionAnchorFromHandleId(
  handleId: string | undefined,
  geometry: ConnectionGeometry = 'rectangle',
  size: ConnectionSize = DEFAULT_SIZE,
): ConnectionAnchor {
  const side = handleId?.match(/(?:^|-)(left|right|top|bottom)(?:-|$)/)?.[1] as ConnectionSide | undefined;
  const offsetMatch = handleId?.match(/(?:^|-)((?:25|50|75))(?:$)/);
  const offset = offsetMatch ? Number(offsetMatch[1]) : 50;

  if (!side) return { xRatio: 0.5, yRatio: 0.5 };

  const point = connectionPoint(geometry, side, offset, size);
  return { xRatio: point.x / Math.max(1, size.width), yRatio: point.y / Math.max(1, size.height) };
}

export function connectionGeometryFromHandleId(handleId: string | undefined): ConnectionGeometry {
  if (handleId?.startsWith('attribute-')) return 'ellipse';
  if (handleId?.startsWith('source-') || handleId?.startsWith('target-')) return 'diamond';
  return 'rectangle';
}

export function smoothConnectionControlPoints(
  source: ConnectionVector,
  target: ConnectionVector,
  sourceDirection?: ConnectionVector,
) {
  const travel = normalizeVector({ x: target.x - source.x, y: target.y - source.y });
  const startDirection = normalizeVector(sourceDirection ?? travel);
  const distance = Math.hypot(target.x - source.x, target.y - source.y);
  const offset = Math.max(36, Math.min(160, distance * 0.35));

  return {
    controlPoint1: {
      x: source.x + startDirection.x * offset,
      y: source.y + startDirection.y * offset,
    },
    controlPoint2: {
      x: target.x - travel.x * offset,
      y: target.y - travel.y * offset,
    },
  };
}

function normalizeVector(vector: ConnectionVector): ConnectionVector {
  const length = Math.hypot(vector.x, vector.y);
  return length > 0 ? { x: vector.x / length, y: vector.y / length } : { x: 1, y: 0 };
}
