import { expect, it, vi } from 'vitest';

import { ENV } from '../../config/environments';
import { OllamaProvider } from './ollama.provider';

function providerWithChatResponse(content: string) {
  const provider = new OllamaProvider({
    getOrThrow: vi.fn((key: string) => {
      if (key === ENV.OLLAMA_BASE_URL) return 'http://localhost:11434';
      if (key === ENV.OLLAMA_MODEL) return 'qwen2.5:7b-instruct';
      throw new Error(`Variável inesperada: ${key}`);
    }),
  } as never);

  vi.spyOn(provider as unknown as { chat: () => Promise<string> }, 'chat').mockResolvedValue(content);
  return provider;
}

it('usa fallback sem perguntas quando o Ollama retorna JSON inválido na análise', async () => {
  const provider = providerWithChatResponse('{ resposta inválida');

  await expect(provider.analyzeAmbiguities('Um A se relaciona com B.')).resolves.toEqual({
    requiresClarification: false,
    questions: [],
  });
});

it('preserva e normaliza uma pergunta quando as opções de cardinalidade são inconsistentes', async () => {
  const provider = providerWithChatResponse(
    JSON.stringify({
      requiresClarification: true,
      questions: [
        {
          id: 'cardinalidade_a_b',
          kind: 'cardinality',
          participants: ['a', 'b'],
          text: 'Como A e B se relacionam?',
          options: [
            'Cada A se relaciona com um B, e cada B se relaciona com um A (1:1)',
            'Um A se relaciona com vários B, e cada B se relaciona com um A (1:N)',
            'Um A se relaciona com vários B, e cada B se relaciona com um A (N:1)',
            'Um A se relaciona com vários B, e um B se relaciona com vários A (N:N)',
          ],
          allowsMultipleSelection: false,
          allowsCustomAnswer: true,
        },
      ],
    }),
  );

  const result = await provider.analyzeAmbiguities('Um A se relaciona com B.');

  expect(result.requiresClarification).toBe(true);
  expect(result.questions).toHaveLength(1);
  expect(result.questions[0]?.options[2]).toContain('(N:1)');
});

it('retorna ao frontend pergunta cardinal do contrato antigo com participantes estruturados recuperados', async () => {
  const provider = providerWithChatResponse(
    JSON.stringify({
      requiresClarification: true,
      questions: [
        {
          id: 'cardinalidade_origem_destino',
          kind: 'cardinality',
          text: 'Como origem e destino se relacionam?',
          options: [
            'Cada origem se relaciona com um destino, e cada destino possui uma origem (1:1)',
            'Uma origem pode se relacionar com vários destinos, e cada destino possui uma origem (1:N)',
            'Cada origem se relaciona com um destino, e um destino pode possuir várias origens (N:1)',
            'Uma origem pode se relacionar com vários destinos, e um destino pode possuir várias origens (N:N)',
          ],
          allowsMultipleSelection: false,
          allowsCustomAnswer: true,
        },
      ],
    }),
  );

  await expect(provider.analyzeAmbiguities('Origens se relacionam com destinos.')).resolves.toMatchObject({
    requiresClarification: true,
    questions: [
      {
        participants: ['origem', 'destino'],
        optionCardinalities: expect.arrayContaining([
          expect.objectContaining({
            optionIndex: 3,
            cardinality: {
              participants: [
                { entity: 'origem', cardinality: 'N' },
                { entity: 'destino', cardinality: 'N' },
              ],
            },
          }),
        ]),
      },
    ],
  });
});
