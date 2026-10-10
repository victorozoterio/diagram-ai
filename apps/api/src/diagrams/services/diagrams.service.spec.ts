import { BadRequestException } from '@nestjs/common';
import { expect, it, vi } from 'vitest';

import type { AiService } from '../../ai/ai.service';
import type { ConceptualModel } from '../schemas/conceptual-model.schema';
import { DiagramsService } from './diagrams.service';
import { LogicalModelConverterService } from './logical-model-converter.service';
import { SqlGeneratorService } from './sql-generator.service';

function model(
  relationshipAttributeName: string,
  firstCardinality: '1' | 'N' = 'N',
  secondCardinality: '1' | 'N' = 'N',
): ConceptualModel {
  const attribute = (name: string, type: 'uuid' | 'date' = 'date') => ({
    id: name,
    name,
    type,
    identifier: name.startsWith('id_'),
    required: name.startsWith('id_'),
    unique: name.startsWith('id_'),
    multivalued: false,
    composite: false,
    derived: false,
    components: [],
  });

  return {
    metadata: {},
    standaloneAttributes: [],
    ambiguities: [],
    entities: [
      { id: 'origem', name: 'origem', attributes: [attribute('id_origem', 'uuid'), attribute('data_inicio')] },
      { id: 'destino', name: 'destino', attributes: [attribute('id_destino', 'uuid')] },
    ],
    relationships: [
      {
        id: 'associa_1',
        name: 'associa',
        type: firstCardinality === 'N' && secondCardinality === 'N' ? 'N:N' : '1:N',
        kind: 'relationship',
        participants: [
          { entityId: 'origem', cardinality: firstCardinality },
          { entityId: 'destino', cardinality: secondCardinality },
        ],
        attributes: [attribute(relationshipAttributeName)],
        subtypeIds: [],
        subtypeHandles: {},
      },
    ],
  };
}

it('reenvia o modelo inválido e o conflito estruturado ao repair antes de aceitar a correção', async () => {
  const invalidModel = model('data_inicio');
  const correctedModel = model('data_inicio_associacao');
  const fixConceptualModel = vi.fn(async (params: { invalidModel: ConceptualModel; validationError: unknown }) => {
    expect(params.invalidModel).toBe(invalidModel);
    expect(params.validationError && typeof params.validationError === 'object').toBe(true);
    const repairPayload = params.validationError as {
      tree: unknown;
      repair: { duplicateRelationshipAttributes: unknown };
    };
    expect(repairPayload.tree).toBeDefined();
    expect(repairPayload.repair.duplicateRelationshipAttributes).toEqual([
      {
        relationship: 'associa',
        relationshipAttribute: 'data_inicio',
        participantAttributes: [{ entity: 'origem', attribute: 'data_inicio' }],
        rule: 'O mesmo atributo não deve ser duplicado em uma entidade participante e no relacionamento.',
      },
    ]);
    return correctedModel;
  });
  const aiService = {
    generateConceptualModel: vi.fn(async () => invalidModel),
    fixConceptualModel,
  } as unknown as AiService;

  const service = new DiagramsService(aiService, {} as never, {} as never, {} as never);
  const result = await service.generate({ description: 'Descrição de teste.', mode: 'conceptual' });

  expect(fixConceptualModel).toHaveBeenCalledTimes(1);
  if (!('relationships' in result)) {
    throw new Error('O modelo corrigido deveria conter relacionamentos.');
  }
  expect(result.relationships[0].attributes[0].name).toBe('data_inicio_associacao');
});

