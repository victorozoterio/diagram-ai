import { createAuthClient } from 'better-auth/react';

const baseURL = import.meta.env.VITE_API_URL || window.location.origin;

export type SocialProvider = 'google' | 'github';

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    credentials: 'include',
  },
});

export type AuthSession = typeof authClient.$Infer.Session;

export async function getEnabledSocialProviders(): Promise<SocialProvider[]> {
  const response = await fetch(`${baseURL.replace(/\/$/, '')}/api/auth/providers`, {
    credentials: 'include',
  });

  if (!response.ok) return [];

  const payload = (await response.json()) as { providers?: unknown };
  if (!Array.isArray(payload.providers)) return [];

  return payload.providers.filter(
    (provider): provider is SocialProvider => provider === 'google' || provider === 'github',
  );
}
