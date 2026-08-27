import '@xyflow/react/dist/style.css';

import {
  applyNodeChanges,
  Background,
  BaseEdge,
  type Connection,
  Controls,
  type Edge,
  EdgeLabelRenderer,
  type EdgeProps,
  getSmoothStepPath,
  Handle,
  MiniMap,
  type Node,
  type NodeChange,
  Position,
  ReactFlow,
  type ReactFlowInstance,
  useReactFlow,
} from '@xyflow/react';
import { type DragEvent, type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AttributeType, ConceptualModel, ElementKind, Entity, Relationship } from '../../types';
import styles from './ConceptualDiagramFlow.module.css';

type EntityNodeData = Entity & {
  onRemoveEntity?: (entityId: string) => void;
  onSelectEntity?: (entityId: string) => void;
  onUpdateEntity?: (entityId: string, changes: Partial<Pick<Entity, 'name' | 'description'>>) => void;
  isSelected?: boolean;
  onAddAttribute?: (entityId: string) => void;
  selectedAttributeId?: string;
  onSelectAttribute?: (entityId: string, attributeId: string) => void;
  onUpdateAttribute?: (
    entityId: string,
    attributeId: string,
    changes: {
      name?: string;
      type?: AttributeType;
    },
  ) => void;
  onRemoveAttribute?: (entityId: string, attributeId: string) => void;
};

type RelationshipEdgeData = {
  relationship: Relationship;
  entityId: string;
  onUpdateRelationship: (
    relationshipId: string,
    changes: {
      name?: string;
    },
  ) => void;
  onCycleRelationshipCardinality: (relationshipId: string, entityId: string) => void;
};

type RelationshipEdge = Edge<RelationshipEdgeData>;

type AttributeNodeData = {
  attribute: Entity['attributes'][number];
  entityId: string;
  selected?: boolean;
  onSelectAttribute?: (entityId: string, attributeId: string) => void;
  onUpdateAttribute?: (entityId: string, attributeId: string, changes: { name?: string; type?: AttributeType }) => void;
  onRemoveAttribute?: (entityId: string, attributeId: string) => void;
};

type RelationshipNodeData = {
  relationship: Relationship;
  onUpdateRelationship?: (relationshipId: string, changes: { name?: string }) => void;
};