it('aplica a cardinalidade explicitamente confirmada ao modelo conceitual retornado pela IA', async () => {
  const invertedModel = model('data_associacao', 'N', '1');
  const aiService = {
    generateConceptualModel: vi.fn(async () => invertedModel),
  } as unknown as AiService;

  const service = new DiagramsService(aiService, {} as never, {} as never, {} as never);
  const result = await service.generate({
    description: 'Uma origem possui vários destinos e cada destino pertence a uma origem.',
    mode: 'conceptual',
    clarifications: [
      {
        questionId: 'cardinalidade_origem_destino',
        kind: 'cardinality',
        answers: ['Uma origem possui vários destinos, e cada destino pertence a uma única origem (1:N)'],
        cardinality: {
          participants: [
            { entity: 'origem', cardinality: '1' },
            { entity: 'destino', cardinality: 'N' },
          ],
        },
      },
    ],
  });

  if (!('relationships' in result)) {
    throw new Error('O modelo conceitual deveria conter relacionamentos.');
  }

  expect(result.relationships[0].participants).toEqual([
    { entityId: 'origem', cardinality: '1' },
    { entityId: 'destino', cardinality: 'N' },
  ]);
});

it('repara atributos colocados na entidade e preserva cardinalidade e dado da associação', async () => {
  const description = [
    'Cada origem possui nome. Cada destino possui nome.',
    'Origens participam de destinos.',
    'Para cada participação de uma origem em um destino, registre a data do vínculo.',
  ].join(' ');
  const invalid = model('data_vinculo', '1', 'N');
  invalid.metadata = { generatedBy: 'ollama', sourceText: description };
  invalid.entities[0].attributes.push(
    {
      id: 'destino',
      name: 'destino',
      type: 'string',
      identifier: false,
      required: false,
      unique: false,
      multivalued: false,
      composite: false,
      derived: false,
      components: [],
    },
    {
      id: 'data_vinculo_participacao',
      name: 'data_vinculo_participacao',
      type: 'date',
      identifier: false,
      required: false,
      unique: false,
      multivalued: false,
      composite: false,
      derived: false,
      components: [],
    },
  );
  const corrected = model('data_vinculo', '1', 'N');
  corrected.metadata = { generatedBy: 'ollama', sourceText: description };
  const fixConceptualModel = vi.fn(
    async ({
      invalidModel,
      validationError,
    }: {
      invalidModel: ConceptualModel;
      validationError: { misplacedEntityAttributes: Array<{ reason: string }> };
    }) => {
      expect(invalidModel.entities[0].attributes.map(({ name }) => name)).toEqual(
        expect.arrayContaining(['data_vinculo_participacao']),
      );
      expect(invalidModel.entities[0].attributes.some(({ name }) => name === 'destino')).toBe(false);
      expect(validationError.misplacedEntityAttributes.map(({ reason }) => reason)).toEqual([
        'association-attribute-in-entity',
      ]);
      return corrected;
    },
  );
  const aiService = {
    generateConceptualModel: vi.fn(async () => invalid),
    fixConceptualModel,
  } as unknown as AiService;
  const service = new DiagramsService(aiService, {} as never, {} as never, {} as never);

  const result = await service.generate({
    description,
    mode: 'conceptual',
    clarifications: [
      {
        questionId: 'origem_destino',
        answers: ['Cada origem pertence a um destino, e um destino pode possuir várias origens (N:1)'],
        cardinality: {
          participants: [
            { entity: 'origem', cardinality: 'N' },
            { entity: 'destino', cardinality: '1' },
          ],
        },
      },
    ],
  });

  if (!('relationships' in result)) throw new Error('O modelo conceitual deveria conter relacionamentos.');
  expect(fixConceptualModel).toHaveBeenCalledTimes(1);
  expect(
    result.entities[0].attributes.some(({ name }) => name === 'destino' || name === 'data_vinculo_participacao'),
  ).toBe(false);
  expect(result.relationships[0].attributes.some(({ name }) => name === 'data_vinculo')).toBe(true);
  expect(result.relationships[0].participants).toEqual([
    { entityId: 'origem', cardinality: 'N' },
    { entityId: 'destino', cardinality: '1' },
  ]);
});

