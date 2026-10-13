import { useEffect } from 'react';

type UndoRedoActions = {
  onRedo: () => void;
  onUndo: () => void;
};

export function handleUndoRedoShortcut(event: KeyboardEvent, actions: UndoRedoActions): boolean {
  if ((!event.ctrlKey && !event.metaKey) || event.altKey || event.key.toLowerCase() !== 'z') return false;

  event.preventDefault();
  if (event.shiftKey) {
    actions.onRedo();
  } else {
    actions.onUndo();
  }
  return true;
}

export function useUndoRedoShortcut(actions: UndoRedoActions): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return;
      handleUndoRedoShortcut(event, actions);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);
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
