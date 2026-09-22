import { spawn } from 'node:child_process';
const children = [
  spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '0.0.0.0'], {
    stdio: 'inherit',
  }),
  spawn(process.execPath, ['dist/server/index.js'], { stdio: 'inherit' }),
];
let closing = false;
function stop(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of children) child.kill('SIGTERM');
  setTimeout(() => process.exit(code), 3500).unref();
}
for (const child of children) {
  child.on('error', (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on('exit', (code) => stop(code ?? 0));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
