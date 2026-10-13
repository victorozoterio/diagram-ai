import { describe, expect, it, vi } from 'vitest';
import { handleUndoRedoShortcut } from './useUndoRedoShortcut';

function keyboardEvent(overrides: Partial<KeyboardEvent>) {
  return {
    key: 'z',
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    preventDefault: vi.fn(),
    ...overrides,
  } as unknown as KeyboardEvent;
}

describe('atalho de desfazer/refazer', () => {
  it.each([{ ctrlKey: true }, { metaKey: true }])('desfaz com Ctrl/Cmd+Z', (modifiers) => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const event = keyboardEvent(modifiers);

    handleUndoRedoShortcut(event, { onUndo, onRedo });

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(onUndo).toHaveBeenCalledOnce();
    expect(onRedo).not.toHaveBeenCalled();
  });

  it.each([
    { ctrlKey: true, shiftKey: true },
    { metaKey: true, shiftKey: true },
  ])('refaz com Ctrl/Cmd+Shift+Z', (modifiers) => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const event = keyboardEvent(modifiers);

    handleUndoRedoShortcut(event, { onUndo, onRedo });

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(onRedo).toHaveBeenCalledOnce();
    expect(onUndo).not.toHaveBeenCalled();
  });
});
