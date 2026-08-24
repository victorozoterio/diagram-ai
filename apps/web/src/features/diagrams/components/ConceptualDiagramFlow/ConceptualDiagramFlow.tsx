import '@xyflow/react/dist/style.css';

import {
  Background,
  BaseEdge,
  type Connection,
  Controls,
  type Edge,
  EdgeLabelRenderer,
  type EdgeProps,
  getSmoothStepPath,
  Handle,
  type Node,
  Position,
  ReactFlow,
} from '@xyflow/react';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { AttributeType, ConceptualModel, Entity, Relationship } from '../../types';
import styles from './ConceptualDiagramFlow.module.css';

type EntityNodeData = Entity & {
  onRemoveEntity?: (entityId: string) => void;
  onSelectEntity?: (entityId: string) => void;
  onUpdateEntity?: (entityId: string, changes: Partial<Pick<Entity, 'name' | 'description'>>) => void;
  isSelected?: boolean;
  onAddAttribute?: (entityId: string) => void;
  selectedAttributeId?: string;
  onSelectAttribute?: (entityId: string, attributeId: string) => void;
  onUpdateAttribute?: (entityId: string, attributeId: string, changes: { name?: string; type?: AttributeType }) => void;
  onRemoveAttribute?: (entityId: string, attributeId: string) => void;
};

type RelationshipEdgeData = {
  relationship: Relationship;
  onUpdateRelationship: (relationshipId: string, changes: { name?: string }) => void;
  onCycleRelationshipCardinality: (relationshipId: string, entityId: string) => void;
};

type RelationshipEdge = Edge<RelationshipEdgeData>;

type ConceptualDiagramFlowProps = {
  model: ConceptualModel;
  onRemoveEntity?: (entityId: string) => void;
  onSelectEntity?: (entityId: string) => void;
  onUpdateEntity?: (entityId: string, changes: Partial<Pick<Entity, 'name' | 'description'>>) => void;
  selectedEntityIds?: string[];
  onAddAttribute?: (entityId: string) => void;
  selectedAttribute?: { entityId: string; attributeId: string } | null;
  onSelectAttribute?: (entityId: string, attributeId: string) => void;
  onUpdateAttribute?: (entityId: string, attributeId: string, changes: { name?: string; type?: AttributeType }) => void;
  onRemoveAttribute?: (entityId: string, attributeId: string) => void;
  onConnectEntities?: (sourceEntityId: string, targetEntityId: string) => void;
  onUpdateRelationship?: (relationshipId: string, changes: { name?: string }) => void;
  onCycleRelationshipCardinality?: (relationshipId: string, entityId: string) => void;
};

const attributeTypes: AttributeType[] = [
  'string',
  'number',
  'boolean',
  'date',
  'datetime',
  'text',
  'decimal',
  'uuid',
  'email',
  'phone',
  'unknown',
];

function RelationshipEdge({
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
}: EdgeProps<RelationshipEdge>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const sourceParticipant = data?.relationship.participants.find((participant) => participant.entityId === source);
  const targetParticipant = data?.relationship.participants.find((participant) => participant.entityId === target);
  const sourceLabelX = sourceX + (labelX - sourceX) * 0.3;
  const sourceLabelY = sourceY + (labelY - sourceY) * 0.3;
  const targetLabelX = targetX + (labelX - targetX) * 0.3;
  const targetLabelY = targetY + (labelY - targetY) * 0.3;

  if (!data || !sourceParticipant || !targetParticipant) {
    return <BaseEdge id={id} path={edgePath} />;
  }

  return (
    <>
      <BaseEdge id={id} path={edgePath} />
      <EdgeLabelRenderer>
        <div
          className={`${styles.relationshipLabel} nodrag nopan`}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
        >
          <input
            className={styles.relationshipNameInput}
            value={data.relationship.name}
            onChange={(event) => data.onUpdateRelationship(id, { name: event.target.value })}
            aria-label='Nome do relacionamento'
          />
        </div>
        <button
          className={`${styles.cardinalityLabel} nodrag nopan`}
          style={{ transform: `translate(-50%, -50%) translate(${sourceLabelX}px, ${sourceLabelY}px)` }}
          type='button'
          onClick={() => data.onCycleRelationshipCardinality(id, source)}
          title='Alternar cardinalidade'
        >
          {sourceParticipant.cardinality}
        </button>
        <button
          className={`${styles.cardinalityLabel} nodrag nopan`}
          style={{ transform: `translate(-50%, -50%) translate(${targetLabelX}px, ${targetLabelY}px)` }}
          type='button'
          onClick={() => data.onCycleRelationshipCardinality(id, target)}
          title='Alternar cardinalidade'
        >
          {targetParticipant.cardinality}
        </button>
      </EdgeLabelRenderer>
    </>
  );
}

