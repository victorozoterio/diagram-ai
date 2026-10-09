import { describe, expect, it } from 'vitest';

import type { ConceptualModel } from '../schemas/conceptual-model.schema';
import { LogicalModelConverterService } from './logical-model-converter.service';

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
});
