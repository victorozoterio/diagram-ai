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
  onUpdateRelationship: (
    relationshipId: string,
    changes: {
      name?: string;
    },
  ) => void;
  onCycleRelationshipCardinality: (relationshipId: string, entityId: string) => void;
};

type RelationshipEdge = Edge<RelationshipEdgeData>;

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
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          <input
            className={styles.relationshipNameInput}
            value={data.relationship.name}
            onChange={(event) =>
              data.onUpdateRelationship(id, {
                name: event.target.value,
              })
            }
            onKeyDown={(event) => event.stopPropagation()}
            aria-label='Nome do relacionamento'
          />
        </div>

        <button
          className={`${styles.cardinalityLabel} nodrag nopan`}
          style={{
            transform: `translate(-50%, -50%) translate(${sourceLabelX}px, ${sourceLabelY}px)`,
          }}
          type='button'
          onClick={() => data.onCycleRelationshipCardinality(id, source)}
          title='Alternar cardinalidade'
        >
          {sourceParticipant.cardinality}
        </button>

        <button
          className={`${styles.cardinalityLabel} nodrag nopan`}
          style={{
            transform: `translate(-50%, -50%) translate(${targetLabelX}px, ${targetLabelY}px)`,
          }}
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
        ${styles.entityNode}
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
}: ConceptualDiagramFlowProps) {
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string | null>(null);
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(null);

  const mappedNodes = useMemo<Node<EntityNodeData>[]>(() => {
    return model.entities.map((entity, index) => ({
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
  ]);

  const [nodes, setNodes] = useState<Node<EntityNodeData>[]>(() => mappedNodes);

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

  const edges = useMemo<RelationshipEdge[]>(() => {
    return model.relationships.flatMap((relationship) => {
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
          selectable: true,
          data: {
            relationship,
            onUpdateRelationship: onUpdateRelationship ?? (() => undefined),
            onCycleRelationshipCardinality: onCycleRelationshipCardinality ?? (() => undefined),
          },
        },
      ];
    });
  }, [model.relationships, onUpdateRelationship, onCycleRelationshipCardinality]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((currentNodes) => applyNodeChanges(changes, currentNodes) as Node<EntityNodeData>[]);

      changes.forEach((change) => {
        if (change.type === 'position' && change.position && change.dragging === false) {
          onUpdateEntityPosition?.(change.id, change.position);
        }
      });
    },
    [onUpdateEntityPosition],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) {
        return;
      }

      if (connection.source === connection.target) {
        return;
      }

      onConnectEntities?.(connection.source, connection.target);
    },
    [onConnectEntities],
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
          setSelectedRelationshipId(edge.id);
        }}
        onPaneClick={() => {
          setSelectedRelationshipId(null);
        }}
        onEdgesDelete={(deletedEdges) => {
          deletedEdges.forEach((edge) => {
            onRemoveRelationship?.(edge.id);
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
