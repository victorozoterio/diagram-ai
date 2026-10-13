const INVALID_FILE_NAME_CHARACTERS = /[<>:"/\\|?*]/g;

/**
 * Mantém o nome dado pelo usuário sempre que possível e remove somente os
 * caracteres que não são aceitos de forma portátil por sistemas de arquivos.
 */
export function diagramDownloadFileName(
  name: string | undefined,
  extension: string,
  fallbackName = 'Diagrama',
): string {
  const normalizedExtension = extension.replace(/^\.+/, '') || 'txt';
  const normalizedName = Array.from(name ?? '')
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('')
    .trim()
    .replace(INVALID_FILE_NAME_CHARACTERS, '')
    .replace(/[. ]+$/u, '');
  const baseName = normalizedName && normalizedName !== '.' && normalizedName !== '..' ? normalizedName : fallbackName;

  return `${baseName}.${normalizedExtension}`;
}
