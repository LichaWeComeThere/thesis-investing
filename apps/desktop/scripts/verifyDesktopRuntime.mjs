import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { clearTimeout, setTimeout } from 'node:timers';

const require = createRequire(import.meta.url);
const desktop = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const directory = await mkdtemp(join(tmpdir(), 'mkii-electron-runtime-'));
try {
  const child = spawn(process.execPath, [require.resolve('electron/cli.js'), './out/main/verifyDesktopRuntime.js'], {
    cwd: desktop,
    env: { ...process.env, THESIS_RUNTIME_VERIFY_USER_DATA: directory },
    detached: process.platform !== 'win32',
    stdio: 'inherit'
  });
  const deadline = setTimeout(() => {
    if (!child.pid) return;
    process.stderr.write('[desktop verification] Runtime process exceeded its deadline.\n');
    if (process.platform === 'win32') {
      spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'inherit' });
    } else {
      process.kill(-child.pid, 'SIGKILL');
    }
  }, 180_000); // Includes first-run Electron binary download; runtime itself is limited to 30 seconds.
  try {
    process.exitCode = await new Promise((resolveExit, reject) => {
      child.once('error', reject);
      child.once('exit', (code) => resolveExit(code ?? 1));
    });
  } finally {
    clearTimeout(deadline);
  }
} finally {
  // The Electron process has exited, so Chromium/SQLite cannot hold Windows file handles.
  await rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}
