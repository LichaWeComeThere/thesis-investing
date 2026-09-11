import console from 'node:console';
import process from 'node:process';
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
if (args.includes('--host')) {
  // A browser preview uses the isolated example workspace, never desktop data.
  await import('./reviewPreview.mjs');
} else {
  const child = spawn('pnpm', ['--filter', '@thesis-investing/desktop', 'dev', ...args], {
    stdio: 'inherit', shell: process.platform === 'win32'
  });
  child.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
  child.on('exit', (code) => { process.exitCode = code ?? 1; });
}
