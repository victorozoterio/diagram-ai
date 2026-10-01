import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiFileText, FiMoreHorizontal, FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi';
import { type DiagramSummary, deleteDiagram, listDiagrams, renameDiagram } from '@/api/diagrams.api';
import { type AuthenticatedUser, AuthenticatedUserMenu } from '@/features/auth/components/AuthenticatedUserMenu';
import styles from './MyDiagramsPage.module.css';

type MyDiagramsPageProps = {
  onNewDiagram: () => void;
  onOpenDiagram: (diagramId: string) => void;
  onSignOut: () => void;
  user: AuthenticatedUser;
};

export function MyDiagramsPage({ onNewDiagram, onOpenDiagram, onSignOut, user }: MyDiagramsPageProps) {
  const [diagrams, setDiagrams] = useState<DiagramSummary[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadDiagrams = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setDiagrams(await listDiagrams());
    } catch {
      setError('Não foi possível carregar seus diagramas. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDiagrams();
  }, [loadDiagrams]);

  const filteredDiagrams = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
    if (!normalizedQuery) return diagrams;

    return diagrams.filter((diagram) => diagram.name.toLocaleLowerCase('pt-BR').includes(normalizedQuery));
  }, [diagrams, query]);

  function startRename(diagram: DiagramSummary) {
    setActionError(null);
    setDeletingId(null);
    setEditingId(diagram.id);
    setEditingName(diagram.name);
  }

  async function saveRename(diagramId: string) {
    const name = editingName.trim();
    if (!name) {
      setActionError('Informe um nome para o diagrama.');
      return;
    }

    try {
      const updatedDiagram = await renameDiagram(diagramId, name);
      setDiagrams((currentDiagrams) =>
        currentDiagrams.map((diagram) =>
          diagram.id === updatedDiagram.id
            ? { ...diagram, name: updatedDiagram.name, updatedAt: updatedDiagram.updatedAt }
            : diagram,
        ),
      );
      setEditingId(null);
      setActionError(null);
    } catch {
      setActionError('Não foi possível renomear o diagrama.');
    }
  }

  async function confirmDelete(diagramId: string) {
    try {
      await deleteDiagram(diagramId);
      setDiagrams((currentDiagrams) => currentDiagrams.filter((diagram) => diagram.id !== diagramId));
      setDeletingId(null);
      setActionError(null);
    } catch {
      setActionError('Não foi possível excluir o diagrama.');
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.logoMark}>D</span>
          <span>Diagram.AI</span>
        </div>
        <AuthenticatedUserMenu onSignOut={onSignOut} user={user} />
      </header>

      <section className={styles.content} aria-labelledby='my-diagrams-title'>
        <div className={styles.heading}>
          <div>
            <h1 id='my-diagrams-title'>Meus diagramas</h1>
            <p>Crie, abra e organize seus modelos salvos na nuvem.</p>
          </div>
          <button className={styles.newDiagramButton} onClick={onNewDiagram} type='button'>
            <FiPlus aria-hidden='true' />
            Novo diagrama
          </button>
        </div>

        <label className={styles.search}>
          <FiSearch aria-hidden='true' />
          <span className={styles.srOnly}>Buscar diagramas</span>
          <input
            type='search'
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='Buscar por nome'
          />
        </label>

        {isLoading ? (
          <p className={styles.status}>Carregando diagramas...</p>
        ) : error ? (
          <div className={styles.status} role='alert'>
            <p>{error}</p>
            <button onClick={() => void loadDiagrams()} type='button'>
              Tentar novamente
            </button>
          </div>
        ) : diagrams.length === 0 ? (
          <EmptyState onNewDiagram={onNewDiagram} />
        ) : filteredDiagrams.length === 0 ? (
          <p className={styles.status}>Nenhum diagrama encontrado para esta busca.</p>
        ) : (
          <div className={styles.grid}>
            {filteredDiagrams.map((diagram) => (
              <article className={styles.card} key={diagram.id}>
                <button className={styles.cardOpen} onClick={() => onOpenDiagram(diagram.id)} type='button'>
                  <span className={styles.cardIcon}>
                    <FiFileText aria-hidden='true' />
                  </span>
                  <span className={styles.cardContent}>
                    <strong>{diagram.name}</strong>
                    <span>
                      {diagram.modelType === 'logical'
                        ? 'Lógico'
                        : diagram.modelType === 'conceptual'
                          ? 'Conceitual'
                          : 'Modelo salvo'}
                    </span>
                    <small>{formatUpdatedAt(diagram.updatedAt)}</small>
                  </span>
                </button>

                <details className={styles.actions}>
                  <summary aria-label={`Ações para ${diagram.name}`}>
                    <FiMoreHorizontal aria-hidden='true' />
                  </summary>
                  <div className={styles.actionsMenu} role='menu'>
                    <button onClick={() => startRename(diagram)} type='button'>
                      <FiEdit2 aria-hidden='true' />
                      Renomear
                    </button>
                    <button className={styles.deleteAction} onClick={() => setDeletingId(diagram.id)} type='button'>
                      <FiTrash2 aria-hidden='true' />
                      Excluir
                    </button>
                  </div>
                </details>

                {editingId === diagram.id && (
                  <form
                    className={styles.inlineForm}
                    onSubmit={(event) => {
                      event.preventDefault();
                      void saveRename(diagram.id);
                    }}
                  >
                    <label>
                      <span className={styles.srOnly}>Novo nome do diagrama</span>
                      <input value={editingName} onChange={(event) => setEditingName(event.target.value)} />
                    </label>
                    <div>
                      <button type='button' onClick={() => setEditingId(null)}>
                        Cancelar
                      </button>
                      <button type='submit'>Salvar</button>
                    </div>
                  </form>
                )}

                {deletingId === diagram.id && (
                  <div className={styles.confirmDelete} role='alert'>
                    <p>Excluir “{diagram.name}”? Esta ação não pode ser desfeita.</p>
                    <div>
                      <button onClick={() => setDeletingId(null)} type='button'>
                        Cancelar
                      </button>
                      <button onClick={() => void confirmDelete(diagram.id)} type='button'>
                        Excluir
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {actionError && (
          <p className={styles.actionError} role='alert'>
            {actionError}
          </p>
        )}
      </section>
    </main>
  );
}

function EmptyState({ onNewDiagram }: Pick<MyDiagramsPageProps, 'onNewDiagram'>) {
  return (
    <div className={styles.emptyState}>
      <span className={styles.emptyIcon}>
        <FiFileText aria-hidden='true' />
      </span>
      <h2>Você ainda não possui diagramas.</h2>
      <p>Crie seu primeiro diagrama para começar.</p>
      <button className={styles.newDiagramButton} onClick={onNewDiagram} type='button'>
        <FiPlus aria-hidden='true' />
        Novo diagrama
      </button>
    </div>
  );
}

function formatUpdatedAt(value: string) {
  const differenceInMinutes = Math.round((Date.now() - new Date(value).getTime()) / 60_000);
  if (differenceInMinutes < 1) return 'Atualizado agora';
  if (differenceInMinutes < 60) return `Atualizado há ${differenceInMinutes} min`;

  const differenceInHours = Math.round(differenceInMinutes / 60);
  if (differenceInHours < 24) return `Atualizado há ${differenceInHours} h`;

  const differenceInDays = Math.round(differenceInHours / 24);
  if (differenceInDays < 7) return `Atualizado há ${differenceInDays} dia${differenceInDays === 1 ? '' : 's'}`;

  return `Atualizado em ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(value))}`;
}
