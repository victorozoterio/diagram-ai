import { execFileSync } from 'node:child_process';
import pg from 'pg';
import { E2E_DATABASE_NAME, getE2EDatabaseURL, getMaintenanceDatabaseURL } from './e2e-database.mjs';

const databaseURL = getE2EDatabaseURL();
const maintenanceClient = new pg.Client({
  connectionString: getMaintenanceDatabaseURL(databaseURL).toString(),
});

try {
  await maintenanceClient.connect();
  const existingDatabase = await maintenanceClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [
    E2E_DATABASE_NAME,
  ]);

  if (existingDatabase.rowCount === 0) {
    await maintenanceClient.query(`CREATE DATABASE "${E2E_DATABASE_NAME}"`);
  }
} finally {
  await maintenanceClient.end();
}

const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
execFileSync(pnpmCommand, ['--filter', '@diagram-ai/api', 'exec', 'prisma', 'migrate', 'reset', '--force'], {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit',
});
