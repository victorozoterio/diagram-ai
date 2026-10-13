import type { Attribute, ConceptualModel, LogicalModel, LogicalTable, Relationship } from '../../types';
import type { DiagramPosition, DiagramSize } from './editor.types';
import {
  attributePositionKey,
  conceptualElementIds,
  createManualElementId,
  relationshipPositionKey,
} from './model-factories';

const PASTE_OFFSET = 32;

type ConceptualVisualState = {
  elementPositions: Record<string, DiagramPosition>;
  entityPositions: Record<string, DiagramPosition>;
  nodeSizes: Record<string, DiagramSize>;
};

export type ConceptualClipboard = {
  mode: 'conceptual';
  model: ConceptualModel;
  selectedNodeIds: string[];
  visual: ConceptualVisualState;
};

export type LogicalClipboard = {
  mode: 'logical';
  model: LogicalModel;
  selectedTableIds: string[];
};

export type EditorClipboard = ConceptualClipboard | LogicalClipboard;

export function copyConceptualSelection(
  model: ConceptualModel,
  visual: ConceptualVisualState,
  selectedNodeIds: string[],
): ConceptualClipboard | null {
  const selected = new Set(selectedNodeIds);
  const entityIds = new Set(model.entities.filter((entity) => selected.has(entity.id)).map((entity) => entity.id));
  const relationshipIds = new Set(
    model.relationships
      .filter((relationship) => {
        if (selected.has(relationshipPositionKey(relationship.id))) return true;
        const participantIds = relationshipParticipantIds(relationship);
        return participantIds.length > 0 && participantIds.every((entityId) => entityIds.has(entityId));
      })
      .map((relationship) => relationship.id),
  );

  const standaloneAttributes = (model.standaloneAttributes ?? []).filter((attribute) =>
    selected.has(attributePositionKey(null, attribute.id)),
  );
  const detachedAttributes = [
    ...model.entities.flatMap((entity) =>
      entityIds.has(entity.id)
        ? []
        : entity.attributes.filter((attribute) => selected.has(attributePositionKey(entity.id, attribute.id))),
    ),
    ...model.relationships.flatMap((relationship) =>
      relationshipIds.has(relationship.id)
        ? []
        : relationship.attributes.filter((attribute) =>
            selected.has(`relationship-attribute:${relationship.id}:${attribute.id}`),
          ),
    ),
  ];
  const copiedModel: ConceptualModel = {
    ...structuredClone(model),
    entities: model.entities.filter((entity) => entityIds.has(entity.id)).map((entity) => structuredClone(entity)),
    standaloneAttributes: [...standaloneAttributes, ...detachedAttributes].map((attribute) =>
      structuredClone(attribute),
    ),
    relationships: model.relationships
      .filter((relationship) => relationshipIds.has(relationship.id))
      .map((relationship) => structuredClone(relationship)),
  };

  if (
    copiedModel.entities.length === 0 &&
    copiedModel.relationships.length === 0 &&
    (copiedModel.standaloneAttributes?.length ?? 0) === 0
  ) {
    return null;
  }

  return {
    mode: 'conceptual',
    model: copiedModel,
    selectedNodeIds: [...selected],
    visual: structuredClone(visual),
  };
}

