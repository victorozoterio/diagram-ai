import {
  Background,
  Controls,
  type Edge,
  Handle,
  MiniMap,
  type Node,
  Position,
  ReactFlow,
  type ReactFlowInstance,
} from '@xyflow/react';
import { useRef } from 'react';
import '@xyflow/react/dist/style.css';

import type { LogicalModel, LogicalTable } from '../../types';
import conceptualStyles from '../ConceptualDiagramFlow/ConceptualDiagramFlow.module.css';
import styles from './LogicalModelFlow.module.css';

type LogicalModelFlowProps = {
  model: LogicalModel;
  onAddTable: (position: { x: number; y: number }) => void;
};

function TableNode({ data }: { data: LogicalTable }) {
  return (
    <div className={styles.tableNode}>
      <strong className={styles.tableTitle}>{data.name}</strong>

      {data.columns.length > 0 ? (
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
      ) : (
        <div className={styles.emptyTable}>Nenhuma coluna definida</div>
      )}

      <Handle type='target' position={Position.Left} />
      <Handle type='source' position={Position.Right} />
    </div>
  );
}

const nodeTypes = {
  table: TableNode,
};

export function LogicalModelFlow({ model, onAddTable }: LogicalModelFlowProps) {
  const flowInstance = useRef<ReactFlowInstance<Node<LogicalTable>, Edge> | null>(null);
  const nodes: Node<LogicalTable>[] = model.tables.map((table, index) => ({
    id: table.id,
    type: 'table',
    position: table.position ?? {
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
    <div
      className={conceptualStyles.diagramFlow}
      role='application'
      aria-label='Canvas do modelo lógico'
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={(event) => {
        event.preventDefault();
        if (event.dataTransfer.getData('application/logical-element') !== 'logical-table' || !flowInstance.current) {
          return;
        }

        onAddTable(flowInstance.current.screenToFlowPosition({ x: event.clientX, y: event.clientY }));
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={(instance) => {
          flowInstance.current = instance;
        }}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
