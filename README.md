# RUNNERS developer documentation

Mintlify documentation for the RUNNERS launch API. Hosting belongs to Mintlify; the API continues to run at `https://runners.family`. The docs do not deploy a backend, hold keys or execute transactions automatically.

## Deploy

The target repository is [runners-family/docs](https://github.com/runners-family/docs). Connect its default branch in Mintlify with `docs.json` at the repository root. See [DEPLOY.md](DEPLOY.md) for the free plan, domain and verification steps.

Mintlify Starter is listed at $0/month with a custom domain and API playground as of October 20, 2026. Check [current pricing](https://www.mintlify.com/pricing) when choosing the plan. Amplify is not used.

## Preview and validate

Node.js 22.15 or newer:

```sh
npm ci --ignore-scripts
npm run validate
npm run dev
```

Open the localhost URL printed by Mintlify. `npm run validate` checks navigation, internal links, all OpenAPI references and Mintlify rendering rules. The CLI is pinned in package-lock.json.

## Content and maintenance

- Three guides: Launch API, Launch a coin, and Errors and limits. All are synchronized from the RUNNERS application's `docs/api.md`.
- `openapi.json`: the complete launch-only endpoint reference, synchronized from the application's contract. It retains the full request/response schemas.
- `source-manifest.json`: hashes for the canonical inputs and generated output. No production secrets or runtime configuration are included.
- `scripts/check.mjs`: catches broken navigation, contract references, placeholder hostnames and, when the application source is available, stale generated docs.
- `.mintignore`: excludes maintenance files from the published docs.

To update generated content from a local RUNNERS application checkout:

```sh
RUNNERS_APP_DIR=/absolute/path/to/runners/ui npm run sync
npm run validate
```

Review the diff, then commit and push to the docs repository's default branch. Mintlify automatically deploys connected-branch updates.

The source contract uses `/` because the backend serves it. The docs copy changes only the server origin to `https://runners.family` and a private-source guide reference to a public reference. Only launch operations and their reachable schema components are exported; unrelated endpoints and schemas are excluded. Request/response shapes and operation identifiers for the retained operations are preserved.

## Export a docs-only source ZIP

```sh
npm run package
```

This produces `dist/runners-mintlify-docs.zip`, with `docs.json` at its root, plus a SHA-256 file manifest. Packaging copies only an explicit list of documentation source files. It includes no application source, credentials, local state or Git history.

Mintlify generates `/llms.txt`, `/llms-full.txt` and Markdown page exports. Do not add a custom `llms.txt` unless intentionally replacing Mintlify's generated index.
