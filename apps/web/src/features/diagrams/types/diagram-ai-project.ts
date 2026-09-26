import type { Edge, Node, Viewport } from '@xyflow/react';
import type { ConceptualModel } from './conceptual-model';
import type { LogicalModel } from './logical-model';

export const DIAGRAM_AI_FORMAT = 'diagram-ai' as const;
export const DIAGRAM_AI_FORMAT_VERSION = 1 as const;

type JsonPrimitive = string | number | boolean | null;
export type DiagramAiJsonValue = JsonPrimitive | DiagramAiJsonObject | DiagramAiJsonValue[];
export type DiagramAiJsonObject = { [key: string]: DiagramAiJsonValue };

export type DiagramAiFlowNode = {
  id: string;
  type?: string;
  position: { x: number; y: number };
  origin?: [number, number];
  width?: number;
  height?: number;
  initialWidth?: number;
  initialHeight?: number;
  selected?: boolean;
  style?: DiagramAiJsonObject;
  data?: DiagramAiJsonObject;
};

export type DiagramAiFlowEdge = {
  id: string;
  type?: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  selected?: boolean;
  animated?: boolean;
  interactionWidth?: number;
  style?: DiagramAiJsonObject;
  data?: DiagramAiJsonObject;
};

export type DiagramAiProject = {
  format: typeof DIAGRAM_AI_FORMAT;
  version: typeof DIAGRAM_AI_FORMAT_VERSION;
  exportedAt: string;
  modelType: 'conceptual' | 'logical';
  semanticModel: ConceptualModel | LogicalModel;
  visual: {
    nodes: DiagramAiFlowNode[];
    edges: DiagramAiFlowEdge[];
    viewport: Viewport;
    state?: DiagramAiJsonObject;
  };
};

export class DiagramAiProjectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DiagramAiProjectError';
  }
}

type CreateDiagramAiProjectInput = {
  modelType: DiagramAiProject['modelType'];
  semanticModel: ConceptualModel | LogicalModel;
  nodes: Node[];
  edges: Edge[];
  viewport?: Viewport;
  visualState?: Record<string, unknown>;
};

/** Cria o artefato versionado usado para exportar e futuramente restaurar um diagrama. */
export function createDiagramAiProject({
  modelType,
  semanticModel,
  nodes,
  edges,
  viewport = { x: 0, y: 0, zoom: 1 },
  visualState,
}: CreateDiagramAiProjectInput): DiagramAiProject {
  return {
    format: DIAGRAM_AI_FORMAT,
    version: DIAGRAM_AI_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    modelType,
    semanticModel,
    visual: {
      nodes: nodes.map(serializeFlowNode),
      edges: edges.map(serializeFlowEdge),
      viewport,
      ...(visualState ? { state: serializeJsonObject(visualState) } : {}),
    },
  };
}

/** Valida um arquivo .diagramai antes de qualquer estado do editor ser alterado. */
export function parseDiagramAiProject(value: unknown): DiagramAiProject {
  if (!isRecord(value) || value.format !== DIAGRAM_AI_FORMAT) {
    throw new DiagramAiProjectError('Este arquivo não é um projeto válido do Diagram.AI.');
  }

  if (value.version !== DIAGRAM_AI_FORMAT_VERSION) {
    throw new DiagramAiProjectError(`A versão ${String(value.version)} deste arquivo não é compatível.`);
  }

  if (typeof value.exportedAt !== 'string' || !isValidDate(value.exportedAt)) {
    throw new DiagramAiProjectError('O arquivo não possui uma data de exportação válida.');
  }

  if (value.modelType !== 'conceptual' && value.modelType !== 'logical') {
    throw new DiagramAiProjectError('O tipo de modelo do arquivo é inválido.');
  }

  if (!isValidSemanticModel(value.semanticModel, value.modelType)) {
    throw new DiagramAiProjectError('O modelo semântico do arquivo está incompleto ou inválido.');
  }

  if (!isValidVisualState(value.visual)) {
    throw new DiagramAiProjectError('O estado visual do arquivo está incompleto ou inválido.');
  }

  return value as DiagramAiProject;
}

function serializeFlowNode(node: Node): DiagramAiFlowNode {
  return {
    id: node.id,
    ...(node.type ? { type: node.type } : {}),
    position: { ...node.position },
    ...(node.origin ? { origin: node.origin } : {}),
    ...(node.width !== undefined ? { width: node.width } : {}),
    ...(node.height !== undefined ? { height: node.height } : {}),
    ...(node.initialWidth !== undefined ? { initialWidth: node.initialWidth } : {}),
    ...(node.initialHeight !== undefined ? { initialHeight: node.initialHeight } : {}),
    ...(node.selected !== undefined ? { selected: node.selected } : {}),
    ...(node.style ? { style: serializeJsonObject(node.style) } : {}),
    ...(node.data ? { data: serializeJsonObject(node.data) } : {}),
  };
}

function serializeFlowEdge(edge: Edge): DiagramAiFlowEdge {
  return {
    id: edge.id,
    ...(edge.type ? { type: edge.type } : {}),
    source: edge.source,
    target: edge.target,
    ...(edge.sourceHandle !== undefined ? { sourceHandle: edge.sourceHandle } : {}),
    ...(edge.targetHandle !== undefined ? { targetHandle: edge.targetHandle } : {}),
    ...(edge.selected !== undefined ? { selected: edge.selected } : {}),
    ...(edge.animated !== undefined ? { animated: edge.animated } : {}),
    ...(edge.interactionWidth !== undefined ? { interactionWidth: edge.interactionWidth } : {}),
    ...(edge.style ? { style: serializeJsonObject(edge.style) } : {}),
    ...(edge.data ? { data: serializeJsonObject(edge.data) } : {}),
  };
}

