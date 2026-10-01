import assert from 'node:assert/strict';
import test from 'node:test';
import { createAuthOptions } from './auth.options';

test('habilita email e senha com a configuração segura esperada', () => {
  const options = createAuthOptions(
    'development-secret-with-at-least-thirty-two-characters',
    'http://localhost:3000',
    'http://localhost:5173',
    {
      google: { clientId: 'google-client-id', clientSecret: 'google-client-secret' },
      github: { clientId: 'github-client-id', clientSecret: 'github-client-secret' },
    },
  );

  assert.equal(options.emailAndPassword.enabled, true);
  assert.equal(options.advanced.database.joins, true);
  assert.equal(options.baseURL, 'http://localhost:3000');
  assert.deepEqual(options.trustedOrigins, ['http://localhost:5173']);
});

test('configura o callback do Google', () => {
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

  assert.deepEqual(options.socialProviders?.google, {
    clientId: 'google-client-id',
    clientSecret: 'google-client-secret',
    redirectURI: 'http://localhost:3000/api/auth/callback/google',
  });
});

test('inclui GitHub com o escopo mínimo para leitura do email', () => {
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

  assert.deepEqual(options.socialProviders?.github, {
    clientId: 'github-client-id',
    clientSecret: 'github-client-secret',
    redirectURI: 'http://localhost:3000/api/auth/callback/github',
    scope: ['user:email'],
  });
});
