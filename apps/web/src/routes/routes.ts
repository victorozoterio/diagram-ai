export const ROUTES = {
  AUTH: {
    SIGN_IN: '/login',
    SIGN_UP: '/cadastro',
  },
  EDITOR: '/',
} as const;

export type AppPath = (typeof ROUTES.AUTH)[keyof typeof ROUTES.AUTH] | typeof ROUTES.EDITOR;
