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

  it('centraliza um atributo independente no cursor usando sua medida visual original', () => {
    const copied = copyConceptualSelection(conceptualModel, visual, [
      { id: 'leitor:cpf', position: { x: 90, y: 120 }, size: { width: 120, height: 60 } },
    ]);
    if (!copied) throw new Error('O atributo deveria ser copiado.');

    const pasted = pasteConceptualSelection(conceptualModel, copied, visual, { x: 500, y: 400 });
    const attributeId = pasted.model.standaloneAttributes?.[0]?.id;
    if (!attributeId) throw new Error('O atributo colado deveria existir.');

    expect(pasted.visual.elementPositions[`standalone:${attributeId}`]).toEqual({ x: 440, y: 370 });
  });

  it('centraliza entidades e relacionamentos no cursor sem offsets por tipo', () => {
    const copied = copyConceptualSelection(conceptualModel, visual, [
      { id: 'leitor', position: { x: 10, y: 20 }, size: { width: 180, height: 90 } },
      { id: 'relationship:empresta', position: { x: 170, y: 80 }, size: { width: 100, height: 100 } },
    ]);
    if (!copied) throw new Error('Os componentes deveriam ser copiados.');

    const pasted = pasteConceptualSelection(conceptualModel, copied, visual, { x: 600, y: 400 });
    const entity = pasted.model.entities.at(-1);
    const relationship = pasted.model.relationships.at(-1);
    if (!entity || !relationship) throw new Error('Os componentes colados deveriam existir.');

    const entityPosition = pasted.visual.entityPositions[entity.id];
    const relationshipPosition = pasted.visual.elementPositions[`relationship:${relationship.id}`];
    const left = Math.min(entityPosition.x, relationshipPosition.x);
    const right = Math.max(entityPosition.x + 180, relationshipPosition.x + 100);
    const top = Math.min(entityPosition.y, relationshipPosition.y);
    const bottom = Math.max(entityPosition.y + 90, relationshipPosition.y + 100);

    expect((left + right) / 2).toBe(600);
    expect((top + bottom) / 2).toBe(400);
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

  it('posiciona o centro de uma seleção conceitual múltipla na âncora de colagem', () => {
    const copied = copyConceptualSelection(conceptualModel, visual, ['leitor', 'livro', 'relationship:empresta']);
    if (!copied) throw new Error('A seleção conceitual deveria ser copiada.');
    const pasted = pasteConceptualSelection(conceptualModel, copied, visual, { x: 600, y: 400 });
    const positions = [
      ...pasted.model.entities.slice(-2).map((entity) => pasted.visual.entityPositions[entity.id]),
      pasted.visual.elementPositions[`relationship:${pasted.model.relationships.at(-1)?.id}`],
      pasted.visual.elementPositions[
        `${pasted.model.entities.at(-2)?.id}:${pasted.model.entities.at(-2)?.attributes[0]?.id}`
      ],
    ];

    expect(
      (Math.min(...positions.map((position) => position.x)) + Math.max(...positions.map((position) => position.x))) / 2,
    ).toBe(600);
    expect(
      (Math.min(...positions.map((position) => position.y)) + Math.max(...positions.map((position) => position.y))) / 2,
    ).toBe(400);
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

  it('posiciona o centro do conjunto lógico na âncora atual do canvas', () => {
    const logical: LogicalModel = {
      tables: [
        { id: 'a', name: 'a', columns: [], position: { x: 10, y: 10 }, size: { width: 280, height: 130 } },
        { id: 'b', name: 'b', columns: [], position: { x: 300, y: 10 }, size: { width: 280, height: 130 } },
      ],
    };
    const copied = copyLogicalSelection(logical, ['a', 'b']);
    if (!copied) throw new Error('As tabelas deveriam ser copiadas.');
    const pasted = pasteLogicalSelection(logical, copied, { x: 700, y: 500 });
    const tables = pasted.model.tables.slice(-2);
    const left = Math.min(...tables.map((table) => table.position?.x ?? 0));
    const right = Math.max(...tables.map((table) => (table.position?.x ?? 0) + (table.size?.width ?? 280)));
    const top = Math.min(...tables.map((table) => table.position?.y ?? 0));
    const bottom = Math.max(...tables.map((table) => (table.position?.y ?? 0) + (table.size?.height ?? 130)));

    expect((left + right) / 2).toBe(700);
    expect((top + bottom) / 2).toBe(500);
  });

  it('usa as medidas reais das tabelas para centralizar a colagem lógica', () => {
    const logical: LogicalModel = {
      tables: [{ id: 'a', name: 'a', columns: [], position: { x: 20, y: 40 }, size: { width: 280, height: 130 } }],
    };
    const copied = copyLogicalSelection(logical, [
      { id: 'a', position: { x: 20, y: 40 }, size: { width: 400, height: 200 } },
    ]);
    if (!copied) throw new Error('A tabela deveria ser copiada.');

    const pasted = pasteLogicalSelection(logical, copied, { x: 700, y: 500 });
    expect(pasted.model.tables.at(-1)?.position).toEqual({ x: 500, y: 400 });
  });
});