export function pasteConceptualSelection(
  currentModel: ConceptualModel,
  clipboard: ConceptualClipboard,
  visual: ConceptualVisualState,
): { model: ConceptualModel; visual: ConceptualVisualState; selectedNodeIds: string[] } {
  const usedIds = conceptualElementIds(currentModel);
  const entityIdMap = new Map<string, string>();
  const attributeIdMap = new Map<string, string>();
  const nodeKeyMap = new Map<string, string>();
  const selectedNodeIds: string[] = [];

  const nextId = (prefix: string) => {
    const id = createManualElementId(prefix, usedIds);
    usedIds.add(id);
    return id;
  };
  const cloneAttribute = (
    attribute: Attribute,
    sourceNodeId: string,
    targetNodeIdForAttribute: (attributeId: string) => string,
    prefix: string,
  ): Attribute => {
    const id = nextId('attribute');
    attributeIdMap.set(`${prefix}:${attribute.id}`, id);
    const components = attribute.components.map((component) => {
      const componentId = nextId('attribute');
      return { ...structuredClone(component), id: componentId };
    });
    const targetNodeId = targetNodeIdForAttribute(id);
    nodeKeyMap.set(sourceNodeId, targetNodeId);
    selectedNodeIds.push(targetNodeId);
    return {
      ...structuredClone(attribute),
      id,
      components,
      parentAttributeId: undefined,
      entityHandle: undefined,
      connectionHandle: undefined,
      parentHandle: undefined,
      parentAttributeHandle: undefined,
      relationshipId: undefined,
      relationshipHandle: undefined,
      relationshipAttributeHandle: undefined,
    };
  };

  const entities = clipboard.model.entities.map((entity) => {
    const id = nextId('entity');
    entityIdMap.set(entity.id, id);
    nodeKeyMap.set(entity.id, id);
    selectedNodeIds.push(id);
    return {
      ...structuredClone(entity),
      id,
      attributes: entity.attributes.map((attribute) =>
        cloneAttribute(
          attribute,
          attributePositionKey(entity.id, attribute.id),
          (attributeId) => attributePositionKey(id, attributeId),
          `entity:${entity.id}`,
        ),
      ),
    };
  });

  for (const [sourceEntityId, targetEntityId] of entityIdMap) {
    const sourceEntity = clipboard.model.entities.find((entity) => entity.id === sourceEntityId);
    const targetEntity = entities.find((entity) => entity.id === targetEntityId);
    if (!sourceEntity || !targetEntity) continue;
    targetEntity.attributes = targetEntity.attributes.map((attribute, index) => {
      const original = sourceEntity.attributes[index];
      const parentAttributeId = original.parentAttributeId
        ? attributeIdMap.get(`entity:${sourceEntity.id}:${original.parentAttributeId}`)
        : undefined;
      return { ...attribute, parentAttributeId };
    });
  }

  const standaloneAttributes =
    clipboard.model.standaloneAttributes?.map((attribute) =>
      cloneAttribute(
        attribute,
        attributePositionKey(null, attribute.id),
        (attributeId) => attributePositionKey(null, attributeId),
        'standalone',
      ),
    ) ?? [];
  const relationships = clipboard.model.relationships.map((relationship) => {
    const id = nextId('relationship');
    nodeKeyMap.set(relationshipPositionKey(relationship.id), relationshipPositionKey(id));
    selectedNodeIds.push(relationshipPositionKey(id));
    const participants = relationship.participants.flatMap((participant) => {
      const entityId = entityIdMap.get(participant.entityId);
      return entityId ? [{ ...structuredClone(participant), entityId }] : [];
    });
    const supertypeId = relationship.supertypeId ? entityIdMap.get(relationship.supertypeId) : undefined;
    const subtypeIds = (relationship.subtypeIds ?? []).flatMap((subtypeId) => {
      const mappedId = entityIdMap.get(subtypeId);
      return mappedId ? [mappedId] : [];
    });
    const attributes = relationship.attributes.map((attribute) =>
      cloneAttribute(
        attribute,
        `relationship-attribute:${relationship.id}:${attribute.id}`,
        (attributeId) => `relationship-attribute:${id}:${attributeId}`,
        `relationship:${relationship.id}`,
      ),
    );
    return {
      ...structuredClone(relationship),
      id,
      participants,
      attributes,
      supertypeId,
      subtypeIds,
      subtypeHandles: Object.fromEntries(
        (relationship.subtypeIds ?? []).flatMap((subtypeId) => {
          const mappedId = entityIdMap.get(subtypeId);
          const handles = relationship.subtypeHandles?.[subtypeId];
          return mappedId && handles ? [[mappedId, structuredClone(handles)] as const] : [];
        }),
      ),
    };
  });

  const shiftedPositions = (source: Record<string, DiagramPosition>) => {
    const next = { ...source };
    for (const [sourceKey, targetKey] of nodeKeyMap) {
      const position = clipboard.visual.entityPositions[sourceKey] ?? clipboard.visual.elementPositions[sourceKey];
      if (position) next[targetKey] = { x: position.x + PASTE_OFFSET, y: position.y + PASTE_OFFSET };
    }
    return next;
  };
  const nodeSizes = { ...visual.nodeSizes };
  for (const [sourceKey, targetKey] of nodeKeyMap) {
    const size = clipboard.visual.nodeSizes[sourceKey];
    if (size) nodeSizes[targetKey] = structuredClone(size);
  }

  return {
    model: {
      ...currentModel,
      entities: [...currentModel.entities, ...entities],
      standaloneAttributes: [...(currentModel.standaloneAttributes ?? []), ...standaloneAttributes],
      relationships: [...currentModel.relationships, ...relationships],
    },
    visual: {
      entityPositions: shiftedPositions(visual.entityPositions),
      elementPositions: shiftedPositions(visual.elementPositions),
      nodeSizes,
    },
    selectedNodeIds,
  };
}

