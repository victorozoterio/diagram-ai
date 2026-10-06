import { describe, expect, it } from 'vitest';
import { isSelectAllShortcut } from './use-select-all-shortcut';

describe('atalho de selecionar todos', () => {
  it.each([
    [{ key: 'a', ctrlKey: true, metaKey: false }, 'Ctrl+A'],
    [{ key: 'A', ctrlKey: false, metaKey: true }, 'Cmd+A'],
  ])('reconhece %s', (event) => {
    expect(isSelectAllShortcut(event)).toBe(true);
  });

  it('ignora teclas sem modificador ou diferentes de A', () => {
    expect(isSelectAllShortcut({ key: 'a', ctrlKey: false, metaKey: false })).toBe(false);
    expect(isSelectAllShortcut({ key: 's', ctrlKey: true, metaKey: false })).toBe(false);
  });
});
