import { describe, expect, it } from 'vitest';

import type { ConceptualModel } from '../schemas/conceptual-model.schema';
import { findMissingExplicitRelationships } from './explicit-relationship-coverage';

function model(): ConceptualModel {
  return {
    metadata: {},
    standaloneAttributes: [],
    ambiguities: [],
    entities: [
      { id: 'usuario', name: 'usuario', attributes: [] },
      { id: 'emprestimo', name: 'empréstimo', attributes: [] },
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
        attributes: [],
        subtypeIds: [],
        subtypeHandles: {},
      },
    ],
  };
}

describe('cobertura de relacionamentos explícitos', () => {
  it('detecta uma associação textual omitida sem alterar associações existentes', () => {
    const missing = findMissingExplicitRelationships(
      model(),
      'Um usuário pode realizar vários empréstimos, mas cada empréstimo pertence a apenas um usuário. Um empréstimo pode incluir vários livros, e um livro pode constar em vários empréstimos.',
    );

    expect(missing).toEqual([expect.objectContaining({ participants: ['usuario', 'empréstimo'] })]);
  });

  it('preserva múltiplos relacionamentos explícitos quando todos já estão presentes', () => {
    const complete = model();
    complete.relationships.push({
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
    });

    expect(
      findMissingExplicitRelationships(
        complete,
        'Um usuário pode realizar vários empréstimos, mas cada empréstimo pertence a apenas um usuário. Um empréstimo pode incluir vários livros, e um livro pode constar em vários empréstimos.',
      ),
    ).toEqual([]);
  });

  it('não trata listas independentes de atributos como uma associação', () => {
    const withoutRelationships: ConceptualModel = {
      ...model(),
      entities: [
        { id: 'cliente', name: 'cliente', attributes: [] },
        { id: 'pedido', name: 'pedido', attributes: [] },
      ],
      relationships: [],
    };

    expect(
      findMissingExplicitRelationships(
        withoutRelationships,
        'Cada cliente possui nome, email e telefone, e cada pedido possui data e valor total.',
      ),
    ).toEqual([]);
  });
});
