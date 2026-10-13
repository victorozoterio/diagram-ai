type PersistedDiagram = {
  id: string;
  name: string;
};

type DiagramPersistenceApi<Document, Diagram extends PersistedDiagram> = {
  create: (name: string, document: Document) => Promise<Diagram>;
  update: (id: string, name: string, document: Document) => Promise<Diagram>;
};

type PersistDiagramInput<Document> = {
  diagramId?: string;
  name: string;
  document: Document;
};

/**
 * Garante que dois salvamentos concorrentes de um projeto ainda não persistido
 * compartilhem o mesmo POST. Quem chegar depois atualiza o registro recém-criado.
 */
export function createDiagramPersistenceCoordinator<Document, Diagram extends PersistedDiagram>(
  api: DiagramPersistenceApi<Document, Diagram>,
) {
  let pendingCreation: Promise<Diagram> | null = null;

  async function persist({ diagramId, name, document }: PersistDiagramInput<Document>): Promise<Diagram> {
    if (diagramId) return api.update(diagramId, name, document);

    const isCreating = pendingCreation === null;
    const creation = pendingCreation ?? api.create(name, document);

    if (isCreating) {
      pendingCreation = creation;
      try {
        return await creation;
      } finally {
        if (pendingCreation === creation) pendingCreation = null;
      }
    }

    const createdDiagram = await creation;
    return api.update(createdDiagram.id, name, document);
  }

  return { persist };
}
