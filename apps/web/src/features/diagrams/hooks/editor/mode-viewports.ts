export type DiagramViewport = { x: number; y: number; zoom: number };
export type EditorModeViewports = Record<'conceptual' | 'logical', DiagramViewport | null>;

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
