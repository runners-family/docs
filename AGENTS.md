# RUNNERS developer documentation

This repository hosts public API documentation on Mintlify Starter. It does not host the RUNNERS backend. The production API origin is `https://runners.family`; do not replace it with the docs domain or invent an `api.runners.family` deployment.

## Branding

- Match the active website header, Geist typography, green accent and mascot. Never copy the obsolete September outlined wordmark or Mintlify starter icons.
- Use the versioned `assets/runners-header-*-v2.svg` and `assets/runners-favicon-v2.svg` files configured in `docs.json`. The header wordmark paths reproduce Geist 600 at the website’s spacing; the mascot comes from the active application.

## Content and verification

- Keep exact endpoint paths, message bytes, JSON field order, base-unit amounts and recovery rules aligned with the existing backend contract.
- The canonical sources are `docs/api.md` and `docs/openapi.json` in the RUNNERS application. Refresh generated files with `RUNNERS_APP_DIR=/path/to/ui npm run sync`. Do not make conflicting manual changes to generated guide pages or schemas.
- Run `npm run validate` before pushing. Preview with `npm run dev` when layout changes.
- Mintlify deploys the connected default branch. Use the deployment status and actual dashboard URL to verify publication; do not infer the live subdomain from the repository name.
- Maintain the free Starter configuration. Adding paid services, Amplify, AI add-ons or changing plan/account settings requires the owner's direction.

## Terminology and style

- Use “coin” for a launched asset, “quote token” for its pair, “creator” for the launching wallet and “atoms” for integer base units.
- Use active voice, concise sentences and sentence case headings.
- Keep the site to three guides (Quickstart, Launch a coin, Errors and limits) plus the API reference. State signing, amounts, retries and limits once in the relevant section. Avoid marketing slogans, repeated overviews, decorative cards and separate pages for a few paragraphs.
- Use code formatting for paths, amounts, identifiers and commands.
- Explain that launch preparation returns unsigned transactions; it does not execute a launch.
- Treat `unknown` transaction status as unresolved. Never recommend replacing a transaction until its outcome is known.

## Boundaries

- Publish only coin-launch integration behavior: deployment identity, metadata, estimates, preparation, submission and confirmation. Exclude trading, market-data, creator-fee and generic-relay operations and their schemas.
- Never copy secrets, environment files, private RPC URLs, operator details, wallet keypairs, local state or private evidence from the application repository.
- Never ask readers to paste private keys into the API playground.
- Preserve repository visibility. Do not publish application source or create a new public repository without explicit owner approval.
- RUNNERS token eligibility and allocations are outside these launch API guides. Documentation changes must not alter launch rules, signing, claims or on-chain behavior.
