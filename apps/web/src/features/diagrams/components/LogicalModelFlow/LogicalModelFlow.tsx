import {
  Background,
  type Connection,
  ConnectionMode,
  Controls,
  type Edge,
  type EdgeChange,
  Handle,
  MiniMap,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  type ReactFlowInstance,
} from '@xyflow/react';
import { useRef, useState } from 'react';
import '@xyflow/react/dist/style.css';

import type { LogicalColumn, LogicalModel, LogicalTable, LogicalTableRelationship } from '../../types';
import conceptualStyles from '../ConceptualDiagramFlow/ConceptualDiagramFlow.module.css';
import styles from './LogicalModelFlow.module.css';

type LogicalModelFlowProps = {
  model: LogicalModel;
  onAddTable: (position: { x: number; y: number }) => void;
  onUpdateTable: (table: LogicalTable) => void;
  onUpdateModel: (model: LogicalModel) => void;
};

type LogicalTableNodeData = {
  table: LogicalTable;
  tables: LogicalTable[];
  onUpdateTable: (table: LogicalTable) => void;
  editingTableId: string | null;
};

const columnTypes: LogicalColumn['type'][] = [
  'uuid',
  'varchar',
  'text',
  'integer',
  'bigint',
  'decimal',
  'boolean',
  'date',
  'datetime',
];

