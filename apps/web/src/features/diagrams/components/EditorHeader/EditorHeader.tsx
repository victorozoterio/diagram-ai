import styles from './EditorHeader.module.css';

type EditorHeaderProps = {
  isGenerating: boolean;
  isConverting: boolean;
  canConvertToLogical: boolean;
  onGenerate: () => void;
  onConvert: () => void;
  exportMenuTargetRef?: (element: HTMLDivElement | null) => void;
};

export function EditorHeader({
  isGenerating,
  isConverting,
  canConvertToLogical,
  onGenerate,
  onConvert,
  exportMenuTargetRef,
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

      <div className={styles.actions}>
        <div ref={exportMenuTargetRef} className={styles.exportSlot} />
        <button
          className={styles.secondaryButton}
          type='button'
          onClick={onConvert}
          disabled={!canConvertToLogical || isConverting}
        >
          {isConverting ? 'Convertendo...' : 'Converter para lógico'}
        </button>
        <button className={styles.primaryButton} type='button' onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? 'Gerando...' : 'Gerar modelo'}
        </button>
      </div>
    </header>
  );
}
