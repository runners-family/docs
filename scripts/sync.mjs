import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const app = process.env.RUNNERS_APP_DIR ? resolve(process.env.RUNNERS_APP_DIR) : resolve(root, '..');
const read = path => readFile(resolve(app, path), 'utf8');
const digest = value => createHash('sha256').update(value).digest('hex');
const api = await read('docs/api.md');
const contract = await read('docs/openapi.json');
const sections = new Map([...api.matchAll(/^## (.+)\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm)].map(match => [match[1], match[2].trim()]));

const guides = [
  ['Quickstart', 'index', 'Launch API', 'Create a Solana coin from your agent or application.'],
  ['Launching coins', 'guides/launch', 'Launch a coin', 'Upload metadata, sign, submit and confirm.'],
  ['Errors and limits', 'guides/errors', 'Errors and limits', 'Error codes, retries and request limits.'],
];
const generated = {};
const frontmatter = (title, description) => `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\n---\n\n`;
function adapt(text) {
  return text
    .replaceAll('https://runners.example', 'https://runners.family')
    .replaceAll('[Errors](#errors)', '[Errors](/guides/errors)')
    .trim();
}
for (const [section, slug, title, description] of guides) {
  if (!sections.has(section)) throw new Error(`Missing canonical section: ${section}`);
  let body = sections.get(section);
  generated[`${slug}.mdx`] = frontmatter(title, description) + adapt(body) + '\n';
}
const spec = JSON.parse(contract);
const launchPaths = ['/api/metadata', '/api/metadata/{namespace}/{id}/{filename}', '/api/launch/estimate', '/api/launch/prepare', '/api/launch/submit', '/api/launch/confirm'];
spec.paths = Object.fromEntries(launchPaths.map(path => {
  if (!spec.paths[path]) throw new Error(`Missing launch endpoint: ${path}`);
  return [path, spec.paths[path]];
}));
spec.info = { title: 'RUNNERS Launch API', version: spec.info.version, summary: 'Launch a Solana coin from an agent or bot.', description: 'Upload wallet-authorized metadata, estimate launch costs, prepare unsigned launch transactions, sign locally, submit and confirm. All amounts use integer base-unit strings. No website session or integrator API key is required. See the Launch a coin guide for exact authorization messages.' };
spec.tags = spec.tags.filter(tag => tag.name === 'Launch');
// Only include components reachable from launch operations; filtering paths alone would
// still publish unrelated trading/market/fee schemas in the downloadable contract.
const sourceComponents = spec.components;
const components = {};
function retainReferences(value) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) { value.forEach(retainReferences); return; }
  for (const [key, item] of Object.entries(value)) {
    if (key === '$ref') {
      const match = /^#\/components\/([^/]+)\/([^/]+)$/.exec(item);
      if (!match) throw new Error(`Unexpected contract reference: ${item}`);
      const [, category, encoded] = match;
      const name = encoded.replaceAll('~1', '/').replaceAll('~0', '~');
      if (components[category]?.[name]) continue;
      const target = sourceComponents[category]?.[name];
      if (!target) throw new Error(`Missing contract component: ${item}`);
      (components[category] ??= {})[name] = target;
      retainReferences(target);
    } else retainReferences(item);
  }
}
retainReferences(spec.paths);
spec.components = components;
// The source contract uses '/' because it is served by the API itself. The docs are a
// different origin, so their copy must name the real API, not the Mintlify hostname.
spec.servers = [{ url: 'https://runners.family', description: 'RUNNERS production API (Solana mainnet)' }];
function externalize(value) {
  if (typeof value === 'string') return value.replaceAll('See docs/api.md', 'See the Launch a coin guide');
  if (Array.isArray(value)) return value.map(externalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, externalize(item)]));
  return value;
}
generated['openapi.json'] = JSON.stringify(externalize(spec), null, 2) + '\n';
// The current website header is authoritative. The September export contains
// an obsolete wordmark; never source documentation branding from that pack.
const mascot = await read('public/brand/mascot.svg');
const header = await read('components/header.tsx');
const wordmark = await readFile(resolve(root, 'assets/runners-wordmark.svg'), 'utf8');
const inner = svg => svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const width = Number(/viewBox="0 0 ([\d.]+) 24"/.exec(wordmark)[1]) + 32;
const logo = color => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 24" role="img" aria-label="runners"><g fill="#9DDB00" color="#9DDB00" transform="scale(.1875)">${inner(mascot)}</g><g fill="${color}" color="${color}" transform="translate(32 0)">${inner(wordmark)}</g></svg>\n`;
generated['assets/runners-favicon-v2.svg'] = mascot.replaceAll('currentColor', '#9DDB00');
generated['assets/runners-header-dark-v2.svg'] = logo('#FAFAFA');
generated['assets/runners-header-light-v2.svg'] = logo('#0A0A0A');
generated['source-manifest.json'] = JSON.stringify({
  description: 'Launch-only documentation. Only launch operations and their reachable schema components are published.',
  sources: { 'docs/api.md': digest(api), 'docs/openapi.json': digest(contract), 'components/header.tsx': digest(header), 'public/brand/mascot.svg': digest(mascot), 'assets/runners-wordmark.svg': digest(wordmark) },
  generated: Object.fromEntries(Object.entries(generated).map(([path, value]) => [path, digest(value)])),
}, null, 2) + '\n';
if (process.argv.includes('--check')) {
  for (const [path, value] of Object.entries(generated)) {
    if (await readFile(resolve(root, path), 'utf8').catch(() => '') !== value) throw new Error(`Generated docs are stale: ${path}. Run npm run sync in developer-docs.`);
  }
  console.log(`Canonical API sources match ${Object.keys(generated).length} generated documentation files.`);
} else {
  for (const [path, value] of Object.entries(generated)) {
    await mkdir(dirname(resolve(root, path)), { recursive: true });
    await writeFile(resolve(root, path), value);
  }
  console.log(`Synced ${Object.keys(generated).length} files from the current API guide and contract.`);
}
