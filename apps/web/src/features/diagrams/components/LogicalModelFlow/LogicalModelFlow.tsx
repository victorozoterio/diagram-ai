import {
  applyNodeChanges,
  Background,
  Controls,
  type Edge,
  type EdgeChange,
  Handle,
  MiniMap,
  type Node,
  type NodeChange,
  type NodeProps,
  Position,
  ReactFlow,
  type ReactFlowInstance,
  useUpdateNodeInternals,
} from '@xyflow/react';
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '@xyflow/react/dist/style.css';

import {
  createDiagramAiProject,
  type DiagramAiFlowEdge,
  type DiagramAiProject,
  hydrateFlowEdges,
  type LogicalColumn,
  type LogicalModel,
  type LogicalTable,
} from '../../types';
import conceptualStyles from '../ConceptualDiagramFlow/ConceptualDiagramFlow.module.css';
import { DiagramExportMenu } from '../ConceptualDiagramFlow/DiagramExportMenu';
import { FitViewOnNodeChange } from '../ConceptualDiagramFlow/FitViewOnNodeChange';
import { ResizableNodeControls } from '../ConceptualDiagramFlow/nodes/ResizableNodeControls';
import { RestoreViewport } from '../ConceptualDiagramFlow/RestoreViewport';
import { preserveNodeMeasurement } from '../flow-node-measurement';
import { useSelectAllShortcut } from '../use-select-all-shortcut';
import type { LogicalOrthogonalEdgeData } from './edges/LogicalOrthogonalEdge';
import { LogicalOrthogonalEdge } from './edges/LogicalOrthogonalEdge';
import styles from './LogicalModelFlow.module.css';

type LogicalModelFlowProps = {
  model: LogicalModel;
  exportMenuTarget?: Element | null;
  exportDisabled?: boolean;
  onOpenProject?: (project: DiagramAiProject) => void | Promise<void>;
  onNavigateToDiagrams?: () => void;
  onSaveProject?: (project: DiagramAiProject) => Promise<void>;
  isSavingProject?: boolean;
  onEditableProjectReady?: (getProject: () => DiagramAiProject) => void;
  onVisualChange?: () => void;
  onViewportChange?: (viewport: { x: number; y: number; zoom: number }) => void;
  onAddTable: (position: { x: number; y: number }) => void;
  onUpdateTable: (table: LogicalTable) => void;
  onUpdateModel: (model: LogicalModel) => void;
  layoutVersion?: number;
  restoredViewport?: { x: number; y: number; zoom: number } | null;
  viewportRestoreVersion?: number;
  restoredEdges?: DiagramAiFlowEdge[] | null;
  edgeRestoreVersion?: number;
  onRestoredEdgesApplied?: () => void;
};

type LogicalTableNodeData = {
  table: LogicalTable;
  tables: LogicalTable[];
  highlightedColumnIds: string[];
  onUpdateTable: (table: LogicalTable) => void;
  editingTableId: string | null;
  onResize: (nodeId: string, size: { width: number; height: number }) => void;
  onResizeEnd: (nodeId: string, size: { width: number; height: number }) => void;
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
  'timestamp',
  'unknown',
];

const DEFAULT_TABLE_SIZE = { width: 430, height: 100 };
const MIN_TABLE_SIZE = { width: 260, height: 80 };
const EMPTY_TABLE_MIN_HEIGHT = 130;
const NORMAL_TABLE_HEADER_HEIGHT = 74;
const NORMAL_COLUMN_HEIGHT = 34;
const EDITING_REQUIRED_WIDTH = 300;
const EDITING_TABLE_HEADER_HEIGHT = 74;
const EDITING_TABLE_ADD_BUTTON_HEIGHT = 36;
const EDITING_EMPTY_TABLE_HEIGHT = 74;
const EDITING_COLUMN_HEIGHT = 58;
const EDITING_FOREIGN_KEY_COLUMN_HEIGHT = 84;

