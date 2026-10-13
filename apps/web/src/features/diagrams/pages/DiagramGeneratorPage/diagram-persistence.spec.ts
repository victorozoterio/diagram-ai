import { describe, expect, it, vi } from 'vitest';
import { createDiagramPersistenceCoordinator } from './diagram-persistence';

describe('persistência do projeto aberto', () => {
  it('compartilha a criação inicial e atualiza o mesmo registro em salvamentos concorrentes', async () => {
    let resolveCreation: ((diagram: { id: string; name: string }) => void) | undefined;
    const create = vi.fn(
      () =>
        new Promise<{ id: string; name: string }>((resolve) => {
          resolveCreation = resolve;
        }),
    );
    const update = vi.fn(async (id: string, name: string) => ({ id, name }));
    const coordinator = createDiagramPersistenceCoordinator({ create, update });

    const manualSave = coordinator.persist({ name: 'Diagrama 1', document: { source: 'manual' } });
    const generatedSave = coordinator.persist({ name: 'Diagrama 1', document: { source: 'ia' } });

    expect(create).toHaveBeenCalledTimes(1);
    resolveCreation?.({ id: 'diagram-1', name: 'Diagrama 1' });

    await expect(manualSave).resolves.toEqual({ id: 'diagram-1', name: 'Diagrama 1' });
    await expect(generatedSave).resolves.toEqual({ id: 'diagram-1', name: 'Diagrama 1' });
    expect(update).toHaveBeenCalledWith('diagram-1', 'Diagrama 1', { source: 'ia' });
  });

  it('atualiza diretamente diagramas que já possuem identidade persistida', async () => {
    const create = vi.fn();
    const update = vi.fn(async (id: string, name: string) => ({ id, name }));
    const coordinator = createDiagramPersistenceCoordinator({ create, update });

    await coordinator.persist({ diagramId: 'diagram-1', name: 'Renomeado', document: { source: 'ia' } });

    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith('diagram-1', 'Renomeado', { source: 'ia' });
  });
});
