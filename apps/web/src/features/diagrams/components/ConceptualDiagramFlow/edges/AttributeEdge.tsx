import { BaseEdge, type Edge, type EdgeProps, getStraightPath } from '@xyflow/react';

type AttributeEdgeDefinition = Edge<Record<string, never>, 'attribute'>;

/** Usa o mesmo BaseEdge e a mesma hitbox padrão das conexões de relacionamento. */
export function AttributeEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
}: EdgeProps<AttributeEdgeDefinition>) {
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke: selected ? '#64748b' : '#94a3b8',
        strokeWidth: selected ? 2 : 1.5,
        filter: selected ? 'drop-shadow(0 0 3px rgb(100 116 139 / 35%))' : undefined,
      }}
    />
  );
}