function editingRequiredHeight(table: LogicalTable) {
  const columnsHeight = table.columns.length
    ? table.columns.reduce(
        (height, column) => height + (column.foreignKey ? EDITING_FOREIGN_KEY_COLUMN_HEIGHT : EDITING_COLUMN_HEIGHT),
        0,
      )
    : EDITING_EMPTY_TABLE_HEIGHT;

  return EDITING_TABLE_HEADER_HEIGHT + columnsHeight + EDITING_TABLE_ADD_BUTTON_HEIGHT;
}

function normalRequiredHeight(table: LogicalTable) {
  return table.columns.length
    ? NORMAL_TABLE_HEADER_HEIGHT + table.columns.length * NORMAL_COLUMN_HEIGHT
    : EMPTY_TABLE_MIN_HEIGHT;
}

export function TableNode({ data, selected, width }: NodeProps<Node<LogicalTableNodeData>>) {
  const { table, tables, highlightedColumnIds, onUpdateTable, editingTableId, onResize, onResizeEnd } = data;
  const updateNodeInternals = useUpdateNodeInternals();
  const isEditing = editingTableId === table.id;
  const tableWidth = width ?? table.size?.width ?? DEFAULT_TABLE_SIZE.width;
  const columnScale = tableColumnScale(table.columns, tableWidth);
  const referencedTables = tables.filter((candidate) => candidate.id !== table.id);
  const fieldLayoutKey = `${isEditing}:${tableWidth}:${table.columns
    .map((column) => `${column.id}:${column.foreignKey}`)
    .join(':')}`;
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

  useEffect(() => {
    if (!fieldLayoutKey) return;
    updateNodeInternals(table.id);
  }, [fieldLayoutKey, table.id, updateNodeInternals]);

  return (
    <div
      className={`${styles.tableNode} ${selected ? styles.selected : ''} ${isEditing ? styles.editing : ''}`}
      data-export-preserve-style='logical-table'
    >
      <ResizableNodeControls
        nodeId={table.id}
        selected={Boolean(selected)}
        minSize={{
          width: isEditing ? Math.max(MIN_TABLE_SIZE.width, EDITING_REQUIRED_WIDTH) : MIN_TABLE_SIZE.width,
          height: isEditing ? editingRequiredHeight(table) : normalRequiredHeight(table),
        }}
        color='#4338ca'
        onResize={onResize}
        onResizeEnd={onResizeEnd}
      />
      <div className={styles.tableContent} data-export-preserve-style='logical-table-content'>
        <div className={styles.tableTitle} data-export-preserve-style='logical-table-title'>
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
              const referencedTable = referencedTables.find((candidate) => candidate.id === column.references?.tableId);
              const nullable = column.nullable ?? !column.required;

              return (
                <li
                  key={column.id}
                  className={styles.columnItem}
                  style={!isEditing ? columnResponsiveStyle(columnScale) : undefined}
                >
                  <FieldConnectionHandles columnId={column.id} />
                  {isEditing ? (
                    <>
                      <div className={styles.columnEditorOptions}>
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
                                references:
                                  event.target.checked && column.references?.tableId !== table.id
                                    ? column.references
                                    : undefined,
                              })
                            }
                          />
                          FK
                        </label>
                        <label className='nodrag'>
                          <input
                            type='checkbox'
                            checked={nullable}
                            onChange={(event) =>
                              updateColumn(column.id, {
                                nullable: event.target.checked,
                                required: !event.target.checked,
                              })
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
                        <button
                          className={`${styles.removeColumnButton} nodrag`}
                          type='button'
                          aria-label={`Excluir campo ${column.name}`}
                          onClick={() => removeColumn(column.id)}
                        >
                          ×
                        </button>
                      </div>
                      <div className={styles.columnIdentityRow}>
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
                      </div>
                      {column.foreignKey && (
                        <div className={styles.referenceEditor}>
                          <select
                            className={`${styles.columnSelect} nodrag`}
                            value={referencedTable?.id ?? ''}
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
                            {referencedTables.map((candidate) => (
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
                      <span
                        className={highlightedColumnIds.includes(column.id) ? styles.highlightedColumnName : undefined}
                      >
                        {column.name}
                      </span>
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
      </div>
    </div>
  );
}

function FieldConnectionHandles({ columnId }: { columnId: string }) {
  return (
    <>
      <Handle
        type='source'
        id={fieldHandleId(columnId, 'source', 'left')}
        position={Position.Left}
        className={styles.fieldConnectionHandle}
      />
      <Handle
        type='target'
        id={fieldHandleId(columnId, 'target', 'left')}
        position={Position.Left}
        className={styles.fieldConnectionHandle}
      />
      <Handle
        type='source'
        id={fieldHandleId(columnId, 'source', 'right')}
        position={Position.Right}
        className={styles.fieldConnectionHandle}
      />
      <Handle
        type='target'
        id={fieldHandleId(columnId, 'target', 'right')}
        position={Position.Right}
        className={styles.fieldConnectionHandle}
      />
    </>
  );
}

export const logicalNodeTypes = {
  table: TableNode,
};

export const logicalEdgeTypes = {
  logicalOrthogonal: LogicalOrthogonalEdge,
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function fieldHandleId(columnId: string, type: 'source' | 'target', side: 'left' | 'right') {
  return `field:${columnId}:${type}:${side}`;
}

function getSelectedEdgeFieldKeys(model: LogicalModel, edgeId: string | null) {
  const fieldKeys = new Set<string>();
  if (!edgeId) return fieldKeys;

  for (const table of model.tables) {
    for (const column of table.columns) {
      if (!column.references) continue;

      const generatedEdgeId = `${table.id}_${column.id}_${column.references.tableId}_${column.references.columnId}`;
      if (generatedEdgeId !== edgeId) continue;

      const referencedTable = model.tables.find((candidate) => candidate.id === column.references?.tableId);
      const referencedColumn = referencedTable?.columns.find(
        (candidate) => candidate.id === column.references?.columnId,
      );
      if (referencedTable && referencedColumn) {
        fieldKeys.add(`${table.id}:${column.id}`);
        fieldKeys.add(`${referencedTable.id}:${referencedColumn.id}`);
      }
      return fieldKeys;
    }
  }

  const relationship = model.relationships?.find((candidate) => candidate.id === edgeId);
  if (!relationship) return fieldKeys;

  const sourceColumnId = columnIdFromHandle(relationship.sourceHandle);
  const targetColumnId = columnIdFromHandle(relationship.targetHandle);
  if (sourceColumnId) fieldKeys.add(`${relationship.source}:${sourceColumnId}`);
  if (targetColumnId) fieldKeys.add(`${relationship.target}:${targetColumnId}`);
  return fieldKeys;
}

function columnIdFromHandle(handle: string | undefined) {
  if (!handle?.startsWith('field:')) return null;
  return handle.split(':')[1] ?? null;
}

function columnEstimatedWidth(column: LogicalColumn) {
  const hasRequired = column.nullable === false || column.required;
  const textUnits =
    column.name.length +
    column.type.length +
    (hasRequired ? 'NOT NULL'.length : 'NULL'.length) +
    (column.unique ? 'UNIQUE'.length : 0);
  const badgeWidth = (column.primaryKey ? 24 : 0) + (column.foreignKey ? 24 : 0);
  const visibleItemCount = 3 + (column.unique ? 1 : 0) + (badgeWidth > 0 ? 1 : 0);
  const gapWidth = Math.max(0, visibleItemCount - 1) * 6;
  const typePadding = 16;
  return textUnits * 7.2 + badgeWidth + gapWidth + typePadding;
}

function tableColumnScale(columns: LogicalColumn[], tableWidth: number) {
  const availableWidth = Math.max(1, tableWidth - 32);
  const widestColumn = columns.reduce((width, column) => Math.max(width, columnEstimatedWidth(column)), 0);
  const scale = widestColumn > 0 ? Math.min(1, availableWidth / widestColumn) : 1;
  const fontSize = Math.max(6, 13 * scale);
  return fontSize / 13;
}

function columnResponsiveStyle(scale: number): CSSProperties {
  const fontSize = Math.max(6, 13 * scale);
  const visualScale = fontSize / 13;

  return {
    fontSize: `${fontSize}px`,
    '--column-scale': visualScale,
  } as CSSProperties;
}

export function LogicalModelFlow({
  model,
  exportMenuTarget,
  exportDisabled,
  onOpenProject,
  onNavigateToDiagrams,
  onSaveProject,
  isSavingProject,
  onEditableProjectReady,
  onVisualChange,
  onViewportChange,
  onAddTable,
  onUpdateTable,
  onUpdateModel,
  layoutVersion = 0,
  restoredViewport,
  viewportRestoreVersion,
  restoredEdges,
  edgeRestoreVersion,
  onRestoredEdgesApplied,
}: LogicalModelFlowProps) {
  const flowInstance = useRef<ReactFlowInstance<Node<LogicalTableNodeData>, Edge> | null>(null);
  const flowWrapperRef = useRef<HTMLDivElement | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<Node<LogicalTableNodeData>[]>([]);
  const [hydratedEdges, setHydratedEdges] = useState<Edge[] | null>(null);
  const previousModel = useRef(model);
  const appliedEdgeRestoreVersion = useRef<number | undefined>(undefined);
  const previousEdgeRestoreVersion = useRef(edgeRestoreVersion);
  const [viewportReadyForCount, setViewportReadyForCount] = useState<number | null>(null);
  const editingStartSizes = useRef<Record<string, { width: number; height: number }>>({});
  const handleViewportReady = useCallback(() => setViewportReadyForCount(model.tables.length), [model.tables.length]);
  const highlightedFieldKeys = useMemo(() => getSelectedEdgeFieldKeys(model, selectedEdgeId), [model, selectedEdgeId]);
  const handleResize = useCallback((nodeId: string, size: { width: number; height: number }) => {
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === nodeId
          ? { ...node, width: size.width, height: size.height, style: { ...node.style, ...size } }
          : node,
      ),
    );
  }, []);

  const handleResizeEnd = useCallback(
    (nodeId: string, size: { width: number; height: number }) => {
      const table = model.tables.find((candidate) => candidate.id === nodeId);
      if (table) onUpdateTable({ ...table, size });
    },
    [model.tables, onUpdateTable],
  );

  const mappedNodes = useMemo<Node<LogicalTableNodeData>[]>(
    () =>
      model.tables.map((table, index) => {
        const size = table.size;
        const isEditing = editingTableId === table.id;
        const baseWidth = size?.width ?? DEFAULT_TABLE_SIZE.width;
        const baseHeight = size?.height ?? DEFAULT_TABLE_SIZE.height;
        const width = Math.max(baseWidth, isEditing ? EDITING_REQUIRED_WIDTH : MIN_TABLE_SIZE.width);
        const height = Math.max(baseHeight, isEditing ? editingRequiredHeight(table) : normalRequiredHeight(table));

        return {
          id: table.id,
          type: 'table',
          width,
          height,
          style: {
            width,
            height,
          },
          position: table.position ?? {
            x: 80 + (index % 3) * 360,
            y: 80 + Math.floor(index / 3) * 300,
          },
          data: {
            table,
            tables: model.tables,
            highlightedColumnIds:
              model.tables
                .find((candidate) => candidate.id === table.id)
                ?.columns.filter((column) => highlightedFieldKeys.has(`${table.id}:${column.id}`))
                .map((column) => column.id) ?? [],
            onUpdateTable,
            editingTableId,
            onResize: handleResize,
            onResizeEnd: handleResizeEnd,
          },
        };
      }),
    [editingTableId, handleResize, handleResizeEnd, highlightedFieldKeys, model.tables, onUpdateTable],
  );

  useEffect(() => {
    const shouldClearSelection = previousEdgeRestoreVersion.current !== edgeRestoreVersion;
    previousEdgeRestoreVersion.current = edgeRestoreVersion;

    if (shouldClearSelection) {
      setSelectedEdgeId(null);
      setEditingTableId(null);
      editingStartSizes.current = {};
    }

    setNodes((currentNodes) =>
      mappedNodes.map((nextNode) => {
        const currentNode = currentNodes.find((node) => node.id === nextNode.id);
        const currentIsEditing = currentNode?.data.editingTableId === nextNode.id;
        const nextIsEditing = nextNode.data.editingTableId === nextNode.id;
        const currentWidth = currentNode?.width;
        const currentHeight = currentNode?.height;
        const nextWidth = nextNode.width ?? DEFAULT_TABLE_SIZE.width;
        const nextHeight = nextNode.height ?? DEFAULT_TABLE_SIZE.height;

        return preserveNodeMeasurement(
          {
            ...nextNode,
            position: currentNode?.dragging ? currentNode.position : nextNode.position,
            selected: shouldClearSelection ? false : (currentNode?.selected ?? false),
            ...(currentWidth && currentHeight && !(currentIsEditing && !nextIsEditing)
              ? {
                  width: Math.max(currentWidth, nextWidth),
                  height: Math.max(currentHeight, nextHeight),
                  style: {
                    ...nextNode.style,
                    width: Math.max(currentWidth, nextWidth),
                    height: Math.max(currentHeight, nextHeight),
                  },
                }
              : {}),
          },
          currentNode,
        );
      }),
    );
  }, [edgeRestoreVersion, mappedNodes]);

  const finishEditing = useCallback(() => {
    if (!editingTableId) return;

    const table = model.tables.find((candidate) => candidate.id === editingTableId);
    const startSize = editingStartSizes.current[editingTableId];

    if (table && startSize) {
      const requiredNormalHeight = table.columns.length ? normalRequiredHeight(table) : startSize.height;

      onUpdateTable({
        ...table,
        size: {
          width: Math.max(startSize.width, MIN_TABLE_SIZE.width),
          height: Math.max(startSize.height, requiredNormalHeight),
        },
      });
    }

    delete editingStartSizes.current[editingTableId];
    setEditingTableId(null);
  }, [editingTableId, model.tables, onUpdateTable]);

  function handleNodesChange(changes: NodeChange<Node<LogicalTableNodeData>>[]) {
    setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
  }

  const selectAllNodes = useCallback(() => {
    setNodes((currentNodes) =>
      applyNodeChanges(
        currentNodes.map((node) => ({ id: node.id, type: 'select' as const, selected: true })),
        currentNodes,
      ),
    );
  }, []);

  useSelectAllShortcut({ onSelectAllNodes: selectAllNodes });

  const manualEdges: Edge[] = (model.relationships ?? []).map((relationship) => ({
    id: relationship.id,
    source: relationship.source,
    target: relationship.target,
    sourceHandle: relationship.sourceHandle,
    targetHandle: relationship.targetHandle,
    type: 'logicalOrthogonal',
    data: {
      routeOffset: relationship.routeOffset,
      onUpdateRoute: (edgeId: string, routeOffset: number) => updateRouteOffset(edgeId, routeOffset),
    } satisfies LogicalOrthogonalEdgeData,
    selected: relationship.id === selectedEdgeId,
    style: edgeStyle(relationship.id === selectedEdgeId),
  }));

  const referenceEdges: Edge[] = model.tables.flatMap((table) =>
    table.columns.flatMap((column) => {
      if (!column.references) return [];

      const referencedTable = model.tables.find((candidate) => candidate.id === column.references?.tableId);
      const referencedColumn = referencedTable?.columns.find(
        (candidate) => candidate.id === column.references?.columnId,
      );
      if (!referencedTable || !referencedColumn) return [];

      const sourceIsLeft = tableCenterX(nodes, referencedTable) <= tableCenterX(nodes, table);
      const sourceSide = sourceIsLeft ? 'right' : 'left';
      const targetSide = sourceIsLeft ? 'left' : 'right';

      const id = `${table.id}_${column.id}_${column.references.tableId}_${column.references.columnId}`;
      return [
        {
          id,
          source: column.references.tableId,
          target: table.id,
          sourceHandle: fieldHandleId(referencedColumn.id, 'source', sourceSide),
          targetHandle: fieldHandleId(column.id, 'target', targetSide),
          label: column.name,
          type: 'logicalOrthogonal',
          data: {
            routeOffset: column.references.routeOffset,
            onUpdateRoute: (_edgeId: string, routeOffset: number) =>
              updateReferenceRoute(table.id, column.id, routeOffset),
          } satisfies LogicalOrthogonalEdgeData,
          selected: id === selectedEdgeId,
          style: edgeStyle(id === selectedEdgeId),
        },
      ];
    }),
  );

  const edges = [...referenceEdges, ...manualEdges];
  const generatedEdgesRef = useRef(edges);
  generatedEdgesRef.current = edges;

  useEffect(() => {
    if (previousModel.current === model) return;

    previousModel.current = model;
    setHydratedEdges(null);
  }, [model]);

  useEffect(() => {
    if (
      edgeRestoreVersion === undefined ||
      appliedEdgeRestoreVersion.current === edgeRestoreVersion ||
      !restoredEdges
    ) {
      return;
    }

    setHydratedEdges(hydrateFlowEdges(generatedEdgesRef.current, restoredEdges));
    appliedEdgeRestoreVersion.current = edgeRestoreVersion;
    onRestoredEdgesApplied?.();
  }, [edgeRestoreVersion, onRestoredEdgesApplied, restoredEdges]);

  const renderedEdges = hydratedEdges ?? edges;

  const editableProjectFactory = useRef<() => DiagramAiProject>(() =>
    createDiagramAiProject({
      modelType: 'logical',
      semanticModel: model,
      nodes,
      edges: renderedEdges,
      viewport: flowInstance.current?.getViewport(),
    }),
  );
  editableProjectFactory.current = () =>
    createDiagramAiProject({
      modelType: 'logical',
      semanticModel: model,
      nodes,
      edges: renderedEdges,
      viewport: flowInstance.current?.getViewport(),
    });

  useEffect(() => {
    onEditableProjectReady?.(() => editableProjectFactory.current());
  }, [onEditableProjectReady]);

  function updateRouteOffset(edgeId: string, routeOffset: number) {
    onUpdateModel({
      ...model,
      relationships: (model.relationships ?? []).map((relationship) =>
        relationship.id === edgeId ? { ...relationship, routeOffset } : relationship,
      ),
    });
  }

  function updateReferenceRoute(tableId: string, columnId: string, routeOffset: number) {
    onUpdateModel({
      ...model,
      tables: model.tables.map((table) =>
        table.id === tableId
          ? {
              ...table,
              columns: table.columns.map((column) =>
                column.id === columnId && column.references
                  ? { ...column, references: { ...column.references, routeOffset } }
                  : column,
              ),
            }
          : table,
      ),
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
      ref={flowWrapperRef}
      className={conceptualStyles.diagramFlow}
      style={{
        visibility: model.tables.length === 0 || viewportReadyForCount === model.tables.length ? 'visible' : 'hidden',
      }}
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
      <DiagramExportMenu
        flowWrapperRef={flowWrapperRef}
        nodes={nodes}
        portalTarget={exportMenuTarget}
        disabled={exportDisabled}
        onOpenProject={onOpenProject}
        onNavigateToDiagrams={onNavigateToDiagrams}
        getEditableProject={() => editableProjectFactory.current()}
        onSaveProject={onSaveProject}
        isSavingProject={isSavingProject}
      />
      <ReactFlow
        nodes={nodes}
        edges={renderedEdges}
        nodeTypes={logicalNodeTypes}
        edgeTypes={logicalEdgeTypes}
        onInit={(instance) => {
          flowInstance.current = instance;
        }}
        onMoveEnd={(event, viewport) => {
          if (!event) return;

          onViewportChange?.(viewport);
          onVisualChange?.();
        }}
        onNodeDragStop={(_, node) => {
          const selectedIds = new Set(
            nodes.filter((currentNode) => currentNode.selected).map((currentNode) => currentNode.id),
          );
          selectedIds.add(node.id);
          const positions = new Map(
            nodes.map((currentNode) => [
              currentNode.id,
              currentNode.id === node.id ? node.position : currentNode.position,
            ]),
          );

          onUpdateModel({
            ...model,
            tables: model.tables.map((table) =>
              selectedIds.has(table.id) ? { ...table, position: positions.get(table.id) ?? table.position } : table,
            ),
          });
        }}
        onNodesChange={handleNodesChange}
        onNodesDelete={(deletedNodes) => {
          const deletedIds = new Set(deletedNodes.map((node) => node.id));
          deletedIds.forEach((id) => {
            delete editingStartSizes.current[id];
          });
          setEditingTableId((currentId) => (currentId && deletedIds.has(currentId) ? null : currentId));

          onUpdateModel({
            ...model,
            tables: model.tables
              .filter((table) => !deletedIds.has(table.id))
              .map((table) => ({
                ...table,
                columns: table.columns.map((column) =>
                  column.references && deletedIds.has(column.references.tableId)
                    ? { ...column, foreignKey: false, references: undefined }
                    : column,
                ),
              })),
            relationships: (model.relationships ?? []).filter(
              (relationship) => !deletedIds.has(relationship.source) && !deletedIds.has(relationship.target),
            ),
          });
        }}
        onNodeClick={(event, _node) => {
          setSelectedEdgeId(null);
          if (!(event.target instanceof Element && event.target.closest('.nodrag'))) {
            finishEditing();
          }
        }}
        onNodeDoubleClick={(_, node) => {
          const table = model.tables.find((candidate) => candidate.id === node.id);
          if (table && !editingStartSizes.current[node.id]) {
            editingStartSizes.current[node.id] = {
              width: node.width ?? node.measured?.width ?? table.size?.width ?? DEFAULT_TABLE_SIZE.width,
              height: node.height ?? node.measured?.height ?? table.size?.height ?? DEFAULT_TABLE_SIZE.height,
            };
          }
          if (editingTableId && editingTableId !== node.id) finishEditing();
          setEditingTableId(node.id);
        }}
        onPaneClick={() => {
          setNodes((currentNodes) => currentNodes.map((node) => ({ ...node, selected: false })));
          setSelectedEdgeId(null);
          finishEditing();
        }}
        onEdgesChange={handleEdgesChange}
        onEdgeClick={(_, edge) => {
          setNodes((currentNodes) => currentNodes.map((node) => ({ ...node, selected: false })));
          finishEditing();
          setSelectedEdgeId(edge.id);
        }}
        elementsSelectable
        edgesFocusable
        selectionOnDrag
        panOnDrag={[1]}
        panOnScroll
        zoomOnScroll
        zoomOnPinch
        minZoom={0.1}
        selectionKeyCode={['Shift', 'Meta']}
        multiSelectionKeyCode={['Shift', 'Meta']}
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background />
        <Controls />
        <MiniMap />
        <FitViewOnNodeChange
          nodeCount={model.tables.length}
          fitViewKey={layoutVersion}
          onReady={restoredViewport ? undefined : handleViewportReady}
          skipFitView={Boolean(restoredViewport)}
        />
        <RestoreViewport
          viewport={restoredViewport}
          restoreKey={viewportRestoreVersion}
          onRestored={restoredViewport ? handleViewportReady : undefined}
        />
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

function tableCenterX(nodes: Node<LogicalTableNodeData>[], table: LogicalTable) {
  const node = nodes.find((candidate) => candidate.id === table.id);
  const position = node?.position ?? table.position ?? { x: 0, y: 0 };
  const width = node?.width ?? table.size?.width ?? DEFAULT_TABLE_SIZE.width;
  return position.x + width / 2;
}
