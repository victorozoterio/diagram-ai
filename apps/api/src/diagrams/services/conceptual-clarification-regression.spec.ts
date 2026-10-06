import { expect, it, vi } from 'vitest';

import type { AiService } from '../../ai/ai.service';
import type { ClarificationAnswer } from '../../ai/ambiguity-analysis.schema';
import type { ConceptualModel, Relationship } from '../schemas/conceptual-model.schema';
import { DiagramsService } from './diagrams.service';
import { LogicalModelConverterService } from './logical-model-converter.service';
import { SqlGeneratorService } from './sql-generator.service';

const description = [
  'Funcionários trabalham em departamentos.',
  'Funcionários participam de projetos.',
  'Projetos são vinculados aos departamentos.',
  'Clientes solicitam projetos.',
  'Para cada participação de um funcionário em um projeto, registrar a data em que começou.',
].join(' ');

function relation(
  id: string,
  left: string,
  right: string,
  first: '1' | 'N',
  second: '1' | 'N',
  attributes: Relationship['attributes'] = [],
): Relationship {
  return {
    id,
    name: id,
    kind: 'relationship',
    type: first === second ? (`${first}:${second}` as Relationship['type']) : '1:N',
    participants: [
      { entityId: left, cardinality: first },
      { entityId: right, cardinality: second },
    ],
    attributes,
    subtypeIds: [],
    subtypeHandles: {},
  };
}

function clarification(left: string, right: string, first: '1' | 'N', second: '1' | 'N'): ClarificationAnswer {
  return {
    questionId: `${left}_${right}`,
    kind: 'cardinality',
    answers: ['Opção escolhida.'],
    cardinality: {
      participants: [
        { entity: left, cardinality: first },
        { entity: right, cardinality: second },
      ],
    },
  };
}

it('respeita todas as escolhas, incorpora o atributo na associação e produz FKs e SQL coerentes', async () => {
  const names = ['funcionario', 'departamento', 'projeto', 'cliente'];
  const date = {
    id: 'data_inicio_participacao',
    name: 'data_inicio_participacao',
    type: 'date' as const,
    identifier: false,
    required: false,
    unique: false,
    multivalued: false,
    composite: false,
    derived: false,
    components: [],
  };
  const invalid: ConceptualModel = {
    metadata: { generatedBy: 'ollama', sourceText: description },
    entities: names.map((name) => ({
      id: name,
      name,
      attributes: [
        {
          id: `id_${name}`,
          name: `id_${name}`,
          type: 'uuid',
          identifier: true,
          required: true,
          unique: true,
          multivalued: false,
          composite: false,
          derived: false,
          components: [],
        },
      ],
    })),
    standaloneAttributes: [],
    ambiguities: [],
    relationships: [
      relation('trabalha_em', 'funcionario', 'departamento', '1', 'N'),
      relation('participa_de', 'funcionario', 'projeto', 'N', 'N'),
      relation('data_participacao', 'funcionario', 'projeto', '1', '1', [date]),
      relation('pertence_a', 'projeto', 'departamento', '1', 'N'),
      relation('solicita', 'cliente', 'projeto', 'N', '1'),
    ],
  };
  invalid.entities.push({
    id: 'solicitacao',
    name: 'solicitacao',
    attributes: [
      {
        id: 'id_solicitacao',
        name: 'id_solicitacao',
        type: 'uuid',
        identifier: true,
        required: true,
        unique: true,
        multivalued: false,
        composite: false,
        derived: false,
        components: [],
      },
      { ...date, id: 'cliente', name: 'cliente', type: 'string' },
      { ...date, id: 'projeto', name: 'projeto', type: 'string' },
    ],
  });
  invalid.relationships
    .find(({ id }) => id === 'participa_de')
    ?.attributes.push(
      { ...date, id: 'participacao_projeto', name: 'participacao_projeto', type: 'string' },
      { ...date, id: 'participacao_funcionario', name: 'participacao_funcionario', type: 'string' },
      date,
    );
  const clarifications = [
    clarification('funcionario', 'departamento', 'N', '1'),
    clarification('funcionario', 'projeto', 'N', 'N'),
    clarification('projeto', 'departamento', 'N', 'N'),
    clarification('cliente', 'projeto', '1', 'N'),
  ];
  const service = new DiagramsService(
    { generateConceptualModel: vi.fn(async () => invalid) } as unknown as AiService,
    {} as never,
    {} as never,
    {} as never,
  );
  const conceptual = (await service.generate({ description, mode: 'conceptual', clarifications })) as ConceptualModel;

  expect(conceptual.relationships).toHaveLength(4);
  expect(conceptual.entities.map(({ name }) => name)).toEqual(names);
  expect(conceptual.entities.some(({ name }) => name === 'solicitacao')).toBe(false);
  expect(conceptual.relationships.find(({ id }) => id === 'data_participacao')).toBeUndefined();
  expect(conceptual.relationships.find(({ id }) => id === 'participa_de')?.attributes).toEqual([date]);
  for (const clarification of clarifications) {
    const constraint = clarification.cardinality?.participants;
    if (!constraint) throw new Error('Teste sem constraint');
    const relationship = conceptual.relationships.find((candidate) =>
      constraint.every(({ entity }) => candidate.participants.some(({ entityId }) => entityId === entity)),
    );
    for (const { entity, cardinality } of constraint) {
      expect(relationship?.participants.find(({ entityId }) => entityId === entity)?.cardinality).toBe(cardinality);
    }
  }

  const logical = new LogicalModelConverterService().convert(conceptual);
  const columns = (table: string) => logical.tables.find(({ name }) => name === table)?.columns ?? [];
  expect(columns('funcionario')).toEqual(
    expect.arrayContaining([expect.objectContaining({ name: 'id_departamento', foreignKey: true })]),
  );
  expect(columns('departamento').some(({ name }) => name === 'id_funcionario')).toBe(false);
  expect(columns('projeto')).toEqual(
    expect.arrayContaining([expect.objectContaining({ name: 'id_cliente', foreignKey: true })]),
  );
  expect(columns('projeto').some(({ name }) => name === 'id_funcionario')).toBe(false);
  expect(columns('funcionario_projeto')).toEqual(
    expect.arrayContaining([expect.objectContaining({ name: 'data_inicio_participacao' })]),
  );
  expect(columns('funcionario_projeto').filter(({ foreignKey, primaryKey }) => foreignKey && primaryKey)).toHaveLength(
    2,
  );
  expect(columns('projeto_departamento').filter(({ foreignKey, primaryKey }) => foreignKey && primaryKey)).toHaveLength(
    2,
  );

  const sql = new SqlGeneratorService().generate(logical, 'postgresql');
  expect(sql).toContain('CREATE TABLE funcionario_projeto');
  expect(sql).toContain('data_inicio_participacao DATE');
  expect(sql).toContain('FOREIGN KEY (id_departamento)');
  expect(sql).toContain('REFERENCES departamento (id_departamento)');
  expect(sql).not.toContain('fk_departamento_id_funcionario');
});
