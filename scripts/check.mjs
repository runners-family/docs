import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFile(resolve(root, path), 'utf8');
const config = JSON.parse(await read('docs.json'));
const spec = JSON.parse(await read('openapi.json'));
assert.deepEqual(Object.keys(spec.paths).sort(), ['/api/metadata', '/api/metadata/{namespace}/{id}/{filename}', '/api/launch/create', '/api/launch/estimate', '/api/launch/prepare', '/api/launch/tag', '/api/launch/submit', '/api/launch/confirm'].sort(), 'Publish only launch and required metadata endpoints');
assert.ok(!/PublicDeployment|rpcUrl|subscriptionsUrl|TradeTransaction|CreatorClaim|MarketCoin|\/api\/(?:deployment|v1\/(trade|creator|transactions))/.test(JSON.stringify(spec)), 'Do not expose website configuration or unrelated operations');
assert.equal(spec.servers[0].url, 'https://runners.family', 'The playground must call the API origin');
assert.equal(config.api.playground.proxy, true, 'Writes require the server proxy rather than a foreign browser Origin');
const pages = config.navigation.tabs.flatMap(tab => (tab.groups ?? []).flatMap(group => group.pages));
for (const page of pages) {
  const text = await read(`${page}.mdx`);
  assert.match(text, /^---\ntitle: .+\ndescription: .+\n/);
  assert.ok(!text.includes('runners.example'), `${page} has a placeholder API hostname`);
  assert.ok(!/\/api\/(?:market|trade|airdrops|v1\/(?:trade|creator|transactions))/.test(text), `${page} documents an unrelated API`);
  assert.equal((text.match(/^```/gm) ?? []).length % 2, 0, `${page} has an unclosed code block`);
  for (const match of text.matchAll(/(?:\]\(|href=")\/(guides\/[^)"#\s]+|quickstart|index|openapi\.json)(?:#[^)"\s]*)?[)"]/g)) {
    const path = match[1];
    await stat(resolve(root, path.endsWith('.json') ? path : `${path}.mdx`));
  }
}
const ids = new Set();
let operations = 0;
for (const [path, item] of Object.entries(spec.paths)) {
  for (const [method, operation] of Object.entries(item)) {
    if (!['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)) continue;
    operations++;
    assert.ok(operation.operationId, `${method} ${path} has no operationId`);
    assert.ok(!ids.has(operation.operationId), `Duplicate operationId: ${operation.operationId}`);
    ids.add(operation.operationId);
    assert.ok(operation['x-runners-rate-class'], `${method} ${path} has no rate class`);
  }
}
for (const match of JSON.stringify(spec).matchAll(/"\$ref":"([^"\s]+)"/g)) {
  assert.ok(match[1].startsWith('#/'), 'Mintlify reference must be local');
  const target = match[1].slice(2).split('/').reduce((node, key) => node?.[key.replaceAll('~1', '/').replaceAll('~0', '~')], spec);
  assert.notEqual(target, undefined, `Unresolved reference: ${match[1]}`);
}
// A docs-only checkout is deployable without the private application. When its sibling
// application is available, also require generated files to match the canonical sources.
const application = process.env.RUNNERS_APP_DIR ? resolve(process.env.RUNNERS_APP_DIR) : resolve(root, '..');
if (await stat(resolve(application, 'docs/api.md')).catch(() => null)) {
  const { spawnSync } = await import('node:child_process');
  const result = spawnSync(process.execPath, ['scripts/sync.mjs', '--check'], { cwd: root, stdio: 'inherit' });
  assert.equal(result.status, 0, 'Canonical docs drift');
}
console.log(`Checked ${pages.length} guide pages, ${operations} API operations, internal links and schema references.`);
