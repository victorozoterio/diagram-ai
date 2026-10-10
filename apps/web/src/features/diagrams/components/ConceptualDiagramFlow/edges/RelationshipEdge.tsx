import { BaseEdge, type Edge, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react';
import type { RelationshipEdgeData } from '../flow.types';
import { relationshipCardinalityForEntity } from '../relationship-cardinality';
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
  const participantCardinality = data ? relationshipCardinalityForEntity(data.relationship, data.entityId) : undefined;
  const isGeneralization = data?.isGeneralization === true;

  const edgeStyle = {
    stroke: selected ? (isGeneralization ? '#7c3aed' : '#c2410c') : undefined,
    strokeWidth: selected ? 2 : undefined,
    filter: selected
      ? `drop-shadow(0 0 3px ${isGeneralization ? 'rgb(124 58 237 / 35%)' : 'rgb(194 65 12 / 35%)'})`
      : undefined,
  };

  if (!data) return <BaseEdge id={id} className='diagram-export-relationship-edge' path={edgePath} style={edgeStyle} />;

  const entityIsSource = source === data.entityId;
  const entityX = entityIsSource ? sourceX : targetX;
  const entityY = entityIsSource ? sourceY : targetY;

  return (
    <>
      <BaseEdge id={id} className='diagram-export-relationship-edge' path={edgePath} style={edgeStyle} />
      {!isGeneralization && participantCardinality && (
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
            {participantCardinality}
          </button>
        </EdgeLabelRenderer>
      )}
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
