import { describe, expect, it } from 'vitest';
import type { ConceptualModel, LogicalModel } from '../../types';
import {
  copyConceptualSelection,
  copyLogicalSelection,
  pasteConceptualSelection,
  pasteLogicalSelection,
} from './model-clipboard';
import { createModelHistory, recordModelHistory, redoModelHistory, undoModelHistory } from './model-history';

const visual = {
  entityPositions: { leitor: { x: 10, y: 20 }, livro: { x: 300, y: 20 }, 'relationship:empresta': { x: 170, y: 80 } },
  elementPositions: { 'leitor:cpf': { x: 90, y: 120 } },
  nodeSizes: {},
};

const conceptualModel: ConceptualModel = {
  metadata: {},
  entities: [
    {
      id: 'leitor',
      name: 'leitor',
      attributes: [
        {
          id: 'cpf',
          name: 'cpf',
          type: 'string',
          identifier: false,
          required: false,
          unique: false,
          multivalued: false,
          composite: false,
          derived: false,
          components: [],
        },
      ],
    },
    { id: 'livro', name: 'livro', attributes: [] },
  ],
  standaloneAttributes: [],
  relationships: [
    {
      id: 'empresta',
      name: 'empresta',
      type: '1:N',
      kind: 'relationship',
      participants: [
        { entityId: 'leitor', cardinality: '1' },
        { entityId: 'livro', cardinality: 'N' },
      ],
      attributes: [
        {
          id: 'data',
          name: 'data_emprestimo',
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
    },
  ],
  ambiguities: [],
};

describe('área de transferência do editor', () => {
  it('copia elementos conceituais conectados com ids novos e conexões internas remapeadas', () => {
    const copied = copyConceptualSelection(conceptualModel, visual, ['leitor', 'livro', 'relationship:empresta']);
    expect(copied).not.toBeNull();
    if (!copied) throw new Error('A seleção conceitual deveria ser copiada.');
    const pasted = pasteConceptualSelection(conceptualModel, copied, visual);
    const relationship = pasted.model.relationships.at(-1);
    if (!relationship) throw new Error('O relacionamento copiado deveria existir.');

    expect(pasted.model.entities).toHaveLength(4);
    expect(relationship.id).not.toBe('empresta');
    expect(relationship.participants.map((participant) => participant.entityId)).not.toContain('leitor');
    expect(relationship.participants.map((participant) => participant.entityId)).not.toContain('livro');
    expect(relationship.participants.map((participant) => participant.cardinality)).toEqual(['1', 'N']);
    expect(relationship.attributes.map((attribute) => attribute.name)).toEqual(['data_emprestimo']);
  });

  it('copia atributo individual como atributo independente sem conexão com a entidade original', () => {
    const copied = copyConceptualSelection(conceptualModel, visual, ['leitor:cpf']);
    expect(copied).not.toBeNull();
    if (!copied) throw new Error('O atributo deveria ser copiado.');
    const pasted = pasteConceptualSelection(conceptualModel, copied, visual);

    expect(pasted.model.entities).toHaveLength(2);
    expect(pasted.model.standaloneAttributes).toHaveLength(1);
    expect(pasted.model.standaloneAttributes?.[0]).toMatchObject({ name: 'cpf', parentAttributeId: undefined });
  });

  it('não preserva participantes externos à seleção', () => {
    const copied = copyConceptualSelection(conceptualModel, visual, ['leitor', 'relationship:empresta']);
    expect(copied).not.toBeNull();
    if (!copied) throw new Error('A seleção conceitual deveria ser copiada.');
    const pasted = pasteConceptualSelection(conceptualModel, copied, visual);
    const relationship = pasted.model.relationships.at(-1);
    if (!relationship) throw new Error('O relacionamento copiado deveria existir.');

    expect(relationship.participants).toHaveLength(1);
    expect(relationship.participants[0].entityId).not.toBe('leitor');
  });

  it('trata uma colagem como uma única alteração reversível no histórico', () => {
    const copied = copyConceptualSelection(conceptualModel, visual, ['leitor']);
    if (!copied) throw new Error('A entidade deveria ser copiada.');
    const pasted = pasteConceptualSelection(conceptualModel, copied, visual);
    const history = createModelHistory<ConceptualModel>();
    const hasChanged = (previous: ConceptualModel, next: ConceptualModel) =>
      JSON.stringify(previous) !== JSON.stringify(next);

    recordModelHistory(history, conceptualModel, hasChanged);
    recordModelHistory(history, pasted.model, hasChanged);

    expect(undoModelHistory(history)).toEqual(conceptualModel);
    expect(redoModelHistory(history)).toEqual(pasted.model);
  });

  it('remapeia FKs e conexões internas do modelo lógico, sem manter referência externa', () => {
    const logical: LogicalModel = {
      tables: [
        {
          id: 'cliente',
          name: 'cliente',
          columns: [
            {
              id: 'id_cliente',
              name: 'id_cliente',
              type: 'uuid',
              primaryKey: true,
              foreignKey: false,
              required: true,
              unique: true,
            },
          ],
          position: { x: 10, y: 10 },
        },
        {
          id: 'pedido',
          name: 'pedido',
          columns: [
            {
              id: 'cliente_id',
              name: 'cliente_id',
              type: 'uuid',
              primaryKey: false,
              foreignKey: true,
              required: true,
              unique: false,
              references: { tableId: 'cliente', columnId: 'id_cliente' },
            },
          ],
          position: { x: 300, y: 10 },
        },
      ],
      relationships: [{ id: 'r', source: 'cliente', target: 'pedido' }],
    };
    const copied = copyLogicalSelection(logical, ['cliente', 'pedido']);
    if (!copied) throw new Error('As tabelas deveriam ser copiadas.');
    const pasted = pasteLogicalSelection(logical, copied);
    const pastedPedido = pasted.model.tables.at(-1);
    if (!pastedPedido) throw new Error('A tabela copiada deveria existir.');

    expect(pasted.model.relationships).toHaveLength(2);
    expect(pastedPedido.columns[0].references?.tableId).not.toBe('cliente');
    expect(pastedPedido.columns[0].references?.columnId).not.toBe('id_cliente');

    const externalClipboard = copyLogicalSelection(logical, ['pedido']);
    if (!externalClipboard) throw new Error('A tabela deveria ser copiada.');
    const externalOnly = pasteLogicalSelection(logical, externalClipboard);
    expect(externalOnly.model.tables.at(-1)?.columns[0]).toMatchObject({ foreignKey: false, references: undefined });
  });
});