it('normaliza a flag composta sem inventar componentes antes da validação final', async () => {
  const invalidCompositeModel = model('data_associacao');
  invalidCompositeModel.entities[0].attributes[1] = {
    ...invalidCompositeModel.entities[0].attributes[1],
    composite: true,
    components: [],
  };
  const fixConceptualModel = vi.fn();
  const aiService = {
    generateConceptualModel: vi.fn(async () => invalidCompositeModel),
    fixConceptualModel,
  } as unknown as AiService;

  const service = new DiagramsService(aiService, {} as never, {} as never, {} as never);
  const result = await service.generate({ description: 'Descrição de teste.', mode: 'conceptual' });

  if (!('entities' in result)) throw new Error('O modelo conceitual deveria conter entidades.');
  expect(result.entities[0].attributes[1]).toMatchObject({ composite: false, components: [] });
  expect(fixConceptualModel).not.toHaveBeenCalled();
});

it('trata uma falha da análise de ambiguidades como ausência de perguntas', async () => {
  const aiService = {
    analyzeAmbiguities: vi.fn(async () => {
      throw new Error('JSON inválido retornado pelo Ollama');
    }),
  } as unknown as AiService;
  const service = new DiagramsService(aiService, {} as never, {} as never, {} as never);

  await expect(service.analyzeAmbiguities({ description: 'Um A se relaciona com B.' })).resolves.toEqual({
    requiresClarification: false,
    questions: [],
  });
});

it('repara a omissão de um relacionamento explícito sem remover relações já geradas', async () => {
  const base: ConceptualModel = {
    metadata: {},
    standaloneAttributes: [],
    ambiguities: [],
    entities: [
      { id: 'usuario', name: 'usuario', attributes: [] },
      { id: 'emprestimo', name: 'emprestimo', attributes: [] },
      { id: 'livro', name: 'livro', attributes: [] },
    ],
    relationships: [
      {
        id: 'inclui',
        name: 'inclui',
        kind: 'relationship',
        type: 'N:N',
        participants: [
          { entityId: 'emprestimo', cardinality: 'N' },
          { entityId: 'livro', cardinality: 'N' },
        ],
        attributes: [
          {
            id: 'data_devolucao',
            name: 'data_devolucao',
            type: 'date',
            identifier: false,
            required: false,
            unique: false,
            multivalued: false,
            composite: false,
            derived: false,
            components: [],
          },
        ],
        subtypeIds: [],
        subtypeHandles: {},
      },
    ],
  };
  const repaired: ConceptualModel = {
    ...base,
    relationships: [
      ...base.relationships,
      {
        id: 'realiza',
        name: 'realiza',
        kind: 'relationship',
        type: '1:N',
        participants: [
          { entityId: 'usuario', cardinality: '1' },
          { entityId: 'emprestimo', cardinality: 'N' },
        ],
        attributes: [],
        subtypeIds: [],
        subtypeHandles: {},
      },
    ],
  };
  const fixConceptualModel = vi.fn(async ({ validationError }: { validationError: unknown }) => {
    expect(validationError).toMatchObject({
      missingExplicitRelationships: [expect.objectContaining({ participants: ['usuario', 'emprestimo'] })],
    });
    return repaired;
  });
  const aiService = {
    generateConceptualModel: vi.fn(async () => base),
    fixConceptualModel,
  } as unknown as AiService;
  const service = new DiagramsService(aiService, {} as never, {} as never, {} as never);

  const result = (await service.generate({
    description:
      'Um usuário pode realizar vários empréstimos, mas cada empréstimo pertence a apenas um usuário. Um empréstimo pode incluir vários livros, e um livro pode constar em vários empréstimos. Para cada empréstimo de um livro, registre a data de devolução.',
    mode: 'conceptual',
    clarifications: [
      {
        questionId: 'cardinalidade_emprestimo_livro',
        kind: 'cardinality',
        answers: ['Um empréstimo pode incluir vários livros, e um livro pode constar em vários empréstimos (N:N)'],
        cardinality: {
          participants: [
            { entity: 'emprestimo', cardinality: 'N' },
            { entity: 'livro', cardinality: 'N' },
          ],
        },
      },
    ],
  })) as ConceptualModel;

  expect(fixConceptualModel).toHaveBeenCalledTimes(1);
  expect(result.relationships).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: 'realiza' }),
      expect.objectContaining({ name: 'inclui', attributes: [expect.objectContaining({ name: 'data_devolucao' })] }),
    ]),
  );
});

