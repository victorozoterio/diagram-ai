import styles from './EditorHeader.module.css';

export type EditorMode = 'conceptual' | 'logical';

type EditorHeaderProps = {
  isGenerating: boolean;
  isConverting: boolean;
  canConvert: boolean;
  convertLabel: string;
  onGenerate: () => void;
  onConvert: () => void;
  exportMenuTargetRef?: (element: HTMLDivElement | null) => void;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
};

export function EditorHeader({
  isGenerating,
  isConverting,
  canConvert,
  convertLabel,
  onGenerate,
  onConvert,
  exportMenuTargetRef,
  mode,
  onModeChange,
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
        <div ref={exportMenuTargetRef} className={styles.exportSlot} />
        <button
          className={styles.secondaryButton}
          type='button'
          onClick={onConvert}
          disabled={!canConvert || isConverting}
        >
          {isConverting ? 'Convertendo...' : convertLabel}
        </button>
        <button className={styles.primaryButton} type='button' onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? 'Gerando...' : 'Gerar modelo'}
        </button>
      </div>
    </header>
  );
}
