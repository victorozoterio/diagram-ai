import { getNodesBounds, getViewportForBounds, type Node } from '@xyflow/react';
import type { DiagramAiProject } from '../../types';

export type DiagramViewport = { x: number; y: number; zoom: number };
export type EditorModeViewports = Record<'conceptual' | 'logical', DiagramViewport | null>;

export type ViewportSize = { width: number; height: number };

const DEFAULT_EMPTY_VIEWPORT: DiagramViewport = { x: 0, y: 0, zoom: 1 };
const INITIAL_MIN_ZOOM = 0.1;
const INITIAL_MAX_ZOOM = 2;
const INITIAL_PADDING = 0.1;

export const EMPTY_MODE_VIEWPORTS: EditorModeViewports = {
  conceptual: null,
  logical: null,
};

export function withModeViewport(
  viewports: EditorModeViewports,
  mode: keyof EditorModeViewports,
  viewport: DiagramViewport | null,
): EditorModeViewports {
  return { ...viewports, [mode]: viewport };
}

/** Calcula a câmera inicial sem depender de um React Flow já montado. */
export function viewportForProjectBounds(project: DiagramAiProject, viewportSize: ViewportSize): DiagramViewport {
  if (project.visual.nodes.length === 0 || viewportSize.width <= 0 || viewportSize.height <= 0) {
    return DEFAULT_EMPTY_VIEWPORT;
  }

  const nodes = project.visual.nodes.map(
    (node) =>
      ({
        id: node.id,
        data: {},
        position: node.position,
        origin: node.origin,
        width: node.width ?? node.initialWidth ?? dimensionFromStyle(node.style?.width) ?? 1,
        height: node.height ?? node.initialHeight ?? dimensionFromStyle(node.style?.height) ?? 1,
      }) satisfies Node,
  );
  const bounds = getNodesBounds(nodes);

  return getViewportForBounds(
    bounds,
    viewportSize.width,
    viewportSize.height,
    INITIAL_MIN_ZOOM,
    INITIAL_MAX_ZOOM,
    INITIAL_PADDING,
  );
}

function dimensionFromStyle(value: unknown): number | undefined {
  if (typeof value === 'number' && value > 0) return value;
  if (typeof value === 'string') {
    const dimension = Number.parseFloat(value);
    return Number.isFinite(dimension) && dimension > 0 ? dimension : undefined;
  }
  return undefined;
}
