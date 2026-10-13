import { describe, expect, it } from 'vitest';
import { diagramDownloadFileName } from './file-name';

describe('diagramDownloadFileName', () => {
  it('preserva nome, espaços, acentos e letras maiúsculas', () => {
    expect(diagramDownloadFileName('Diagrama da empresa', 'diagramai')).toBe('Diagrama da empresa.diagramai');
    expect(diagramDownloadFileName('Modelo Ágil', '.sql')).toBe('Modelo Ágil.sql');
  });

  it('remove apenas caracteres inválidos para arquivos', () => {
    expect(diagramDownloadFileName('Plano: vendas/2026?', 'sql')).toBe('Plano vendas2026.sql');
  });

  it('usa o fallback quando o nome está vazio ou é inválido', () => {
    expect(diagramDownloadFileName('   ', 'diagramai')).toBe('Diagrama.diagramai');
    expect(diagramDownloadFileName('<>:', 'sql')).toBe('Diagrama.sql');
  });
});
