import { BaseEdge, type Edge, type EdgeProps } from '@xyflow/react';
import type { EditableEdgeData } from '../flow.types';
import { EdgeControlPointsEditor, useEditableEdgePath } from './editable-edge';

type AttributeEdgeDefinition = Edge<EditableEdgeData, 'attribute'>;

/** Usa o mesmo BaseEdge e a mesma hitbox padrão das conexões de relacionamento. */
export function AttributeEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<AttributeEdgeDefinition>) {
  const { path } = useEditableEdgePath({
    edgeId: id,
    selected,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    ...data,
  });

  return (
    <>
      <BaseEdge
        id={id}
        className='diagram-export-attribute-edge'
        path={path}
        style={{
          stroke: selected ? '#64748b' : '#94a3b8',
          strokeWidth: selected ? 2 : 1.5,
          filter: selected ? 'drop-shadow(0 0 3px rgb(100 116 139 / 35%))' : undefined,
        }}
      />
      <EdgeControlPointsEditor
        edgeId={id}
        selected={selected}
        source={source}
        target={target}
        sourceX={sourceX}
        sourceY={sourceY}
        targetX={targetX}
        targetY={targetY}
        sourcePosition={sourcePosition}
        targetPosition={targetPosition}
        {...data}
      />
    </>
  );
}
