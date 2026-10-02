import assert from 'node:assert/strict';
import test from 'node:test';
import { validateEnvironment } from './environments';

function baseEnvironment() {
  return {
    DATABASE_URL: 'postgresql://postgres:root@localhost:5432/diagram-ai',
    BETTER_AUTH_URL: 'http://localhost:3000',
    BETTER_AUTH_SECRET: 'development-secret-with-at-least-thirty-two-characters',
    OLLAMA_BASE_URL: 'http://localhost:11434',
    OLLAMA_MODEL: 'qwen2.5:7b-instruct',
  };
}

test('aceita autenticação somente por e-mail e senha sem credenciais sociais', () => {
  const environment = validateEnvironment(baseEnvironment());

  assert.equal(environment.GOOGLE_CLIENT_ID, undefined);
  assert.equal(environment.GITHUB_CLIENT_ID, undefined);
});

test('exige o par completo de credenciais para cada provider OAuth', () => {
  assert.throws(
    () => validateEnvironment({ ...baseEnvironment(), GOOGLE_CLIENT_ID: 'google-client-id' }),
    /Google: GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET devem ser configuradas juntas/,
  );
  assert.throws(
    () => validateEnvironment({ ...baseEnvironment(), GITHUB_CLIENT_SECRET: 'github-client-secret' }),
    /GitHub: GITHUB_CLIENT_ID e GITHUB_CLIENT_SECRET devem ser configuradas juntas/,
  );
});
