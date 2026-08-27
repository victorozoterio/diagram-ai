import { Background, Controls, type Edge, Handle, MiniMap, type Node, Position, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { LogicalModel, LogicalTable } from '../../types';
import styles from './LogicalModelFlow.module.css';

type LogicalModelFlowProps = {
  model: LogicalModel;
};

function TableNode({ data }: { data: LogicalTable }) {
  return (
    <div className={styles.tableNode}>
      <strong className={styles.tableTitle}>{data.name}</strong>

      <ul className={styles.columnList}>
        {data.columns.map((column) => (
          <li key={column.id} className={styles.columnItem}>
            {column.primaryKey && <span className={styles.keyTag}>PK</span>}
            {column.foreignKey && <span className={styles.keyTag}>FK</span>}

            <span>{column.name}</span>

            <small className={styles.columnType}>{column.type}</small>

            {column.required && <span className={styles.columnMeta}>NOT NULL</span>}
            {column.unique && <span className={styles.columnMeta}>UNIQUE</span>}
          </li>
        ))}
      </ul>

      <Handle type='target' position={Position.Left} />
      <Handle type='source' position={Position.Right} />
    </div>
  );
}

const nodeTypes = {
  table: TableNode,
};

export function LogicalModelFlow({ model }: LogicalModelFlowProps) {
  const nodes: Node<LogicalTable>[] = model.tables.map((table, index) => ({
    id: table.id,
    type: 'table',
    position: {
      x: 80 + (index % 3) * 360,
      y: 80 + Math.floor(index / 3) * 300,
    },
    data: table,
  }));

  const edges: Edge[] = model.tables.flatMap((table) =>
    table.columns.flatMap((column) => {
      if (!column.references) {
        return [];
      }

      return [
        {
          id: `${table.id}_${column.id}_${column.references.tableId}_${column.references.columnId}`,
          source: column.references.tableId,
          target: table.id,
          label: column.name,
          type: 'smoothstep',
        },
      ];
    }),
  );

  return (
    <div className={styles.diagramFlow}>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView>
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