type ConceptualDiagramFlowProps = {
  model: ConceptualModel;
  onRemoveEntity?: (entityId: string) => void;
  onSelectEntity?: (entityId: string) => void;
  onUpdateEntity?: (entityId: string, changes: Partial<Pick<Entity, 'name' | 'description'>>) => void;
  selectedEntityIds?: string[];
  entityPositions?: Record<
    string,
    {
      x: number;
      y: number;
    }
  >;
  onUpdateEntityPosition?: (
    entityId: string,
    position: {
      x: number;
      y: number;
    },
  ) => void;
  onAddAttribute?: (entityId: string) => void;
  selectedAttribute?: {
    entityId: string;
    attributeId: string;
  } | null;
  onSelectAttribute?: (entityId: string, attributeId: string) => void;
  onUpdateAttribute?: (
    entityId: string,
    attributeId: string,
    changes: {
      name?: string;
      type?: AttributeType;
    },
  ) => void;
  onRemoveAttribute?: (entityId: string, attributeId: string) => void;
  onConnectEntities?: (sourceEntityId: string, targetEntityId: string) => void;
  onUpdateRelationship?: (relationshipId: string, changes: { name?: string }) => void;
  onRemoveRelationship?: (relationshipId: string) => void;
  onCycleRelationshipCardinality?: (relationshipId: string, entityId: string) => void;
  onAddElementAtPosition?: (kind: ElementKind, position: { x: number; y: number }, targetEntityId?: string) => void;
  elementPositions?: Record<string, { x: number; y: number }>;
  onUpdateElementPosition?: (elementId: string, position: { x: number; y: number }) => void;
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
  const participant = data?.relationship.participants.find((item) => item.entityId === data.entityId);

  if (!data || !participant) {
    return <BaseEdge id={id} path={edgePath} />;
  }

  return (
    <>
      <BaseEdge id={id} path={edgePath} />
      <EdgeLabelRenderer>
        <button
          className={`${styles.cardinalityLabel} nodrag nopan`}
          style={{
            transform: `translate(-50%, -50%) translate(${sourceX + (labelX - sourceX) * 0.38}px, ${sourceY + (labelY - sourceY) * 0.38}px)`,
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

function FitViewOnNodeChange({ nodeCount }: { nodeCount: number }) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (nodeCount === 0) {
      return;
    }

    const frameId = requestAnimationFrame(() => {
      fitView({ padding: 0.2, duration: 200 });
    });

    return () => cancelAnimationFrame(frameId);
  }, [fitView, nodeCount]);

  return null;
}

function EntityNode({ data }: { data: EntityNodeData }) {
  const [editingField, setEditingField] = useState<'name' | 'description' | null>(null);
  const [draft, setDraft] = useState('');
  const editingInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editingField) return;

    editingInputRef.current?.focus();
    editingInputRef.current?.select();
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
    <div
      className={`
        ${styles.entityNode} ${styles.chenEntityNode}
        ${data.kind === 'weak' ? styles.weakEntity : ''}
        ${data.kind === 'associative' ? styles.associativeEntity : ''}
        ${data.isSelected ? styles.selectedEntity : ''}
      `}
    >
      <div
        className={`
          ${styles.entityNodeHeader}
          entity-drag-handle
        `}
      >
        <span className={styles.dragHandle} title='Arrastar entidade' aria-hidden='true'>
          ⋮⋮
        </span>

        {editingField === 'name' ? (
          <input
            className={`
              ${styles.entityNodeTitleInput}
              nodrag
            `}
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
            className={`
              ${styles.entityNodeTitleButton}
              nodrag
            `}
            type='button'
            onClick={() => startEditing('name')}
            aria-label={`Editar nome da entidade ${data.name}`}
          >
            <strong className={styles.entityNodeTitle}>{data.name}</strong>
          </button>
        )}

        {data.onRemoveEntity && (
          <button
            className={`
              ${styles.removeIconButton}
              nodrag
            `}
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
          className={`
            ${styles.entityNodeDescriptionInput}
            nodrag
          `}
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
          className={`
            ${styles.entityNodeDescriptionButton}
            nodrag
          `}
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
            className={`
                ${styles.attributeItem}
                ${data.selectedAttributeId === attribute.id ? styles.selectedAttribute : ''}
              `}
          >
            <button
              className={`
                  ${styles.attributeSelectButton}
                  nodrag
                `}
              type='button'
              onClick={() => data.onSelectAttribute?.(data.id, attribute.id)}
            >
              {attribute.identifier && (
                <span
                  className={`
                      ${styles.attributeTag}
                      ${styles.primaryTag}
                    `}
                >
                  PK
                </span>
              )}

              <span>{attribute.name}</span>

              <small className={styles.attributeType}>{attribute.type}</small>

              {attribute.required && <span className={styles.attributeTag}>obrigatório</span>}

              {attribute.unique && <span className={styles.attributeTag}>único</span>}

              {attribute.multivalued && <span className={styles.attributeTag}>multivalorado</span>}

              {attribute.composite && <span className={styles.attributeTag}>composto</span>}

              {attribute.derived && <span className={styles.attributeTag}>derivado</span>}
            </button>

            {data.selectedAttributeId === attribute.id && data.onUpdateAttribute && data.onRemoveAttribute && (
              <div
                className={`
                      ${styles.attributeEditor}
                      nodrag
                    `}
              >
                <label>
                  Nome
                  <input
                    className='nodrag'
                    value={attribute.name}
                    onChange={(event) =>
                      data.onUpdateAttribute?.(data.id, attribute.id, {
                        name: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Tipo
                  <select
                    className='nodrag'
                    value={attribute.type}
                    onChange={(event) =>
                      data.onUpdateAttribute?.(data.id, attribute.id, {
                        type: event.target.value as AttributeType,
                      })
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
                  className={`
                        ${styles.removeAttributeButton}
                        nodrag
                      `}
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
        <button
          className={`
            ${styles.addAttributeButton}
            nodrag
          `}
          type='button'
          onClick={() => data.onAddAttribute?.(data.id)}
        >
          + Adicionar atributo
        </button>
      )}

      <Handle type='target' position={Position.Left} />
      <Handle type='source' position={Position.Right} />
    </div>
  );
}

function AttributeNode({ data }: { data: AttributeNodeData }) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div
      className={`
        ${styles.attributeNode}
        ${data.attribute.multivalued ? styles.multivaluedAttribute : ''}
        ${data.attribute.derived ? styles.derivedAttribute : ''}
        ${data.attribute.identifier ? styles.identifierAttribute : ''}
        ${data.attribute.composite ? styles.compositeAttribute : ''}
        ${data.selected ? styles.selectedAttributeNode : ''}
      `}
    >
      {isEditing ? (
        <input
          className='nodrag'
          value={data.attribute.name}
          onChange={(event) => data.onUpdateAttribute?.(data.entityId, data.attribute.id, { name: event.target.value })}
          onBlur={() => setIsEditing(false)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === 'Escape') setIsEditing(false);
          }}
          aria-label='Nome do atributo'
        />
      ) : (
        <button
          className='nodrag'
          type='button'
          onClick={() => {
            data.onSelectAttribute?.(data.entityId, data.attribute.id);
            setIsEditing(true);
          }}
        >
          {data.attribute.name}
        </button>
      )}
      <Handle type='target' position={Position.Left} />
      <Handle type='source' position={Position.Right} />
    </div>
  );
}

function RelationshipNode({ data }: { data: RelationshipNodeData }) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div
      className={`${styles.relationshipNode} ${data.relationship.kind === 'identifying-relationship' ? styles.identifyingRelationshipNode : ''} ${data.relationship.kind === 'generalization' ? styles.generalizationNode : ''} ${data.relationship.kind === 'specialization' ? styles.specializationNode : ''}`}
    >
      {isEditing ? (
        <input
          className={`${styles.relationshipNodeInput} nodrag nopan`}
          value={data.relationship.name}
          onChange={(event) => data.onUpdateRelationship?.(data.relationship.id, { name: event.target.value })}
          onBlur={() => setIsEditing(false)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === 'Escape') setIsEditing(false);
            event.stopPropagation();
          }}
          aria-label='Nome do relacionamento'
        />
      ) : (
        <button
          className={`${styles.relationshipNodeName} nodrag nopan`}
          type='button'
          onClick={() => setIsEditing(true)}
        >
          {data.relationship.name}
        </button>
      )}
      <Handle type='target' position={Position.Left} />
      <Handle type='source' position={Position.Right} />
    </div>
  );
}

