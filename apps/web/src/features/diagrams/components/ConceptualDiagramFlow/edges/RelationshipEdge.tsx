import { BaseEdge, type Edge, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react';
import type { RelationshipEdgeData } from '../flow.types';
import { EdgeControlPointsEditor, useEditableEdgePath } from './editable-edge';
import styles from './RelationshipEdge.module.css';

type RelationshipEdgeDefinition = Edge<RelationshipEdgeData>;

export function RelationshipEdge({
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
}: EdgeProps<RelationshipEdgeDefinition>) {
  const { path: edgePath, labelPosition } = useEditableEdgePath({
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
  const participant = data?.relationship.participants.find((item) => item.entityId === data.entityId);

  const edgeStyle = {
    stroke: selected ? '#c2410c' : undefined,
    strokeWidth: selected ? 2 : undefined,
    filter: selected ? 'drop-shadow(0 0 3px rgb(194 65 12 / 35%))' : undefined,
  };

  if (!data || !participant) return <BaseEdge id={id} path={edgePath} style={edgeStyle} />;

  const entityIsSource = source === data.entityId;
  const entityX = entityIsSource ? sourceX : targetX;
  const entityY = entityIsSource ? sourceY : targetY;

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={edgeStyle} />
      <EdgeLabelRenderer>
        <button
          className={`${styles.cardinality} nodrag nopan`}
          style={{
            transform: `translate(-50%, -50%) translate(${entityX + (labelPosition.x - entityX) * 0.38}px, ${entityY + (labelPosition.y - entityY) * 0.38}px)`,
          }}
          type='button'
          onClick={() => data.onCycleRelationshipCardinality(data.relationship.id, data.entityId)}
          title='Alternar cardinalidade'
        >
          {participant.cardinality}
        </button>
      </EdgeLabelRenderer>
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
