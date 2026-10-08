import { BrandLogo } from '@/components/BrandLogo/BrandLogo';
import { type AuthenticatedUser, AuthenticatedUserMenu } from '@/features/auth/components/AuthenticatedUserMenu';
import { useInlineDiagramRename } from '../../hooks/useInlineDiagramRename';
import styles from './EditorHeader.module.css';

export type EditorMode = 'conceptual' | 'logical';
export type SaveStatus = 'unsaved' | 'saving' | 'saved' | 'error';

type EditorHeaderProps = {
  diagramName: string;
  isConverting: boolean;
  canConvert: boolean;
  convertTitle: string;
  onConvert: () => void;
  onNavigateToDiagrams: () => void;
  onRenameDiagram: (name: string) => Promise<void>;
  exportMenuTargetRef?: (element: HTMLDivElement | null) => void;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  showSql: boolean;
  canGenerateSql: boolean;
  isGeneratingSql: boolean;
  onGenerateSql: () => void;
  isSessionLoading: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  user: AuthenticatedUser | null;
  saveStatus?: SaveStatus;
};

export function EditorHeader({
  diagramName,
  isConverting,
  canConvert,
  convertTitle,
  onConvert,
  onNavigateToDiagrams,
  onRenameDiagram,
  exportMenuTargetRef,
  mode,
  onModeChange,
  showSql,
  canGenerateSql,
  isGeneratingSql,
  onGenerateSql,
  isSessionLoading,
  onSignIn,
  onSignOut,
  user,
  saveStatus,
}: EditorHeaderProps) {
  const rename = useInlineDiagramRename({ diagramName, onRename: onRenameDiagram });

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <button aria-label='Meus diagramas' className={styles.logoMark} onClick={onNavigateToDiagrams} type='button'>
          <BrandLogo />
        </button>
        <div className={styles.diagramNameSlot}>
          {rename.isEditing ? (
            <input
              ref={rename.inputRef}
              aria-label='Nome do diagrama'
              className={styles.diagramNameInput}
              value={rename.nameDraft}
              onBlur={rename.handleBlur}
              onChange={(event) => rename.setNameDraft(event.target.value)}
              onKeyDown={rename.handleKeyDown}
            />
          ) : (
            <button
              className={styles.diagramName}
              onClick={rename.startEditing}
              title='Renomear diagrama'
              type='button'
            >
              {diagramName}
            </button>
          )}
        </div>
      </div>

      <div className={styles.menuBar}>
        <div ref={exportMenuTargetRef} className={styles.exportSlot} />
        <button
          className={styles.menuItem}
          type='button'
          onClick={onConvert}
          disabled={!canConvert || isConverting}
          title={convertTitle}
        >
          {isConverting ? 'Convertendo...' : 'Converter'}
        </button>
        {showSql && (
          <button
            className={styles.menuItem}
            type='button'
            onClick={onGenerateSql}
            disabled={!canGenerateSql || isGeneratingSql}
          >
            {isGeneratingSql ? 'Gerando SQL...' : 'SQL'}
          </button>
        )}
      </div>

      <div className={styles.headerEnd}>
        {saveStatus && (
          <span className={`${styles.saveStatus} ${styles[`saveStatus${saveStatus}`]}`}>
            {saveStatusLabel(saveStatus)}
          </span>
        )}
        <div className={styles.modeSwitcher} role='tablist' aria-label='Modo do editor'>
          <button
            className={`${styles.modeButton} ${mode === 'conceptual' ? styles.modeButtonActive : ''}`}
            type='button'
            role='tab'
            aria-selected={mode === 'conceptual'}
            onClick={() => onModeChange('conceptual')}
          >
            Conceitual
          </button>
          <button
            className={`${styles.modeButton} ${mode === 'logical' ? styles.modeButtonActive : ''}`}
            type='button'
            role='tab'
            aria-selected={mode === 'logical'}
            onClick={() => onModeChange('logical')}
          >
            Lógico
          </button>
        </div>

        {isSessionLoading ? (
          <span aria-label='Carregando sessão' className={styles.sessionPlaceholder} role='status' />
        ) : user ? (
          <AuthenticatedUserMenu onSignOut={onSignOut} user={user} />
        ) : (
          <button className={styles.menuItem} onClick={onSignIn} type='button'>
            Entrar
          </button>
        )}
      </div>
    </header>
  );
}

function saveStatusLabel(status: SaveStatus) {
  const labels: Record<SaveStatus, string> = {
    unsaved: 'Alterações não salvas',
    saving: 'Salvando...',
    saved: 'Salvo',
    error: 'Erro ao salvar',
  };

  return labels[status];
}
