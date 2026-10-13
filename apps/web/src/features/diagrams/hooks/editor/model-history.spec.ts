import { describe, expect, it } from 'vitest';
import { createModelHistory, recordModelHistory, redoModelHistory, undoModelHistory } from './model-history';

const hasChanged = <T>(previous: T, next: T) => JSON.stringify(previous) !== JSON.stringify(next);

describe('histórico de modelos', () => {
  it('mantém históricos independentes para os modelos conceitual e lógico', () => {
    const conceptual = createModelHistory<{ entities: string[] }>();
    const logical = createModelHistory<{ tables: string[] }>();

    recordModelHistory(conceptual, { entities: [] }, hasChanged);
    recordModelHistory(logical, { tables: [] }, hasChanged);
    recordModelHistory(conceptual, { entities: ['cliente'] }, hasChanged);
    recordModelHistory(logical, { tables: ['pedido'] }, hasChanged);

    expect(undoModelHistory(logical)).toEqual({ tables: [] });
    expect(undoModelHistory(conceptual)).toEqual({ entities: [] });
    expect(redoModelHistory(logical)).toEqual({ tables: ['pedido'] });
    expect(redoModelHistory(conceptual)).toEqual({ entities: ['cliente'] });
  });

  it('invalida o redo após uma nova alteração', () => {
    const history = createModelHistory<{ tables: string[] }>();

    recordModelHistory(history, { tables: [] }, hasChanged);
    recordModelHistory(history, { tables: ['cliente'] }, hasChanged);
    expect(undoModelHistory(history)).toEqual({ tables: [] });

    recordModelHistory(history, { tables: ['pedido'] }, hasChanged);

    expect(history.redo).toEqual([]);
    expect(redoModelHistory(history)).toBeUndefined();
  });

  it('restaura edições de tabelas e colunas do modelo lógico', () => {
    const history = createModelHistory<{
      tables: { id: string; name: string; columns: { id: string; name: string }[] }[];
    }>();
    const initial = { tables: [{ id: 'pedido', name: 'pedido', columns: [{ id: 'valor', name: 'valor' }] }] };
    const renamed = {
      tables: [{ id: 'pedido', name: 'emprestimo', columns: [{ id: 'valor', name: 'valor_total' }] }],
    };

    recordModelHistory(history, initial, hasChanged);
    recordModelHistory(history, renamed, hasChanged);

    expect(undoModelHistory(history)).toEqual(initial);
    expect(redoModelHistory(history)).toEqual(renamed);
  });
});
