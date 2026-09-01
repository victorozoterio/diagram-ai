import { BaseEdge, type Edge, EdgeLabelRenderer, type EdgeProps, getSmoothStepPath } from '@xyflow/react';
import type { RelationshipEdgeData } from '../flow.types';
import styles from './RelationshipEdge.module.css';

type RelationshipEdgeDefinition = Edge<RelationshipEdgeData>;

export function RelationshipEdge({
  id,
  source,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<RelationshipEdgeDefinition>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const participant = data?.relationship.participants.find((item) => item.entityId === data.entityId);

  if (!data || !participant) return <BaseEdge id={id} path={edgePath} />;

  const entityIsSource = source === data.entityId;
  const entityX = entityIsSource ? sourceX : targetX;
  const entityY = entityIsSource ? sourceY : targetY;

  return (
    <>
      <BaseEdge id={id} path={edgePath} />
      <EdgeLabelRenderer>
        <button
          className={`${styles.cardinality} nodrag nopan`}
          style={{
            transform: `translate(-50%, -50%) translate(${entityX + (labelX - entityX) * 0.38}px, ${entityY + (labelY - entityY) * 0.38}px)`,
          }}
          type='button'
          onClick={() => data.onCycleRelationshipCardinality(data.relationship.id, data.entityId)}
          title='Alternar cardinalidade'
        >
          {participant.cardinality}
        </button>
      </EdgeLabelRenderer>
    </>
  );
}
