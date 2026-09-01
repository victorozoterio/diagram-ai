export function buildFixConceptualModelPrompt(params: {
  description: string;
  invalidModel: unknown;
  validationError: unknown;
}): string {
  return [
    'O modelo conceitual abaixo falhou na validação.',
    '',
    'Corrija apenas os problemas indicados.',
    '',
    'DESCRIÇÃO ORIGINAL:',
    params.description,
    '',
    'MODELO:',
    JSON.stringify(params.invalidModel),
    '',
    'ERROS:',
    JSON.stringify(params.validationError),
    '',
    'REGRAS:',
    '- Preserve os dados corretos.',
    '- Não invente novas informações sem necessidade.',
    '- Corrija campos ausentes ou inválidos.',
    '- Só use identifier ou unique quando houver evidência.',
    '- Preserve a semântica original da descrição.',
  ].join('\n');
}
