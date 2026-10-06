import { useEffect } from 'react';

type SelectAllShortcutOptions = {
  onSelectAllNodes: () => void;
  onSelectAllEdges?: () => void;
};

export function isSelectAllShortcut(event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey'>) {
  return event.key.toLowerCase() === 'a' && (event.ctrlKey || event.metaKey);
}

/** Compartilha Ctrl/Cmd+A entre os canvases sem capturar texto de campos editáveis. */
export function useSelectAllShortcut({ onSelectAllNodes, onSelectAllEdges }: SelectAllShortcutOptions) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isSelectAllShortcut(event) || isEditableTarget(document.activeElement) || isEditableTarget(event.target)) {
        return;
      }

      event.preventDefault();
      onSelectAllNodes();
      onSelectAllEdges?.();
    }

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onSelectAllEdges, onSelectAllNodes]);
}

function isEditableTarget(target: EventTarget | Element | null) {
  if (!(target instanceof Element)) {
    return false;
  }

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable) ||
    Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
  );
}