export function copyLogicalSelection(model: LogicalModel, selectedTableIds: string[]): LogicalClipboard | null {
  const selected = new Set(selectedTableIds);
  const tables = model.tables.filter((table) => selected.has(table.id));
  if (tables.length === 0) return null;

  return {
    mode: 'logical',
    model: {
      ...structuredClone(model),
      tables,
      relationships: (model.relationships ?? []).filter(
        (relationship) => selected.has(relationship.source) && selected.has(relationship.target),
      ),
    },
    selectedTableIds: [...selected],
  };
}

export function pasteLogicalSelection(
  currentModel: LogicalModel,
  clipboard: LogicalClipboard,
): { model: LogicalModel; selectedTableIds: string[] } {
  const usedIds = new Set(
    currentModel.tables.flatMap((table) => [table.id, ...table.columns.map((column) => column.id)]),
  );
  const tableIdMap = new Map<string, string>();
  const columnIdMap = new Map<string, string>();
  const nextId = (prefix: string) => {
    const id = createManualElementId(prefix, usedIds);
    usedIds.add(id);
    return id;
  };
  const tables: LogicalTable[] = clipboard.model.tables.map((table) => {
    const id = nextId('logical-table');
    tableIdMap.set(table.id, id);
    const columns = table.columns.map((column) => {
      const columnId = nextId('column');
      columnIdMap.set(`${table.id}:${column.id}`, columnId);
      return { ...structuredClone(column), id: columnId, references: undefined, foreignKey: false };
    });
    return {
      ...structuredClone(table),
      id,
      columns,
      position: table.position ? { x: table.position.x + PASTE_OFFSET, y: table.position.y + PASTE_OFFSET } : undefined,
    };
  });

  for (const sourceTable of clipboard.model.tables) {
    const targetTable = tables.find((table) => table.id === tableIdMap.get(sourceTable.id));
    if (!targetTable) continue;
    targetTable.columns = targetTable.columns.map((column, index) => {
      const sourceColumn = sourceTable.columns[index];
      if (!sourceColumn.references) return column;
      const targetTableId = tableIdMap.get(sourceColumn.references.tableId);
      const targetColumnId = columnIdMap.get(`${sourceColumn.references.tableId}:${sourceColumn.references.columnId}`);
      return targetTableId && targetColumnId
        ? {
            ...column,
            foreignKey: sourceColumn.foreignKey,
            references: { ...sourceColumn.references, tableId: targetTableId, columnId: targetColumnId },
          }
        : column;
    });
  }

  const relationships = (clipboard.model.relationships ?? []).flatMap((relationship) => {
    const source = tableIdMap.get(relationship.source);
    const target = tableIdMap.get(relationship.target);
    return source && target
      ? [{ ...structuredClone(relationship), id: nextId('logical-relationship'), source, target }]
      : [];
  });

  return {
    model: {
      ...currentModel,
      tables: [...currentModel.tables, ...tables],
      relationships: [...(currentModel.relationships ?? []), ...relationships],
    },
    selectedTableIds: tables.map((table) => table.id),
  };
}

function relationshipParticipantIds(relationship: Relationship): string[] {
  if (relationship.kind === 'generalization' || relationship.kind === 'specialization') {
    return [relationship.supertypeId, ...(relationship.subtypeIds ?? [])].filter((id): id is string => Boolean(id));
  }
  return relationship.participants.map((participant) => participant.entityId);
}
