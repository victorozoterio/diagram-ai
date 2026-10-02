import { expect, it } from 'vitest';
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

it('aceita autenticação somente por e-mail e senha sem credenciais sociais', () => {
  const environment = validateEnvironment(baseEnvironment());

  expect(environment.GOOGLE_CLIENT_ID).toBeUndefined();
  expect(environment.GITHUB_CLIENT_ID).toBeUndefined();
});

it('exige o par completo de credenciais para cada provider OAuth', () => {
  expect(() => validateEnvironment({ ...baseEnvironment(), GOOGLE_CLIENT_ID: 'google-client-id' })).toThrow(
    /Google: GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET devem ser configuradas juntas/,
  );
  expect(() => validateEnvironment({ ...baseEnvironment(), GITHUB_CLIENT_SECRET: 'github-client-secret' })).toThrow(
    /GitHub: GITHUB_CLIENT_ID e GITHUB_CLIENT_SECRET devem ser configuradas juntas/,
  );
});
