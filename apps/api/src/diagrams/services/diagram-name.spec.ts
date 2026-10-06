import { describe, expect, it } from 'vitest';

import { nextAvailableDiagramName } from './diagram-name';

describe('nextAvailableDiagramName', () => {
  it('nomeia o primeiro projeto como Diagrama 1', () => {
    expect(nextAvailableDiagramName([])).toBe('Diagrama 1');
  });

  it('usa a próxima posição livre entre nomes padrão', () => {
    expect(nextAvailableDiagramName(['Diagrama 1', 'Meu sistema', 'Diagrama 2'])).toBe('Diagrama 3');
  });

  it('ignora nomes personalizados e reutiliza posições liberadas por exclusão ou renomeação', () => {
    expect(nextAvailableDiagramName(['Diagrama 1', 'Meu sistema'])).toBe('Diagrama 2');
    expect(nextAvailableDiagramName(['Diagrama 1', 'Diagrama 3', 'Diagrama 4'])).toBe('Diagrama 2');
  });

  it('considera somente o padrão exato Diagrama <número>', () => {
    expect(nextAvailableDiagramName(['Diagrama 1', 'diagrama 2', 'Diagrama 02', 'Diagrama 0'])).toBe('Diagrama 2');
  });
});
