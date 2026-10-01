export const ROUTES = {
  AUTH: {
    SIGN_IN: '/login',
    SIGN_UP: '/cadastro',
  },
  DIAGRAMS: '/',
  EDITOR: '/editor',
} as const;

export function editorDiagramPath(diagramId: string) {
  return `${ROUTES.EDITOR}/${encodeURIComponent(diagramId)}` as const;
}

export type AppPath =
  | (typeof ROUTES.AUTH)[keyof typeof ROUTES.AUTH]
  | typeof ROUTES.DIAGRAMS
  | typeof ROUTES.EDITOR
  | `${typeof ROUTES.EDITOR}/${string}`;
