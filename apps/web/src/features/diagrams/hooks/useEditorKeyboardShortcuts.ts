import { useEffect } from 'react';

type EditorShortcutActions = {
  canDownload: boolean;
  canSave: boolean;
  onDownload: () => void;
  onSave: () => void;
};

export function handleEditorKeyboardShortcut(event: KeyboardEvent, actions: EditorShortcutActions): boolean {
  if ((!event.ctrlKey && !event.metaKey) || event.altKey || event.key.toLowerCase() !== 's') return false;

  event.preventDefault();

  if (event.shiftKey) {
    if (actions.canDownload) actions.onDownload();
    return true;
  }

  if (actions.canSave) actions.onSave();
  return true;
}

export function useEditorKeyboardShortcuts(actions: EditorShortcutActions): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      handleEditorKeyboardShortcut(event, actions);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);
}
