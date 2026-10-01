import { type FocusEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';

type UseInlineDiagramRenameOptions = {
  diagramName: string;
  onRename: (name: string) => Promise<void>;
};

export function useInlineDiagramRename({ diagramName, onRename }: UseInlineDiagramRenameOptions) {
  const [isEditing, setIsEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(diagramName);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef(false);
  const skipNextBlurRef = useRef(false);

  useEffect(() => {
    if (!isEditing) setNameDraft(diagramName);
  }, [diagramName, isEditing]);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  function startEditing() {
    setIsEditing(true);
  }

  function cancelEditing() {
    skipNextBlurRef.current = true;
    setNameDraft(diagramName);
    setIsEditing(false);
  }

  async function commitEditing() {
    if (isSubmittingRef.current) return;

    const nextName = nameDraft.trim();
    if (!nextName || nextName === diagramName) {
      setNameDraft(diagramName);
      setIsEditing(false);
      return;
    }

    isSubmittingRef.current = true;
    try {
      await onRename(nextName);
    } catch {
      // A ação chamadora é responsável por expor o erro no contexto visual adequado.
    } finally {
      isSubmittingRef.current = false;
      setIsEditing(false);
    }
  }

  function handleBlur(_: FocusEvent<HTMLInputElement>) {
    if (skipNextBlurRef.current) {
      skipNextBlurRef.current = false;
      return;
    }

    void commitEditing();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      void commitEditing();
    }

    if (event.key === 'Escape') {
      cancelEditing();
    }
  }

  return {
    handleBlur,
    handleKeyDown,
    inputRef,
    isEditing,
    nameDraft,
    setNameDraft,
    startEditing,
  };
}
