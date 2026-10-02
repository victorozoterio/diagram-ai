export const E2E_DATABASE_NAME = 'diagram-ai-e2e';

export function getE2EDatabaseURL() {
  if (process.env.E2E_TESTS !== 'true') {
    throw new Error('Operações E2E exigem E2E_TESTS=true.');
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL é obrigatória para operações E2E.');
  }

  const databaseURL = new URL(process.env.DATABASE_URL);
  const databaseName = decodeURIComponent(databaseURL.pathname.replace(/^\//, ''));

  if (databaseName !== E2E_DATABASE_NAME) {
    throw new Error(
      `Operação bloqueada: DATABASE_URL deve apontar exclusivamente para ${E2E_DATABASE_NAME}, não para ${databaseName || '(sem database)'}.`,
    );
  }

  return databaseURL;
}

export function getMaintenanceDatabaseURL(databaseURL) {
  const maintenanceURL = new URL(databaseURL);
  maintenanceURL.pathname = '/postgres';
  return maintenanceURL;
}
