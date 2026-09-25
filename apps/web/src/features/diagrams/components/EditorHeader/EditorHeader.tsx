import styles from './EditorHeader.module.css';

export type EditorMode = 'conceptual' | 'logical';

type EditorHeaderProps = {
  isGenerating: boolean;
  isConverting: boolean;
  canConvert: boolean;
  convertTitle: string;
  onGenerate: () => void;
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
  isGenerating,
  isConverting,
  canConvert,
  convertTitle,
  onGenerate,
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

      <div className={styles.actions}>
        {showSql && (
          <button
            className={`${styles.secondaryButton} ${styles.sqlButton}`}
            type='button'
            onClick={onGenerateSql}
            disabled={!canGenerateSql || isGeneratingSql}
          >
            <svg className={styles.sqlIcon} viewBox='0 0 16 16' aria-hidden='true'>
              <path d='M3 3.5h10v9H3zM3 6h10M6 3.5v2.5M10 3.5v2.5M5 9h1M8 9h1M11 9h1' />
            </svg>
            {isGeneratingSql ? 'Gerando SQL...' : 'SQL'}
          </button>
        )}
        <div ref={exportMenuTargetRef} className={styles.exportSlot} />
        <button
          className={`${styles.secondaryButton} ${styles.convertButton}`}
          type='button'
          onClick={onConvert}
          disabled={!canConvert || isConverting}
          title={convertTitle}
        >
          <svg className={styles.convertIcon} viewBox='0 0 16 16' aria-hidden='true'>
            <path d='M4 4h8l-2-2M12 4l-2 2M12 12H4l2 2M4 12l2-2' />
          </svg>
          {isConverting ? 'Convertendo...' : 'Converter modelo'}
        </button>
        <button className={styles.primaryButton} type='button' onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? 'Gerando...' : 'Gerar modelo'}
        </button>
      </div>
    </header>
  );
}
