import { spawn } from 'node:child_process';
import { getE2EDatabaseURL } from './e2e-database.mjs';

getE2EDatabaseURL();

const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const api = spawn(pnpmCommand, ['--filter', '@diagram-ai/api', 'start:dev'], {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit',
});

api.once('error', (error) => {
  throw error;
});

api.once('exit', (code) => {
  process.exitCode = code ?? 1;
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => api.kill(signal));
}