function TableNode({ data }: NodeProps<Node<LogicalTableNodeData>>) {
  const { table, tables, onUpdateTable, editingTableId } = data;
  const isEditing = editingTableId === table.id;
  const updateColumns = (columns: LogicalTable['columns']) => onUpdateTable({ ...table, columns });
  const updateColumn = (columnId: string, update: Partial<LogicalColumn>) =>
    updateColumns(table.columns.map((column) => (column.id === columnId ? { ...column, ...update } : column)));
  const addColumn = () => {
    updateColumns([
      ...table.columns,
      {
        id: createId('column'),
        name: 'novo_campo',
        type: 'varchar',
        primaryKey: false,
        foreignKey: false,
        required: false,
        nullable: true,
        unique: false,
      },
    ]);
  };
  const removeColumn = (columnId: string) => updateColumns(table.columns.filter((column) => column.id !== columnId));

  return (
    <div className={styles.tableNode}>
      <div className={styles.tableTitle}>
        {isEditing ? (
          <input
            className={`${styles.tableNameInput} nodrag`}
            value={table.name}
            aria-label='Nome da tabela'
            onChange={(event) => onUpdateTable({ ...table, name: event.target.value })}
            onPointerDown={(event) => event.stopPropagation()}
          />
        ) : (
          <strong>{table.name}</strong>
        )}
      </div>

      {table.columns.length > 0 ? (
        <ul className={styles.columnList}>
          {table.columns.map((column) => {
            const referencedTable = tables.find((candidate) => candidate.id === column.references?.tableId);
            const nullable = column.nullable ?? !column.required;

            return (
              <li key={column.id} className={styles.columnItem}>
                {isEditing ? (
                  <>
                    <div className={styles.columnEditorRow}>
                      <div className={styles.keyOptions}>
                        <label className='nodrag'>
                          <input
                            type='checkbox'
                            checked={column.primaryKey}
                            onChange={(event) => updateColumn(column.id, { primaryKey: event.target.checked })}
                          />
                          PK
                        </label>
                        <label className='nodrag'>
                          <input
                            type='checkbox'
                            checked={column.foreignKey}
                            onChange={(event) =>
                              updateColumn(column.id, {
                                foreignKey: event.target.checked,
                                references: event.target.checked ? column.references : undefined,
                              })
                            }
                          />
                          FK
                        </label>
                      </div>
                      <button
                        className={`${styles.removeColumnButton} nodrag`}
                        type='button'
                        aria-label={`Excluir campo ${column.name}`}
                        onClick={() => removeColumn(column.id)}
                      >
                        ×
                      </button>
                    </div>
                    <input
                      className={`${styles.columnNameInput} nodrag`}
                      value={column.name}
                      aria-label='Nome do campo'
                      onChange={(event) => updateColumn(column.id, { name: event.target.value })}
                      onPointerDown={(event) => event.stopPropagation()}
                    />
                    <select
                      className={`${styles.columnSelect} nodrag`}
                      value={column.type}
                      aria-label='Tipo do campo'
                      onChange={(event) =>
                        updateColumn(column.id, { type: event.target.value as LogicalColumn['type'] })
                      }
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      {columnTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <div className={styles.columnFlags}>
                      <label className='nodrag'>
                        <input
                          type='checkbox'
                          checked={nullable}
                          onChange={(event) =>
                            updateColumn(column.id, { nullable: event.target.checked, required: !event.target.checked })
                          }
                        />
                        Nullable
                      </label>
                      <label className='nodrag'>
                        <input
                          type='checkbox'
                          checked={column.unique}
                          onChange={(event) => updateColumn(column.id, { unique: event.target.checked })}
                        />
                        Unique
                      </label>
                    </div>
                    {column.foreignKey && (
                      <div className={styles.referenceEditor}>
                        <select
                          className={`${styles.columnSelect} nodrag`}
                          value={column.references?.tableId ?? ''}
                          aria-label='Tabela referenciada'
                          onChange={(event) =>
                            updateColumn(column.id, {
                              references: event.target.value
                                ? { tableId: event.target.value, columnId: '' }
                                : undefined,
                            })
                          }
                          onPointerDown={(event) => event.stopPropagation()}
                        >
                          <option value=''>Tabela referenciada</option>
                          {tables.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {candidate.name}
                            </option>
                          ))}
                        </select>
                        <select
                          className={`${styles.columnSelect} nodrag`}
                          value={column.references?.columnId ?? ''}
                          aria-label='Campo referenciado'
                          disabled={!referencedTable}
                          onChange={(event) =>
                            updateColumn(column.id, {
                              references: column.references
                                ? { ...column.references, columnId: event.target.value }
                                : undefined,
                            })
                          }
                          onPointerDown={(event) => event.stopPropagation()}
                        >
                          <option value=''>Campo referenciado</option>
                          {referencedTable?.columns.map((referencedColumn) => (
                            <option key={referencedColumn.id} value={referencedColumn.id}>
                              {referencedColumn.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className={styles.columnBadges}>
                      {column.primaryKey && <span className={styles.keyTag}>PK</span>}
                      {column.foreignKey && <span className={styles.keyTag}>FK</span>}
                    </div>
                    <span>{column.name}</span>
                    <small className={styles.columnType}>{column.type}</small>
                    {nullable ? (
                      <span className={styles.columnMeta}>NULL</span>
                    ) : (
                      <span className={styles.columnMeta}>NOT NULL</span>
                    )}
                    {column.unique && <span className={styles.columnMeta}>UNIQUE</span>}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className={styles.emptyTable}>Nenhuma coluna definida</div>
      )}

      {isEditing && (
        <button className={`${styles.addColumnButton} nodrag`} type='button' onClick={addColumn}>
          + Adicionar campo
        </button>
      )}

      <Handle type='source' id='source-top' position={Position.Top} className={styles.connectionHandle} />
      <Handle type='target' id='target-top' position={Position.Top} className={styles.connectionHandle} />
      <Handle type='source' id='source-bottom' position={Position.Bottom} className={styles.connectionHandle} />
      <Handle type='target' id='target-bottom' position={Position.Bottom} className={styles.connectionHandle} />
      <Handle type='source' id='source-left' position={Position.Left} className={styles.connectionHandle} />
      <Handle type='target' id='target-left' position={Position.Left} className={styles.connectionHandle} />
      <Handle type='source' id='source-right' position={Position.Right} className={styles.connectionHandle} />
      <Handle type='target' id='target-right' position={Position.Right} className={styles.connectionHandle} />
    </div>
  );
}

const nodeTypes = {
  table: TableNode,
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function LogicalModelFlow({ model, onAddTable, onUpdateTable, onUpdateModel }: LogicalModelFlowProps) {
  const flowInstance = useRef<ReactFlowInstance<Node<LogicalTableNodeData>, Edge> | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const nodes: Node<LogicalTableNodeData>[] = model.tables.map((table, index) => ({
    id: table.id,
    type: 'table',
    selected: table.id === selectedTableId,
    position: table.position ?? {
      x: 80 + (index % 3) * 360,
      y: 80 + Math.floor(index / 3) * 300,
    },
    data: { table, tables: model.tables, onUpdateTable, editingTableId },
  }));

  const manualEdges: Edge[] = (model.relationships ?? []).map((relationship) => ({
    id: relationship.id,
    source: relationship.source,
    target: relationship.target,
    sourceHandle: relationship.sourceHandle,
    targetHandle: relationship.targetHandle,
    type: 'smoothstep',
    selected: relationship.id === selectedEdgeId,
    style: edgeStyle(relationship.id === selectedEdgeId),
  }));

  const referenceEdges: Edge[] = model.tables.flatMap((table) =>
    table.columns.flatMap((column) => {
      if (!column.references) return [];

      const id = `${table.id}_${column.id}_${column.references.tableId}_${column.references.columnId}`;
      return [
        {
          id,
          source: column.references.tableId,
          target: table.id,
          label: column.name,
          type: 'smoothstep',
          selected: id === selectedEdgeId,
          style: edgeStyle(id === selectedEdgeId),
        },
      ];
    }),
  );

  const edges = [...referenceEdges, ...manualEdges];

  function handleConnect(connection: Connection) {
    if (!connection.source || !connection.target || connection.source === connection.target) return;

    const relationship: LogicalTableRelationship = {
      id: createId('table-connection'),
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle ?? undefined,
      targetHandle: connection.targetHandle ?? undefined,
    };

    onUpdateModel({
      ...model,
      relationships: [...(model.relationships ?? []), relationship],
    });
  }

  function handleEdgesChange(changes: EdgeChange[]) {
    const removedIds = changes.filter((change) => change.type === 'remove').map((change) => change.id);
    if (removedIds.length === 0) return;

    const manualRelationshipIds = new Set((model.relationships ?? []).map((relationship) => relationship.id));
    const removedManualIds = removedIds.filter((id) => manualRelationshipIds.has(id));
    if (removedManualIds.length === 0) return;

    onUpdateModel({
      ...model,
      relationships: (model.relationships ?? []).filter((relationship) => !removedManualIds.includes(relationship.id)),
    });
  }

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
        onNodeDragStop={(_, node) => {
          const table = model.tables.find((candidate) => candidate.id === node.id);
          if (table) onUpdateTable({ ...table, position: node.position });
        }}
        onNodeClick={(event, node) => {
          setSelectedTableId(node.id);
          setSelectedEdgeId(null);
          if (!(event.target instanceof Element && event.target.closest('.nodrag'))) {
            setEditingTableId(null);
          }
        }}
        onNodeDoubleClick={(_, node) => {
          setSelectedTableId(node.id);
          setEditingTableId(node.id);
        }}
        onPaneClick={() => {
          setSelectedTableId(null);
          setSelectedEdgeId(null);
          setEditingTableId(null);
        }}
        onConnect={handleConnect}
        onEdgesChange={handleEdgesChange}
        onEdgeClick={(_, edge) => {
          setSelectedTableId(null);
          setEditingTableId(null);
          setSelectedEdgeId(edge.id);
        }}
        elementsSelectable
        edgesFocusable
        connectionMode={ConnectionMode.Loose}
        deleteKeyCode={['Backspace', 'Delete']}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}

function edgeStyle(selected: boolean) {
  return {
    stroke: selected ? '#4f46e5' : '#94a3b8',
    strokeWidth: selected ? 2.5 : 1.5,
  };
}
