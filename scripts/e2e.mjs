import {
  mkdirSync,
  existsSync,
  writeFileSync,
  createReadStream,
  createWriteStream,
  readFileSync,
  chmodSync,
} from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createBrotliDecompress, brotliDecompressSync } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
// Linux CI fallback includes Chromium in npm, avoiding a separate CDN download.
// Extract without changing ownership (restricted CI filesystems disallow chown).
if (process.platform === 'linux' && !process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
  const cache = resolve('.cache/test-browser');
  const bin = resolve('node_modules/@sparticuz/chromium/bin');
  mkdirSync(cache, { recursive: true });
  if (!existsSync(join(cache, 'ready'))) {
    await pipeline(
      createReadStream(join(bin, 'chromium.br')),
      createBrotliDecompress(),
      createWriteStream(join(cache, 'chromium')),
    );
    chmodSync(join(cache, 'chromium'), 0o700);
    for (const name of ['fonts', 'swiftshader']) {
      const destination = name === 'fonts' ? join(cache, 'fonts') : cache;
      mkdirSync(destination, { recursive: true });
      const result = spawnSync('tar', ['--no-same-owner', '-xf', '-', '-C', destination], {
        input: brotliDecompressSync(readFileSync(join(bin, `${name}.tar.br`))),
      });
      if (result.status !== 0) throw new Error(result.stderr.toString());
    }
    writeFileSync(join(cache, 'ready'), 'ok');
  }
  process.env.TMPDIR = cache;
  writeFileSync(
    join(cache, 'fonts', 'fonts.conf'),
    `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>/usr/share/fonts</dir><dir>${join(cache, 'fonts', 'fonts')}</dir><cachedir>${join(cache, 'font-cache')}</cachedir><config></config></fontconfig>`,
  );
  process.env.FONTCONFIG_PATH = join(cache, 'fonts');
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = join(cache, 'chromium');
}
const result = spawnSync(
  process.execPath,
  ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)],
  { stdio: 'inherit', env: process.env },
);
process.exit(result.status ?? 1);
