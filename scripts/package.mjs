import { mkdir, readdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const staging = resolve(dist, 'mintlify');
await mkdir(dist, { recursive: true });
await rm(staging, { recursive: true, force: true });
await mkdir(staging);
// Explicit allowlist: never package the application, local state, keys, env files or Git history.
const files = ['docs.json', 'openapi.json', 'index.mdx', 'media-kit.mdx', 'styles.css', 'source-manifest.json', 'README.md', 'DEPLOY.md', 'package.json', 'package-lock.json', '.gitignore', '.mintignore'];
for (const directory of ['guides', 'assets', 'scripts']) {
  for (const name of await readdir(resolve(root, directory))) {
    if (name.startsWith('.') || !/\.(mdx|svg|mjs)$/.test(name)) continue;
    files.push(join(directory, name));
  }
}
for (const name of await readdir(resolve(root, 'assets/media-kit'))) {
  if (/^runners-[a-z-]+\.(svg|png)$/.test(name) || name === 'README.txt') {
    files.push(join('assets/media-kit', name));
  }
}
files.push('assets/runners-media-kit.zip');
const hashes = {};
for (const file of files) {
  await mkdir(dirname(resolve(staging, file)), { recursive: true });
  await copyFile(resolve(root, file), resolve(staging, file));
  hashes[file] = createHash('sha256').update(await readFile(resolve(staging, file))).digest('hex');
}
await writeFile(resolve(staging, 'PACKAGE-MANIFEST.json'), JSON.stringify({ files: hashes }, null, 2) + '\n');
const archive = resolve(dist, 'runners-mintlify-docs.zip');
await rm(archive, { force: true });
const result = spawnSync('zip', ['-q', '-r', archive, '.'], { cwd: staging, stdio: 'inherit' });
if (result.status !== 0) throw new Error('Docs ZIP could not be created.');
console.log(`Packaged ${files.length} allowlisted source files: ${archive}`);
