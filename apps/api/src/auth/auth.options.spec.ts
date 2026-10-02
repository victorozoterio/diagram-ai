import { expect, it } from 'vitest';
import { createAuthOptions } from './auth.options';

it('habilita email e senha com a configuração segura esperada', () => {
  const options = createAuthOptions(
    'development-secret-with-at-least-thirty-two-characters',
    'http://localhost:3000',
    'http://localhost:5173',
    {
      google: { clientId: 'google-client-id', clientSecret: 'google-client-secret' },
      github: { clientId: 'github-client-id', clientSecret: 'github-client-secret' },
    },
  );

  expect(options.emailAndPassword.enabled).toBe(true);
  expect(options.advanced.database.joins).toBe(true);
  expect(options.baseURL).toBe('http://localhost:3000');
  expect(options.trustedOrigins).toEqual(['http://localhost:5173']);
});

it('não configura providers sociais sem pares de credenciais', () => {
  const options = createAuthOptions(
    'development-secret-with-at-least-thirty-two-characters',
    'http://localhost:3000',
    'http://localhost:5173',
    {},
  );

  expect('socialProviders' in options).toBe(false);
});

it('configura somente o provider com credenciais disponíveis', () => {
  const options = createAuthOptions(
    'development-secret-with-at-least-thirty-two-characters',
    'http://localhost:3000',
    'http://localhost:5173',
    { google: { clientId: 'google-client-id', clientSecret: 'google-client-secret' } },
  );

  expect(options.socialProviders?.google).toBeTruthy();
  expect(options.socialProviders?.github).toBeUndefined();
});

it('configura o callback do Google', () => {
  const options = createAuthOptions(
    'development-secret-with-at-least-thirty-two-characters',
    'http://localhost:3000/',
    'http://localhost:5173',
    {
      google: {
        clientId: 'google-client-id',
        clientSecret: 'google-client-secret',
      },
      github: {
        clientId: 'github-client-id',
        clientSecret: 'github-client-secret',
      },
    },
  );

  expect(options.socialProviders?.google).toEqual({
    clientId: 'google-client-id',
    clientSecret: 'google-client-secret',
    redirectURI: 'http://localhost:3000/api/auth/callback/google',
  });
});

it('inclui GitHub com o escopo mínimo para leitura do email', () => {
  const options = createAuthOptions(
    'development-secret-with-at-least-thirty-two-characters',
    'http://localhost:3000',
    'http://localhost:5173',
    {
      google: {
        clientId: 'google-client-id',
        clientSecret: 'google-client-secret',
      },
      github: {
        clientId: 'github-client-id',
        clientSecret: 'github-client-secret',
      },
    },
  );

  expect(options.socialProviders?.github).toEqual({
    clientId: 'github-client-id',
    clientSecret: 'github-client-secret',
    redirectURI: 'http://localhost:3000/api/auth/callback/github',
    scope: ['user:email'],
  });
});
