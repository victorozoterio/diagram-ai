import styles from './UnsavedChangesModal.module.css';

type UnsavedChangesModalProps = {
  isSaving: boolean;
  error: string | null;
  onContinueEditing: () => void;
  onDiscard: () => void;
  onSaveAndLeave: () => void;
};

export function UnsavedChangesModal({
  isSaving,
  error,
  onContinueEditing,
  onDiscard,
  onSaveAndLeave,
}: UnsavedChangesModalProps) {
  return (
    <div className={styles.overlay}>
      <section aria-labelledby='unsaved-changes-title' aria-modal='true' className={styles.modal} role='dialog'>
        <h2 id='unsaved-changes-title'>Alterações não salvas</h2>
        <p>Você possui alterações que ainda não foram salvas. Se sair agora, elas serão perdidas.</p>
        {error && (
          <span className={styles.error} role='alert'>
            {error}
          </span>
        )}
        <div className={styles.actions}>
          <button disabled={isSaving} onClick={onContinueEditing} type='button'>
            Continuar editando
          </button>
          <button disabled={isSaving} onClick={onDiscard} type='button'>
            Sair sem salvar
          </button>
          <button className={styles.primaryAction} disabled={isSaving} onClick={onSaveAndLeave} type='button'>
            {isSaving ? 'Salvando...' : 'Salvar e sair'}
          </button>
        </div>
      </section>
    </div>
  );
}
