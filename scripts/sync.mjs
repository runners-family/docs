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
  ['Basics', 'basics', 'API basics', 'Production origin, deployment identity, JSON responses and server time.'],
  ['Amounts and decimals', 'amounts', 'Amounts and decimals', 'Represent token amounts exactly with integer strings in base units.'],
  ['Launching coins', 'launch', 'Launch a coin', 'The complete wallet-authorized launch protocol, from artwork to confirmation.'],
  ['Errors', 'errors', 'Error codes', 'Branch on stable machine-readable codes and recover from transient failures.'],
  ['Rate limits', 'rate-limits', 'Rate limits', 'Respect request budgets, per-wallet quotas and retry instructions.'],
];
const generated = {};
const frontmatter = (title, description) => `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\n---\n\n`;
function adapt(text) {
  return text
    .replaceAll('https://runners.example', 'https://runners.family')
    .replaceAll('[Errors](#errors)', '[Errors](/guides/errors)')
    .replaceAll('[Amounts](#amounts-and-decimals)', '[Amounts](/guides/amounts)')
    .replaceAll(' (see [Creator fees](#creator-fees))', '')
    .trim();
}
for (const [section, slug, title, description] of guides) {
  if (!sections.has(section)) throw new Error(`Missing canonical section: ${section}`);
  let body = sections.get(section);
  generated[`guides/${slug}.mdx`] = frontmatter(title, description) + adapt(body) + '\n';
}
const spec = JSON.parse(contract);
const launchPaths = ['/api/deployment', '/api/metadata', '/api/metadata/{namespace}/{id}/{filename}', '/api/launch/estimate', '/api/launch/prepare', '/api/launch/submit', '/api/launch/confirm'];
spec.paths = Object.fromEntries(launchPaths.map(path => {
  if (!spec.paths[path]) throw new Error(`Missing launch endpoint: ${path}`);
  return [path, spec.paths[path]];
}));
spec.info = { title: 'RUNNERS Launch API', version: spec.info.version, summary: 'Launch a Solana coin from an agent or bot.', description: 'Upload wallet-authorized metadata, estimate launch costs, prepare unsigned launch transactions, sign locally, submit and confirm. All amounts use integer base-unit strings. No website session or integrator API key is required. See the Launch a coin guide for exact authorization messages.' };
spec.tags = spec.tags.filter(tag => ['Launch', 'Deployment'].includes(tag.name));
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
const mascot = await read('../exports/runners-brand-kit/logos/runners-mascot.svg');
const logo = await read('../exports/runners-brand-kit/logos/runners-logo.svg');
generated['assets/favicon.svg'] = mascot;
generated['assets/logo-dark.svg'] = logo;
generated['assets/logo-light.svg'] = logo.replaceAll('#f2f1eb', '#171A20');
generated['source-manifest.json'] = JSON.stringify({
  description: 'Launch-only documentation. Only launch operations and their reachable schema components are published.',
  sources: { 'docs/api.md': digest(api), 'docs/openapi.json': digest(contract), '../exports/runners-brand-kit/logos/runners-logo.svg': digest(logo), '../exports/runners-brand-kit/logos/runners-mascot.svg': digest(mascot) },
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
