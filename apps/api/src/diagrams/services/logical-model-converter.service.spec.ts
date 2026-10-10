import { describe, expect, it } from 'vitest';

import type { ConceptualModel } from '../schemas/conceptual-model.schema';
import { LogicalModelConverterService } from './logical-model-converter.service';
import { SqlGeneratorService } from './sql-generator.service';

function attribute(name: string, identifier = false) {
  return {
    id: name,
    name,
    type: identifier ? ('uuid' as const) : ('string' as const),
    identifier,
    required: identifier,
    unique: identifier,
    multivalued: false,
    composite: false,
    derived: false,
    components: [],
  };
}

function conceptualModel(): ConceptualModel {
  return {
    metadata: {},
    standaloneAttributes: [],
    ambiguities: [],
    entities: [
      { id: 'aluno', name: 'Aluno', attributes: [attribute('nome')] },
      { id: 'curso', name: 'Curso', attributes: [attribute('codigo_curso', true)] },
    ],
    relationships: [
      {
        id: 'matricula',
        name: 'matricula',
        type: '1:N',
        kind: 'relationship',
        participants: [
          { entityId: 'curso', cardinality: '1' },
          { entityId: 'aluno', cardinality: 'N' },
        ],
        attributes: [],
        subtypeIds: [],
        subtypeHandles: {},
      },
    ],
  };
}

describe('LogicalModelConverterService', () => {
  it('cria PK técnica automaticamente sem modificar o modelo conceitual', () => {
    const model = conceptualModel();
    const logical = new LogicalModelConverterService().convert(model);
    const aluno = logical.tables.find((table) => table.id === 'aluno');

    expect(aluno?.columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'id_aluno', primaryKey: true, type: 'uuid', required: true }),
        expect.objectContaining({
          name: 'id_curso',
          foreignKey: true,
          references: { tableId: 'curso', columnId: 'codigo_curso' },
        }),
      ]),
    );
    expect(model.entities[0].attributes.some((item) => item.name === 'id_aluno')).toBe(false);
  });

  it('preserva identificadores existentes e não cria PK redundante', () => {
    const logical = new LogicalModelConverterService().convert(conceptualModel());
    const curso = logical.tables.find((table) => table.id === 'curso');

    expect(curso?.columns.filter((column) => column.primaryKey)).toEqual([
      expect.objectContaining({ name: 'codigo_curso', primaryKey: true }),
    ]);
    expect(curso?.columns.some((column) => column.name === 'id_curso')).toBe(false);
  });

  it('promove uma coluna com o nome técnico gerado sem duplicá-la', () => {
    const model = conceptualModel();
    model.entities[0].attributes.push(attribute('id_aluno'));

    const logical = new LogicalModelConverterService().convert(model);
    const aluno = logical.tables.find((table) => table.id === 'aluno');

    expect(aluno?.columns.filter((column) => column.name === 'id_aluno')).toHaveLength(1);
    expect(aluno?.columns.find((column) => column.name === 'id_aluno')).toMatchObject({ primaryKey: true });
  });

  it('preserva as relações de um cenário com múltiplas associações na conversão e no SQL', () => {
    const entities = ['funcionario', 'departamento', 'projeto', 'cliente'].map((name) => ({
      id: name,
      name,
      attributes: [],
    }));
    const complete: ConceptualModel = {
      metadata: {},
      standaloneAttributes: [],
      ambiguities: [],
      entities,
      relationships: [
        {
          id: 'trabalha_em',
          name: 'trabalha_em',
          kind: 'relationship',
          type: '1:N',
          participants: [
            { entityId: 'departamento', cardinality: '1' },
            { entityId: 'funcionario', cardinality: 'N' },
          ],
          attributes: [],
          subtypeIds: [],
          subtypeHandles: {},
        },
        {
          id: 'participa_de',
          name: 'participa_de',
          kind: 'relationship',
          type: 'N:N',
          participants: [
            { entityId: 'funcionario', cardinality: 'N' },
            { entityId: 'projeto', cardinality: 'N' },
          ],
          attributes: [attribute('data_inicio_participacao')],
          subtypeIds: [],
          subtypeHandles: {},
        },
        {
          id: 'pertence_a',
          name: 'pertence_a',
          kind: 'relationship',
          type: 'N:N',
          participants: [
            { entityId: 'projeto', cardinality: 'N' },
            { entityId: 'departamento', cardinality: 'N' },
          ],
          attributes: [],
          subtypeIds: [],
          subtypeHandles: {},
        },
        {
          id: 'solicita',
          name: 'solicita',
          kind: 'relationship',
          type: '1:N',
          participants: [
            { entityId: 'cliente', cardinality: '1' },
            { entityId: 'projeto', cardinality: 'N' },
          ],
          attributes: [],
          subtypeIds: [],
          subtypeHandles: {},
        },
      ],
    };

    const logical = new LogicalModelConverterService().convert(complete);

    expect(logical.tables.find((table) => table.id === 'funcionario')?.columns).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'id_departamento', foreignKey: true })]),
    );
    expect(logical.tables.find((table) => table.id === 'projeto')?.columns).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'id_cliente', foreignKey: true })]),
    );
    expect(logical.tables.find((table) => table.id === 'participa_de')?.columns).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'data_inicio_participacao' })]),
    );
    expect(
      logical.tables.find((table) => table.id === 'pertence_a')?.columns.filter((column) => column.primaryKey),
    ).toHaveLength(2);

    const sql = new SqlGeneratorService().generate(logical, 'postgresql');
    expect(sql).toContain('CREATE TABLE funcionario_projeto');
    expect(sql).toContain('CREATE TABLE projeto_departamento');
    expect(sql).toContain('FOREIGN KEY (id_departamento)');
    expect(sql).toContain('FOREIGN KEY (id_cliente)');
  });

  it('mantém 1:N como FK no lado N e N:N como tabela associativa no cenário de biblioteca', () => {
    const library: ConceptualModel = {
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
          id: 'realiza_emprestimo',
          name: 'realiza_emprestimo',
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
        {
          id: 'inclui_livro',
          name: 'inclui_livro',
          kind: 'relationship',
          type: 'N:N',
          participants: [
            { entityId: 'emprestimo', cardinality: 'N' },
            { entityId: 'livro', cardinality: 'N' },
          ],
          attributes: [attribute('data_devolucao')],
          subtypeIds: [],
          subtypeHandles: {},
        },
      ],
    };

    const logical = new LogicalModelConverterService().convert(library);
    const emprestimo = logical.tables.find((table) => table.id === 'emprestimo');

    expect(emprestimo?.columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'id_usuario',
          foreignKey: true,
          references: expect.objectContaining({ tableId: 'usuario' }),
        }),
      ]),
    );
    expect(logical.tables.some((table) => table.id === 'realiza_emprestimo')).toBe(false);
    expect(logical.tables.find((table) => table.id === 'inclui_livro')?.columns).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'data_devolucao' })]),
    );

    const sql = new SqlGeneratorService().generate(logical, 'postgresql');
    expect(sql).toContain('ALTER TABLE emprestimo');
    expect(sql).toContain('FOREIGN KEY (id_usuario)');
    expect(sql).toContain('REFERENCES usuario (id_usuario)');
  });
});
