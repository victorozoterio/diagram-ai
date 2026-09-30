import assert from 'node:assert/strict';
import test from 'node:test';
import { createAuthOptions } from './auth.options';

test('habilita email e senha com a configuração segura esperada', () => {
  const options = createAuthOptions('development-secret-with-at-least-thirty-two-characters', 'http://localhost:3000');

  assert.equal(options.emailAndPassword.enabled, true);
  assert.equal(options.advanced.database.joins, true);
  assert.equal(options.baseURL, 'http://localhost:3000');
});

test('inclui Google somente quando as credenciais do provider são configuradas', () => {
  const options = createAuthOptions(
    'development-secret-with-at-least-thirty-two-characters',
    'http://localhost:3000/',
    {
      clientId: 'google-client-id',
      clientSecret: 'google-client-secret',
    },
  );

  assert.deepEqual(options.socialProviders?.google, {
    clientId: 'google-client-id',
    clientSecret: 'google-client-secret',
    redirectURI: 'http://localhost:3000/api/auth/callback/google',
  });
});
