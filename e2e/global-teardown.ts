import { spawn } from 'node:child_process';

export default async function globalTeardown() {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('node', ['--env-file=apps/api/.env.e2e', 'apps/api/scripts/e2e-cleanup.mjs'], {
      cwd: process.cwd(),
      stdio: 'inherit',
    });

    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`A limpeza do ambiente E2E terminou com código ${code ?? 'desconhecido'}.`));
    });
  });
}