it('devolve erros estruturados e específicos antes de converter um modelo conceitual inválido', () => {
  const invalidModel = model('data_associacao');
  invalidModel.entities.push({ ...invalidModel.entities[0], id: 'origem_duplicada', name: ' origem ' });
  const service = new DiagramsService({} as AiService, {} as never, {} as never, {} as never);

  try {
    service.convertToLogical(invalidModel);
    throw new Error('A conversão deveria falhar.');
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    const response = (error as BadRequestException).getResponse() as {
      code: string;
      message: string;
      issues: Array<{ code: string; message: string }>;
    };
    expect(response.code).toBe('CONCEPTUAL_MODEL_CONVERSION_INVALID');
    expect(response.message).toMatch(/corrija os problemas/i);
    expect(response.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'entity-name-duplicate' })]),
    );
  }
});

it('repara a resposta lógica inválida antes de devolver o modelo normalizado', async () => {
  const invalidModel = {
    tables: [],
    oneToMany: [],
    oneToOne: [],
    manyToMany: [],
    constraints: { unique: [], notNull: [] },
  };
  const correctedModel = {
    tables: [
      {
        name: 'cliente',
        columns: [{ name: 'id_cliente', type: 'uuid', primaryKey: true }],
      },
    ],
    oneToMany: [],
    oneToOne: [],
    manyToMany: [],
    constraints: { unique: [], notNull: [] },
  };
  const fixLogicalModel = vi.fn(async (params: { invalidModel: unknown; validationError: unknown }) => {
    expect(params.invalidModel).toBe(invalidModel);
    expect(params.validationError && typeof params.validationError === 'object').toBe(true);
    expect(String((params.validationError as { message?: string }).message)).toMatch(/modelo lógico/i);
    return correctedModel;
  });
  const aiService = {
    generateLogicalModel: vi.fn(async () => invalidModel),
    fixLogicalModel,
  } as unknown as AiService;

  const service = new DiagramsService(aiService, {} as never, {} as never, {} as never);
  const result = await service.generate({ description: 'Cada cliente possui um cadastro.', mode: 'logical' });

  expect(fixLogicalModel).toHaveBeenCalledTimes(1);
  if (!('tables' in result)) {
    throw new Error('O modelo corrigido deveria conter tabelas.');
  }
  expect(result.tables[0].name).toBe('cliente');
});

