import '@xyflow/react/dist/style.css';

import { Background, Controls, type Edge, Handle, type Node, Position, ReactFlow } from '@xyflow/react';
import type { AttributeType, ConceptualModel, Entity } from '../../types';
import styles from './ConceptualDiagramFlow.module.css';

type EntityNodeData = Entity & {
  onRemoveEntity?: (entityId: string) => void;
  onAddAttribute?: (entityId: string) => void;
  selectedAttributeId?: string;
  onSelectAttribute?: (entityId: string, attributeId: string) => void;
  onUpdateAttribute?: (entityId: string, attributeId: string, changes: { name?: string; type?: AttributeType }) => void;
  onRemoveAttribute?: (entityId: string, attributeId: string) => void;
};

type ConceptualDiagramFlowProps = {
  model: ConceptualModel;
  onRemoveEntity?: (entityId: string) => void;
  onAddAttribute?: (entityId: string) => void;
  selectedAttribute?: { entityId: string; attributeId: string } | null;
  onSelectAttribute?: (entityId: string, attributeId: string) => void;
  onUpdateAttribute?: (entityId: string, attributeId: string, changes: { name?: string; type?: AttributeType }) => void;
  onRemoveAttribute?: (entityId: string, attributeId: string) => void;
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

function EntityNode({ data }: { data: EntityNodeData }) {
  return (
    <div className={styles.entityNode}>
      <div className={styles.entityNodeHeader}>
        <strong className={styles.entityNodeTitle}>{data.name}</strong>

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

      {data.description && <p className={styles.entityNodeDescription}>{data.description}</p>}

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

export function ConceptualDiagramFlow({
  model,
  onRemoveEntity,
  onAddAttribute,
  selectedAttribute,
  onSelectAttribute,
  onUpdateAttribute,
  onRemoveAttribute,
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
      onAddAttribute,
      selectedAttributeId: selectedAttribute?.entityId === entity.id ? selectedAttribute.attributeId : undefined,
      onSelectAttribute,
      onUpdateAttribute,
      onRemoveAttribute,
    },
  }));

  const edges: Edge[] = model.relationships.flatMap((relationship) => {
    const [source, target] = relationship.participants;

    if (!source || !target) {
      return [];
    }

    return [
      {
        id: relationship.id,
        source: source.entityId,
        target: target.entityId,
        label: `${relationship.name} (${relationship.type})`,
        type: 'smoothstep',
      },
    ];
  });

  return (
    <div className={styles.diagramFlow}>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
