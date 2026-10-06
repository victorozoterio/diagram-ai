import { describe, expect, it, vi } from 'vitest';

import { handleEditorKeyboardShortcut } from './useEditorKeyboardShortcuts';

function keyboardEvent(overrides: Partial<KeyboardEvent>) {
  return {
    key: 's',
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    preventDefault: vi.fn(),
    ...overrides,
  } as unknown as KeyboardEvent;
}

describe('handleEditorKeyboardShortcut', () => {
  it.each([{ ctrlKey: true }, { metaKey: true }])('executa salvar com $ctrlKey$metaKey+S', (modifiers) => {
    const onSave = vi.fn();
    const onDownload = vi.fn();
    const event = keyboardEvent(modifiers);

    handleEditorKeyboardShortcut(event, { canSave: true, canDownload: true, onSave, onDownload });

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledOnce();
    expect(onDownload).not.toHaveBeenCalled();
  });

  it.each([
    { ctrlKey: true, shiftKey: true },
    { metaKey: true, shiftKey: true },
  ])('executa salvar como com $ctrlKey$metaKey+Shift+S', (modifiers) => {
    const onSave = vi.fn();
    const onDownload = vi.fn();
    const event = keyboardEvent(modifiers);

    handleEditorKeyboardShortcut(event, { canSave: true, canDownload: true, onSave, onDownload });

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(onDownload).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('previne o comportamento do navegador sem executar ação indisponível', () => {
    const onSave = vi.fn();
    const onDownload = vi.fn();
    const event = keyboardEvent({ ctrlKey: true });

    handleEditorKeyboardShortcut(event, { canSave: false, canDownload: false, onSave, onDownload });

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
    expect(onDownload).not.toHaveBeenCalled();
  });
});