it('impõe N:1 por entidade, repara atributo alocado à relação errada e propaga a FK ao SQL', async () => {
  const identifier = (name: string) => ({
    id: `id_${name}`,
    name: `id_${name}`,
    type: 'uuid' as const,
    identifier: true,
    required: true,
    unique: true,
    multivalued: false,
    composite: false,
    derived: false,
    components: [],
  });
  const dateAttribute = {
    id: 'data_registro',
    name: 'data_registro',
    type: 'date' as const,
    identifier: false,
    required: false,
    unique: false,
    multivalued: false,
    composite: false,
    derived: false,
    components: [],
  };
  const description =
    'Uma origem pertence a um destino, e um destino possui várias origens. Origens participam de contextos. Para cada participação de uma origem em um contexto, registre a data da participação.';
  const generated: ConceptualModel = {
    metadata: { generatedBy: 'ollama', sourceText: description },
    entities: ['origem', 'destino', 'contexto'].map((name) => ({ id: name, name, attributes: [identifier(name)] })),
    standaloneAttributes: [],
    ambiguities: [],
    relationships: [
      {
        id: 'pertence',
        name: 'pertence',
        kind: 'relationship',
        type: '1:N',
        participants: [
          { entityId: 'origem', cardinality: '1' },
          { entityId: 'destino', cardinality: 'N' },
        ],
        attributes: [dateAttribute],
        subtypeIds: [],
        subtypeHandles: {},
      },
      {
        id: 'participa',
        name: 'participa',
        kind: 'relationship',
        type: 'N:N',
        participants: [
          { entityId: 'origem', cardinality: 'N' },
          { entityId: 'contexto', cardinality: 'N' },
        ],
        attributes: [dateAttribute],
        subtypeIds: [],
        subtypeHandles: {},
      },
    ],
  };
  const repaired: ConceptualModel = {
    ...generated,
    relationships: [{ ...generated.relationships[0], attributes: [] }, generated.relationships[1]],
  };
  const fixConceptualModel = vi.fn(async ({ validationError }: { validationError: unknown }) => {
    expect(validationError).toMatchObject({
      unsupportedRelationshipAttributes: [{ relationship: 'pertence', attribute: 'data_registro' }],
    });
    return repaired;
  });
  const aiService = {
    generateConceptualModel: vi.fn(async () => generated),
    fixConceptualModel,
  } as unknown as AiService;
  const service = new DiagramsService(aiService, {} as never, {} as never, {} as never);
  const result = (await service.generate({
    description,
    mode: 'conceptual',
    clarifications: [
      {
        questionId: 'origem_destino',
        kind: 'cardinality',
        answers: ['Cada origem pertence a um destino, e um destino possui várias origens (N:1)'],
        cardinality: {
          participants: [
            { entity: 'origem', cardinality: 'N' },
            { entity: 'destino', cardinality: '1' },
          ],
        },
      },
    ],
  })) as ConceptualModel;

  expect(fixConceptualModel).toHaveBeenCalledTimes(1);
  expect(result.relationships[0].participants).toEqual([
    { entityId: 'origem', cardinality: 'N' },
    { entityId: 'destino', cardinality: '1' },
  ]);
  expect(result.relationships[0].attributes).toEqual([]);
  expect(result.relationships[1].attributes).toEqual([dateAttribute]);

  const logical = new LogicalModelConverterService().convert(result);
  expect(logical.tables.find((table) => table.id === 'origem')?.columns).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'id_destino',
        foreignKey: true,
        references: { tableId: 'destino', columnId: 'id_destino' },
      }),
    ]),
  );
  expect(logical.tables.find((table) => table.id === 'destino')?.columns.some((column) => column.foreignKey)).toBe(
    false,
  );
  expect(
    logical.tables.find((table) => table.id === 'participa')?.columns.filter((column) => column.primaryKey),
  ).toHaveLength(2);
  const sql = new SqlGeneratorService().generate(logical, 'postgresql');
  expect(sql).toContain('ALTER TABLE origem');
  expect(sql).toContain('FOREIGN KEY (id_destino)');
  expect(sql).toContain('REFERENCES destino (id_destino)');
  expect(sql.match(/CREATE TABLE destino \(([\s\S]*?)\);/)?.[1]).not.toContain('id_origem');

  const reversed: ConceptualModel = {
    ...result,
    relationships: [
      {
        ...result.relationships[0],
        participants: [
          { entityId: 'origem', cardinality: '1' },
          { entityId: 'destino', cardinality: 'N' },
        ],
      },
      result.relationships[1],
    ],
  };
  const reversedLogical = new LogicalModelConverterService().convert(reversed);
  expect(reversedLogical.tables.find((table) => table.id === 'destino')?.columns).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'id_origem',
        foreignKey: true,
        references: { tableId: 'origem', columnId: 'id_origem' },
      }),
    ]),
  );
});