const nodeTypes = {
  entity: EntityNode,
  attribute: AttributeNode,
  relationship: RelationshipNode,
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
  entityPositions,
  onUpdateEntityPosition,
  onAddAttribute,
  selectedAttribute,
  onSelectAttribute,
  onUpdateAttribute,
  onRemoveAttribute,
  onConnectEntities,
  onUpdateRelationship,
  onRemoveRelationship,
  onCycleRelationshipCardinality,
  onAddElementAtPosition,
  elementPositions,
  onUpdateElementPosition,
}: ConceptualDiagramFlowProps) {
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string | null>(null);
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(null);

  const mappedNodes = useMemo<Node[]>(() => {
    const entityNodes = model.entities.map((entity, index) => ({
      id: entity.id,
      type: 'entity',
      dragHandle: '.entity-drag-handle',
      position: entityPositions?.[entity.id] ?? {
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

    const attributeNodes = model.entities.flatMap((entity) =>
      entity.attributes.map((attribute, index) => ({
        id: `${entity.id}:${attribute.id}`,
        type: 'attribute',
        position: elementPositions?.[`${entity.id}:${attribute.id}`] ?? {
          x: (entityPositions?.[entity.id]?.x ?? 80) + 250,
          y: (entityPositions?.[entity.id]?.y ?? 80) + index * 100,
        },
        data: {
          attribute,
          entityId: entity.id,
          selected: selectedAttribute?.entityId === entity.id && selectedAttribute.attributeId === attribute.id,
          onSelectAttribute,
          onUpdateAttribute,
          onRemoveAttribute,
        } satisfies AttributeNodeData,
      })),
    );

    const relationshipNodes = model.relationships.map((relationship, index) => {
      const participantPositions = relationship.participants
        .map((participant) => entityPositions?.[participant.entityId])
        .filter((position): position is { x: number; y: number } => Boolean(position));
      const fallback = participantPositions[0] ?? { x: 520 + (index % 2) * 220, y: 180 + Math.floor(index / 2) * 180 };
      const midpoint =
        participantPositions.length > 1
          ? {
              x: (participantPositions[0].x + participantPositions[1].x) / 2 + 100,
              y: (participantPositions[0].y + participantPositions[1].y) / 2,
            }
          : { x: fallback.x + 180, y: fallback.y + 30 };
      return {
        id: `relationship:${relationship.id}`,
        type: 'relationship',
        position: elementPositions?.[`relationship:${relationship.id}`] ?? midpoint,
        data: { relationship, onUpdateRelationship } satisfies RelationshipNodeData,
      };
    });

    return [...entityNodes, ...attributeNodes, ...relationshipNodes];
  }, [
    model.entities,
    entityPositions,
    onRemoveEntity,
    onSelectEntity,
    onUpdateEntity,
    selectedEntityIds,
    onAddAttribute,
    selectedAttribute,
    onSelectAttribute,
    onUpdateAttribute,
    onRemoveAttribute,
    elementPositions,
    model.relationships,
    onUpdateRelationship,
  ]);

  const [nodes, setNodes] = useState<Node[]>(() => mappedNodes);

  useEffect(() => {
    setNodes((currentNodes) => {
      return mappedNodes.map((mappedNode) => {
        const currentNode = currentNodes.find((node) => node.id === mappedNode.id);

        if (!currentNode) {
          return mappedNode;
        }

        return {
          ...mappedNode,
          position: currentNode.position,
        };
      });
    });
  }, [mappedNodes]);

  const edges = useMemo<Edge[]>(() => {
    const attributeEdges = model.entities.flatMap((entity) =>
      entity.attributes.map((attribute) => ({
        id: `attribute:${entity.id}:${attribute.id}`,
        source: entity.id,
        target: `${entity.id}:${attribute.id}`,
        type: 'smoothstep',
        style: { stroke: '#94a3b8', strokeDasharray: '4 4' },
      })),
    );
    const relationshipEdges = model.relationships.flatMap((relationship) => {
      const [source, target] = relationship.participants;

      if (!source || !target) {
        return [];
      }

      return relationship.participants.map((participant) => ({
        id: `${relationship.id}:${participant.entityId}`,
        source: participant.entityId,
        target: `relationship:${relationship.id}`,
        type: 'relationship',
        selectable: true,
        data: {
          relationship,
          entityId: participant.entityId,
          onUpdateRelationship: onUpdateRelationship ?? (() => undefined),
          onCycleRelationshipCardinality: onCycleRelationshipCardinality ?? (() => undefined),
        },
      }));
    });
    return [...attributeEdges, ...relationshipEdges];
  }, [model.entities, model.relationships, onUpdateRelationship, onCycleRelationshipCardinality]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));

      changes.forEach((change) => {
        if (change.type === 'position' && change.position && change.dragging === false) {
          if (model.entities.some((entity) => entity.id === change.id)) {
            onUpdateEntityPosition?.(change.id, change.position);
          } else {
            onUpdateElementPosition?.(change.id, change.position);
          }
        }
      });
    },
    [model.entities, onUpdateEntityPosition, onUpdateElementPosition],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) {
        return;
      }

      if (connection.source === connection.target) {
        return;
      }

      if (
        model.entities.some((entity) => entity.id === connection.source) &&
        model.entities.some((entity) => entity.id === connection.target)
      ) {
        onConnectEntities?.(connection.source, connection.target);
      }
    },
    [model.entities, onConnectEntities],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const kind = event.dataTransfer.getData('application/diagram-element') as ElementKind;
      if (!kind || !flowInstance || !onAddElementAtPosition) {
        return;
      }

      const position = flowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const targetNode = flowInstance.getIntersectingNodes({
        x: position.x,
        y: position.y,
        width: 1,
        height: 1,
      })[0];

      onAddElementAtPosition(kind, position, targetNode?.id);
    },
    [flowInstance, onAddElementAtPosition],
  );

  useEffect(() => {
    function handleDeleteKey(event: globalThis.KeyboardEvent) {
      const target = event.target;
      const isTextEditingTarget =
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

      if (!selectedRelationshipId || isTextEditingTarget || !['Backspace', 'Delete'].includes(event.key)) {
        return;
      }

      event.preventDefault();
      onRemoveRelationship?.(selectedRelationshipId);
      setSelectedRelationshipId(null);
    }

    window.addEventListener('keydown', handleDeleteKey);

    return () => window.removeEventListener('keydown', handleDeleteKey);
  }, [onRemoveRelationship, selectedRelationshipId]);

  return (
    <div
      className={styles.diagramFlow}
      role='application'
      aria-label='Canvas do modelo conceitual'
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={handleDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onConnect={handleConnect}
        onEdgeClick={(_, edge) => {
          const relationshipData = edge.data as RelationshipEdgeData | undefined;
          setSelectedRelationshipId(relationshipData?.relationship.id ?? null);
        }}
        onPaneClick={() => {
          setSelectedRelationshipId(null);
        }}
        onEdgesDelete={(deletedEdges) => {
          deletedEdges.forEach((edge) => {
            const relationshipId = (edge.data as RelationshipEdgeData | undefined)?.relationship.id ?? edge.id;
            if (model.relationships.some((relationship) => relationship.id === relationshipId)) {
              onRemoveRelationship?.(relationshipId);
            }
          });

          setSelectedRelationshipId(null);
        }}
        deleteKeyCode={null}
        nodesDraggable
        nodesConnectable
        elementsSelectable
        fitView
        onInit={setFlowInstance}
      >
        <Background />
        <Controls />
        <MiniMap />
        <FitViewOnNodeChange nodeCount={nodes.length} />
      </ReactFlow>
    </div>
  );
}
