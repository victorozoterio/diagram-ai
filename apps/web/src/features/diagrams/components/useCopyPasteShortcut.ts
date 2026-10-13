import { useEffect } from 'react';

type CopyPasteActions = {
  onCopy: () => void;
  onPaste: () => void;
};

export function useCopyPasteShortcut(actions: CopyPasteActions): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return;
      handleCopyPasteShortcut(event, actions);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);
}

export function handleCopyPasteShortcut(event: KeyboardEvent, actions: CopyPasteActions): boolean {
  if ((!event.ctrlKey && !event.metaKey) || event.altKey) return false;

  const key = event.key.toLowerCase();
  if (key !== 'c' && key !== 'v') return false;

  event.preventDefault();
  if (key === 'c') actions.onCopy();
  else actions.onPaste();
  return true;
}

function isEditableTarget(target: EventTarget | null) {
  const elements = [target instanceof Element ? target : null, document.activeElement];
  return elements.some((element) => {
    if (!(element instanceof HTMLElement)) return false;

    return Boolean(
      element.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]') ||
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement ||
        element instanceof HTMLSelectElement ||
        element.isContentEditable,
    );
  });
}