function serializeJsonObject(value: object): DiagramAiJsonObject {
  const serialized = serializeJsonValue(value);
  return isJsonObject(serialized) ? serialized : {};
}

function serializeJsonValue(value: unknown): DiagramAiJsonValue | undefined {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return Number.isFinite(value) || typeof value !== 'number' ? value : undefined;
  }

  if (typeof value === 'function' || typeof value === 'undefined' || typeof value === 'symbol') {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const serialized = serializeJsonValue(item);
      return serialized === undefined ? [] : [serialized];
    });
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, item]) => {
        const serialized = serializeJsonValue(item);
        return serialized === undefined ? [] : [[key, serialized]];
      }),
    );
  }

  return undefined;
}

function isJsonObject(value: DiagramAiJsonValue | undefined): value is DiagramAiJsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isValidSemanticModel(value: unknown, modelType: DiagramAiProject['modelType']) {
  if (!isRecord(value)) return false;

  if (modelType === 'conceptual') {
    return (
      isRecord(value.metadata) &&
      Array.isArray(value.entities) &&
      Array.isArray(value.relationships) &&
      Array.isArray(value.ambiguities) &&
      value.entities.every(isConceptualEntity) &&
      value.relationships.every(isConceptualRelationship) &&
      optionalArray(value.standaloneAttributes, isConceptualAttribute)
    );
  }

  return (
    Array.isArray(value.tables) &&
    value.tables.every(isLogicalTable) &&
    optionalArray(value.relationships, isLogicalRelationship)
  );
}

function isConceptualEntity(value: unknown) {
  return (
    isRecord(value) &&
    isIdAndName(value) &&
    Array.isArray(value.attributes) &&
    value.attributes.every(isConceptualAttribute)
  );
}

function isConceptualRelationship(value: unknown) {
  return (
    isRecord(value) &&
    isIdAndName(value) &&
    Array.isArray(value.participants) &&
    value.participants.every(isConceptualParticipant) &&
    Array.isArray(value.attributes) &&
    value.attributes.every(isConceptualAttribute)
  );
}

function isConceptualParticipant(value: unknown) {
  return (
    isRecord(value) && typeof value.entityId === 'string' && (value.cardinality === '1' || value.cardinality === 'N')
  );
}

function isConceptualAttribute(value: unknown) {
  return (
    isRecord(value) &&
    isIdAndName(value) &&
    typeof value.type === 'string' &&
    typeof value.identifier === 'boolean' &&
    typeof value.required === 'boolean' &&
    typeof value.unique === 'boolean' &&
    typeof value.multivalued === 'boolean' &&
    typeof value.composite === 'boolean' &&
    typeof value.derived === 'boolean' &&
    Array.isArray(value.components) &&
    value.components.every(
      (component) => isRecord(component) && isIdAndName(component) && typeof component.type === 'string',
    )
  );
}

function isLogicalTable(value: unknown) {
  return isRecord(value) && isIdAndName(value) && Array.isArray(value.columns) && value.columns.every(isLogicalColumn);
}

function isLogicalColumn(value: unknown) {
  return (
    isRecord(value) &&
    isIdAndName(value) &&
    typeof value.type === 'string' &&
    typeof value.primaryKey === 'boolean' &&
    typeof value.foreignKey === 'boolean' &&
    typeof value.required === 'boolean' &&
    typeof value.unique === 'boolean' &&
    (value.nullable === undefined || typeof value.nullable === 'boolean') &&
    (value.references === undefined || isLogicalReference(value.references))
  );
}

function isLogicalReference(value: unknown) {
  return isRecord(value) && typeof value.tableId === 'string' && typeof value.columnId === 'string';
}

function isLogicalRelationship(value: unknown) {
  return isRecord(value) && isIdAndName(value) && typeof value.source === 'string' && typeof value.target === 'string';
}

function isIdAndName(value: Record<string, unknown>) {
  return typeof value.id === 'string' && value.id.length > 0 && typeof value.name === 'string';
}

function optionalArray(value: unknown, validateItem: (item: unknown) => boolean = () => true) {
  return value === undefined || (Array.isArray(value) && value.every(validateItem));
}

function isValidVisualState(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.nodes) || !Array.isArray(value.edges) || !isRecord(value.viewport)) {
    return false;
  }

  const { viewport } = value;
  const nodeIds = new Set(value.nodes.map((node) => (isRecord(node) && typeof node.id === 'string' ? node.id : '')));
  return (
    isFiniteNumber(viewport.x) &&
    isFiniteNumber(viewport.y) &&
    isFiniteNumber(viewport.zoom) &&
    nodeIds.size === value.nodes.length &&
    value.nodes.every(isVisualNode) &&
    value.edges.every((edge) => isVisualEdge(edge) && nodeIds.has(edge.source) && nodeIds.has(edge.target))
  );
}

function isVisualNode(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    isRecord(value.position) &&
    isFiniteNumber(value.position.x) &&
    isFiniteNumber(value.position.y)
  );
}

function isVisualEdge(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.source === 'string' &&
    typeof value.target === 'string'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidDate(value: string) {
  return Number.isFinite(Date.parse(value));
}
