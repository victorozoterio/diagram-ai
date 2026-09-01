import { BaseEdge, type Edge, type EdgeProps, useInternalNode } from '@xyflow/react';

type AttributeEdgeDefinition = Edge<Record<string, never>, 'attribute'>;
type Point = { x: number; y: number };
type NodeBounds = Point & { width: number; height: number };

/**
 * Desenha a ligação atributo-entidade a partir das interseções reais das formas.
 * Isso evita que o traço fique preso aos handles centrais dos quatro lados.
 */
export function AttributeEdge({ id, source, target }: EdgeProps<AttributeEdgeDefinition>) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  const entityBounds = nodeBounds(sourceNode);
  const attributeBounds = nodeBounds(targetNode);
  const entityCenter = centerOf(entityBounds);
  const attributeCenter = centerOf(attributeBounds);
  const sourcePoint = rectangleIntersection(entityBounds, attributeCenter);
  const targetPoint = ellipseIntersection(attributeBounds, entityCenter);
  const path = `M ${sourcePoint.x},${sourcePoint.y} L ${targetPoint.x},${targetPoint.y}`;

  return <BaseEdge id={id} path={path} style={{ stroke: '#94a3b8' }} />;
}

function nodeBounds(node: NonNullable<ReturnType<typeof useInternalNode>>): NodeBounds {
  return {
    x: node.internals.positionAbsolute.x,
    y: node.internals.positionAbsolute.y,
    width: node.measured.width ?? node.width ?? 0,
    height: node.measured.height ?? node.height ?? 0,
  };
}

function centerOf(bounds: NodeBounds): Point {
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

function rectangleIntersection(bounds: NodeBounds, toward: Point): Point {
  const center = centerOf(bounds);
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  const scale = Math.min(
    bounds.width / 2 / Math.max(Math.abs(dx), Number.EPSILON),
    bounds.height / 2 / Math.max(Math.abs(dy), Number.EPSILON),
  );

  return { x: center.x + dx * scale, y: center.y + dy * scale };
}

function ellipseIntersection(bounds: NodeBounds, toward: Point): Point {
  const center = centerOf(bounds);
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  const radiusX = bounds.width / 2;
  const radiusY = bounds.height / 2;
  const scale = 1 / Math.sqrt((dx / radiusX) ** 2 + (dy / radiusY) ** 2);

  return { x: center.x + dx * scale, y: center.y + dy * scale };
}
