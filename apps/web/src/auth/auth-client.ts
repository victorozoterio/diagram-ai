import { createAuthClient } from 'better-auth/react';

const baseURL = import.meta.env.VITE_API_URL || window.location.origin;

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    credentials: 'include',
  },
});

export type AuthSession = typeof authClient.$Infer.Session;
