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
