import { describe, expect, it, vi } from 'vitest';
import { handleCopyPasteShortcut } from './useCopyPasteShortcut';

function keyboardEvent(overrides: Partial<KeyboardEvent>) {
  return {
    key: 'c',
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    preventDefault: vi.fn(),
    ...overrides,
  } as unknown as KeyboardEvent;
}

describe('atalho de copiar e colar', () => {
  it.each([{ ctrlKey: true }, { metaKey: true }])('copia com Ctrl/Cmd+C', (modifiers) => {
    const onCopy = vi.fn();
    const onPaste = vi.fn();
    const event = keyboardEvent(modifiers);

    expect(handleCopyPasteShortcut(event, { onCopy, onPaste })).toBe(true);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(onCopy).toHaveBeenCalledOnce();
    expect(onPaste).not.toHaveBeenCalled();
  });

  it.each([{ ctrlKey: true }, { metaKey: true }])('cola com Ctrl/Cmd+V', (modifiers) => {
    const onCopy = vi.fn();
    const onPaste = vi.fn();
    const event = keyboardEvent({ ...modifiers, key: 'v' });

    expect(handleCopyPasteShortcut(event, { onCopy, onPaste })).toBe(true);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(onPaste).toHaveBeenCalledOnce();
    expect(onCopy).not.toHaveBeenCalled();
  });
});
