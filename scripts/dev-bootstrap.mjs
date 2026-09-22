import { existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const major = Number(process.versions.node.split('.')[0]);

if (major < 24) {
  console.error(
    `Drakvalvet kräver Node.js 24 eller senare. Du har ${process.versions.node}.\n` +
      'Hämta Node.js från https://nodejs.org/ och kör sedan startfilen igen.',
  );
  process.exit(1);
}

if (!existsSync('node_modules/next/package.json')) {
  console.log('Installerar Drakvalvets paket första gången …');
  const install = spawnSync(npm, ['ci'], { stdio: 'inherit' });
  if (install.status !== 0) process.exit(install.status ?? 1);
}

console.log('Startar Drakvalvet på http://localhost:3000 …');
const dev = spawn(npm, ['run', 'dev'], { stdio: 'inherit' });

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => dev.kill(signal));
}

dev.on('exit', (code) => process.exit(code ?? 0));
