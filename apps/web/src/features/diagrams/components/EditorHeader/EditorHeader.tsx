import styles from './EditorHeader.module.css';

export type EditorMode = 'conceptual' | 'logical';

type EditorHeaderProps = {
  isConverting: boolean;
  canConvert: boolean;
  convertTitle: string;
  onConvert: () => void;
  exportMenuTargetRef?: (element: HTMLDivElement | null) => void;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  showSql: boolean;
  canGenerateSql: boolean;
  isGeneratingSql: boolean;
  onGenerateSql: () => void;
};

export function EditorHeader({
  isConverting,
  canConvert,
  convertTitle,
  onConvert,
  exportMenuTargetRef,
  mode,
  onModeChange,
  showSql,
  canGenerateSql,
  isGeneratingSql,
  onGenerateSql,
}: EditorHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.logoMark}>D</span>
        <div>
          <strong>Diagram.AI</strong>
          <span>Editor de modelos</span>
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
    </header>
  );
}
