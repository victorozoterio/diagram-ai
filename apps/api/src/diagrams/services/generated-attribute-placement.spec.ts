import { expect, it } from 'vitest';

import { parseConceptualModelResponse } from '../../ai/providers/ollama/conceptual-model-response.parser';
import { ConceptualModelSchema } from '../schemas/conceptual-model.schema';
import { misplacedGeneratedAttributes, reconcileGeneratedAttributePlacement } from './generated-attribute-placement';
import { normalizeCompositeAttributes } from './normalize-composite-attributes';

const description = [
  'Cada colaborador possui nome e cargo.',
  'Cada unidade possui localização.',
  'Colaboradores trabalham em unidades.',
  'Cada atividade possui nome e data de início.',
  'Colaboradores participam de atividades.',
  'Para cada participação de um colaborador em uma atividade, registre a data em que ele começou a trabalhar na atividade.',
].join(' ');

it('localiza na resposta compacta os atributos criados no lugar de entidades e relações', () => {
  const raw = JSON.stringify({
    e: [
      {
        n: 'colaborador',
        a: [
          { n: 'nome', t: 's' },
          { n: 'cargo', t: 's' },
          { n: 'unidade', t: 's', f: ['c'] },
        ],
      },
      { n: 'unidade', a: [{ n: 'localizacao', t: 's' }] },
      {
        n: 'atividade',
        a: [
          { n: 'nome', t: 's' },
          { n: 'data_inicio', t: 'd' },
          { n: 'data_inicio_participacao', t: 'd', f: ['c'] },
        ],
      },
    ],
    r: [
      {
        n: 'trabalha_em',
        p: [
          { e: 'colaborador', c: 'N' },
          { e: 'unidade', c: '1' },
        ],
      },
      {
        n: 'participa_de',
        p: [
          { e: 'colaborador', c: 'N' },
          { e: 'atividade', c: 'N' },
        ],
      },
    ],
  });
  const generated = parseConceptualModelResponse(raw, description);
  generated.metadata.generatedBy = 'ollama';
  generated.metadata.sourceText = description;

  expect(generated.entities[0].attributes.find(({ name }) => name === 'unidade')).toMatchObject({
    composite: true,
    components: [],
  });
  expect(generated.entities[2].attributes.find(({ name }) => name === 'data_inicio_participacao')).toMatchObject({
    composite: true,
    components: [],
  });

  const normalized = normalizeCompositeAttributes(generated);
  expect(normalized.entities[0].attributes.find(({ name }) => name === 'unidade')?.composite).toBe(false);
  expect(normalized.entities[2].attributes.find(({ name }) => name === 'data_inicio_participacao')?.composite).toBe(
    false,
  );

  expect(misplacedGeneratedAttributes(normalized)).toEqual([
    expect.objectContaining({
      entity: 'colaborador',
      attribute: 'unidade',
      relationship: 'trabalha_em',
      reason: 'entity-used-as-attribute',
    }),
    expect.objectContaining({
      entity: 'atividade',
      attribute: 'data_inicio_participacao',
      relationship: 'participa_de',
      reason: 'association-attribute-in-entity',
    }),
  ]);
  expect(normalized.entities[2].attributes.some(({ name }) => name === 'data_inicio')).toBe(true);

  const reconciled = reconcileGeneratedAttributePlacement(normalized);
  expect(misplacedGeneratedAttributes(reconciled)).toEqual([]);
  expect(reconciled.entities[0].attributes.some(({ name }) => name === 'unidade')).toBe(false);
  expect(reconciled.entities[2].attributes.map(({ name }) => name)).toContain('data_inicio');
  expect(reconciled.entities[2].attributes.some(({ name }) => name === 'data_inicio_participacao')).toBe(false);
  expect(reconciled.relationships[1].attributes.map(({ name }) => name)).toEqual(['data_inicio_participacao']);
  expect(ConceptualModelSchema.safeParse(reconciled).success).toBe(true);
});

it('não rejeita atributos próprios nem associações com o dado na posição correta', () => {
  const model = parseConceptualModelResponse(
    JSON.stringify({
      e: [
        {
          n: 'colaborador',
          a: [
            { n: 'nome', t: 's' },
            { n: 'cargo', t: 's' },
          ],
        },
        { n: 'unidade', a: [{ n: 'localizacao', t: 's' }] },
        {
          n: 'atividade',
          a: [
            { n: 'nome', t: 's' },
            { n: 'data_inicio', t: 'd' },
          ],
        },
      ],
      r: [
        {
          n: 'trabalha_em',
          p: [
            { e: 'colaborador', c: 'N' },
            { e: 'unidade', c: '1' },
          ],
        },
        {
          n: 'participa_de',
          p: [
            { e: 'colaborador', c: 'N' },
            { e: 'atividade', c: 'N' },
          ],
          a: [{ n: 'data_inicio_participacao', t: 'd' }],
        },
      ],
    }),
    description,
  );
  model.metadata.generatedBy = 'ollama';
  model.metadata.sourceText = description;

  expect(misplacedGeneratedAttributes(model)).toEqual([]);
  expect(ConceptualModelSchema.safeParse(model).success).toBe(true);
});

it('mantém o atributo próprio mesmo quando a associação também menciona o mesmo fato genérico', () => {
  const sourceText = [
    'Cada tarefa possui data de início.',
    'Pessoas participam de tarefas.',
    'Para cada participação de uma pessoa em uma tarefa, registre a data de início da participação.',
  ].join(' ');
  const model = parseConceptualModelResponse(
    JSON.stringify({
      e: [{ n: 'pessoa' }, { n: 'tarefa', a: [{ n: 'data_inicio', t: 'd' }] }],
      r: [
        {
          n: 'participa_de',
          p: [
            { e: 'pessoa', c: 'N' },
            { e: 'tarefa', c: 'N' },
          ],
        },
      ],
    }),
    sourceText,
  );
  model.metadata = { generatedBy: 'ollama', sourceText };

  expect(misplacedGeneratedAttributes(model)).toEqual([]);
});
