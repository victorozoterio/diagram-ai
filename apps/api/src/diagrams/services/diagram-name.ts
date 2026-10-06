const DEFAULT_DIAGRAM_NAME_PREFIX = 'Diagrama';
const DEFAULT_DIAGRAM_NAME_PATTERN = /^Diagrama ([1-9]\d*)$/;

/**
 * Retorna o menor nome padrão livre, considerando somente nomes automáticos
 * no formato exato "Diagrama <número>".
 */
export function nextAvailableDiagramName(names: Iterable<string>): string {
  const usedNumbers = new Set<number>();

  for (const name of names) {
    const match = DEFAULT_DIAGRAM_NAME_PATTERN.exec(name);
    if (match) usedNumbers.add(Number(match[1]));
  }

  let nextNumber = 1;
  while (usedNumbers.has(nextNumber)) nextNumber += 1;

  return `${DEFAULT_DIAGRAM_NAME_PREFIX} ${nextNumber}`;
}
