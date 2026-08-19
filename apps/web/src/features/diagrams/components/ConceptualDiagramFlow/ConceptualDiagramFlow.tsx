import '@xyflow/react/dist/style.css';

import { Background, Controls, type Edge, Handle, type Node, Position, ReactFlow } from '@xyflow/react';
import type { ConceptualModel, Entity } from '../../types';
import styles from './ConceptualDiagramFlow.module.css';

type EntityNodeData = Entity & {
  onRemoveEntity?: (entityId: string) => void;
  onAddAttribute?: (entityId: string) => void;
};

type ConceptualDiagramFlowProps = {
  model: ConceptualModel;
  onRemoveEntity?: (entityId: string) => void;
  onAddAttribute?: (entityId: string) => void;
};

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
          <li key={attribute.id} className={styles.attributeItem}>
            {attribute.identifier && <span className={`${styles.attributeTag} ${styles.primaryTag}`}>PK</span>}

            <span>{attribute.name}</span>

            <small className={styles.attributeType}>{attribute.type}</small>

            {attribute.required && <span className={styles.attributeTag}>obrigatório</span>}
            {attribute.unique && <span className={styles.attributeTag}>único</span>}
            {attribute.multivalued && <span className={styles.attributeTag}>multivalorado</span>}
            {attribute.composite && <span className={styles.attributeTag}>composto</span>}
            {attribute.derived && <span className={styles.attributeTag}>derivado</span>}
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

export function ConceptualDiagramFlow({ model, onRemoveEntity, onAddAttribute }: ConceptualDiagramFlowProps) {
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
