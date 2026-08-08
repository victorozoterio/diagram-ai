import '@xyflow/react/dist/style.css';

import { Background, Controls, type Edge, Handle, type Node, Position, ReactFlow } from '@xyflow/react';
import type { ConceptualModel, Entity } from '../../types';
import styles from './ConceptualDiagramFlow.module.css';

type ConceptualDiagramFlowProps = {
  model: ConceptualModel;
};

function EntityNode({ data }: { data: Entity }) {
  return (
    <div className={styles.entityNode}>
      <strong className={styles.entityNodeTitle}>{data.name}</strong>

      {data.description && <p className={styles.entityNodeDescription}>{data.description}</p>}

      <ul className={styles.attributeList}>
        {data.attributes.map((attribute) => (
          <li className={styles.attributeItem} key={attribute.id}>
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

      <Handle type='target' position={Position.Left} />
      <Handle type='source' position={Position.Right} />
    </div>
  );
}

const nodeTypes = {
  entity: EntityNode,
};

export function ConceptualDiagramFlow({ model }: ConceptualDiagramFlowProps) {
  const nodes: Node<Entity>[] = model.entities.map((entity, index) => ({
    id: entity.id,
    type: 'entity',
    position: {
      x: 80 + (index % 3) * 360,
      y: 80 + Math.floor(index / 3) * 280,
    },
    data: entity,
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