function EntityNode({ data }: { data: EntityNodeData }) {
  const [editingField, setEditingField] = useState<'name' | 'description' | null>(null);
  const [draft, setDraft] = useState('');
  const editingInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingField) {
      editingInputRef.current?.focus();
      editingInputRef.current?.select();
    }
  }, [editingField]);

  function startEditing(field: 'name' | 'description') {
    data.onSelectEntity?.(data.id);
    setEditingField(field);
    setDraft(data[field] ?? '');
  }

  function saveEditing() {
    if (!editingField || !data.onUpdateEntity) {
      return;
    }

    const value = draft.trim();

    if (editingField === 'name' && !value) {
      setDraft(data.name);
    } else {
      data.onUpdateEntity(data.id, { [editingField]: value });
    }

    setEditingField(null);
  }

  function handleEditingKeyDown(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (event.key === 'Escape') {
      setEditingField(null);
      return;
    }

    if (event.key === 'Enter' && (editingField === 'name' || !event.shiftKey)) {
      event.preventDefault();
      saveEditing();
    }
  }

  return (
    <div className={`${styles.entityNode} ${data.isSelected ? styles.selectedEntity : ''}`}>
      <div className={styles.entityNodeHeader}>
        {editingField === 'name' ? (
          <input
            className={`${styles.entityNodeTitleInput} nodrag`}
            value={draft}
            ref={(element) => {
              editingInputRef.current = element;
            }}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={saveEditing}
            onKeyDown={handleEditingKeyDown}
            aria-label='Nome da entidade'
          />
        ) : (
          <button
            className={`${styles.entityNodeTitleButton} nodrag`}
            type='button'
            onClick={() => startEditing('name')}
            aria-label={`Editar nome da entidade ${data.name}`}
          >
            <strong className={styles.entityNodeTitle}>{data.name}</strong>
          </button>
        )}

        {data.onRemoveEntity && (
          <button
            className={styles.removeIconButton}
            type='button'
            onClick={() => data.onRemoveEntity?.(data.id)}
            title='Remover entidade'
          >
            ×
          </button>
        )}
      </div>

      {editingField === 'description' ? (
        <textarea
          className={`${styles.entityNodeDescriptionInput} nodrag`}
          value={draft}
          ref={(element) => {
            editingInputRef.current = element;
          }}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={saveEditing}
          onKeyDown={handleEditingKeyDown}
          aria-label='Descrição da entidade'
          rows={3}
        />
      ) : (
        <button
          className={`${styles.entityNodeDescriptionButton} nodrag`}
          type='button'
          onClick={() => startEditing('description')}
          aria-label='Editar descrição da entidade'
        >
          <p className={styles.entityNodeDescription}>{data.description || 'Clique para adicionar uma descrição.'}</p>
        </button>
      )}

      <ul className={styles.attributeList}>
        {data.attributes.map((attribute) => (
          <li
            key={attribute.id}
            className={`${styles.attributeItem} ${data.selectedAttributeId === attribute.id ? styles.selectedAttribute : ''}`}
          >
            <button
              className={styles.attributeSelectButton}
              type='button'
              onClick={() => data.onSelectAttribute?.(data.id, attribute.id)}
            >
              {attribute.identifier && <span className={`${styles.attributeTag} ${styles.primaryTag}`}>PK</span>}

              <span>{attribute.name}</span>

              <small className={styles.attributeType}>{attribute.type}</small>

              {attribute.required && <span className={styles.attributeTag}>obrigatório</span>}
              {attribute.unique && <span className={styles.attributeTag}>único</span>}
              {attribute.multivalued && <span className={styles.attributeTag}>multivalorado</span>}
              {attribute.composite && <span className={styles.attributeTag}>composto</span>}
              {attribute.derived && <span className={styles.attributeTag}>derivado</span>}
            </button>

            {data.selectedAttributeId === attribute.id && data.onUpdateAttribute && data.onRemoveAttribute && (
              <div className={styles.attributeEditor}>
                <label>
                  Nome
                  <input
                    value={attribute.name}
                    onChange={(event) => data.onUpdateAttribute?.(data.id, attribute.id, { name: event.target.value })}
                  />
                </label>
                <label>
                  Tipo
                  <select
                    value={attribute.type}
                    onChange={(event) =>
                      data.onUpdateAttribute?.(data.id, attribute.id, { type: event.target.value as AttributeType })
                    }
                  >
                    {attributeTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className={styles.removeAttributeButton}
                  type='button'
                  onClick={() => data.onRemoveAttribute?.(data.id, attribute.id)}
                >
                  Excluir atributo
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {data.onAddAttribute && (
        <button className={styles.addAttributeButton} type='button' onClick={() => data.onAddAttribute?.(data.id)}>
          + Adicionar atributo
        </button>
      )}

      <Handle type='target' position={Position.Left} />
      <Handle type='source' position={Position.Right} />
    </div>
  );
}

const nodeTypes = {
  entity: EntityNode,
};

const edgeTypes = {
  relationship: RelationshipEdge,
};

export function ConceptualDiagramFlow({
  model,
  onRemoveEntity,
  onSelectEntity,
  onUpdateEntity,
  selectedEntityIds,
  onAddAttribute,
  selectedAttribute,
  onSelectAttribute,
  onUpdateAttribute,
  onRemoveAttribute,
  onConnectEntities,
  onUpdateRelationship,
  onCycleRelationshipCardinality,
}: ConceptualDiagramFlowProps) {
  const nodes: Node<EntityNodeData>[] = model.entities.map((entity, index) => ({
    id: entity.id,
    type: 'entity',
    position: {
      x: 80 + (index % 3) * 360,
      y: 80 + Math.floor(index / 3) * 280,
    },
    data: {
      ...entity,
      onRemoveEntity,
      onSelectEntity,
      onUpdateEntity,
      isSelected: selectedEntityIds?.includes(entity.id),
      onAddAttribute,
      selectedAttributeId: selectedAttribute?.entityId === entity.id ? selectedAttribute.attributeId : undefined,
      onSelectAttribute,
      onUpdateAttribute,
      onRemoveAttribute,
    },
  }));

  const edges: RelationshipEdge[] = model.relationships.flatMap((relationship) => {
    const [source, target] = relationship.participants;

    if (!source || !target) {
      return [];
    }

    return [
      {
        id: relationship.id,
        source: source.entityId,
        target: target.entityId,
        type: 'relationship',
        data: {
          relationship,
          onUpdateRelationship: onUpdateRelationship ?? (() => undefined),
          onCycleRelationshipCardinality: onCycleRelationshipCardinality ?? (() => undefined),
        },
      },
    ];
  });

  return (
    <div className={styles.diagramFlow}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onConnect={(connection: Connection) => {
          if (connection.source && connection.target && connection.source !== connection.target) {
            onConnectEntities?.(connection.source, connection.target);
          }
        }}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
