# Deploy RUNNERS docs on Mintlify

## Cost and hosting

Use **Mintlify Starter ($0/month)**. As checked October 20, 2026, it includes five editor seats, a custom domain, Git sync, search, MCP and the API playground. The paid Pro plan adds AI assistant/agent and other features; the docs do not require those features. See [current pricing](https://www.mintlify.com/pricing). Account plan selection and quotas are controlled by Mintlify.

Mintlify hosts the documentation. No Amplify app, Lambda, API Gateway, database, AWS credentials or backend changes are needed. The docs call the existing API at `https://runners.family`.

## Existing docs repository

1. In [Mintlify](https://app.mintlify.com), select the RUNNERS project and choose Starter when selecting a plan. If onboarding opens a Pro trial, downgrade to Starter before the trial ends.
2. Under **Git Settings**, connect [runners-family/docs](https://github.com/runners-family/docs) and its default branch, `main`. Keep `docs.json` at the root; no subdirectory setting is needed.
3. Give the Mintlify GitHub app access to the docs repository. This repository contains only documentation. The RUNNERS application and verification repository do not need to be connected.
4. Push the validated docs changes. Mintlify automatically builds the connected branch.
5. Open the URL shown on the Mintlify project's Overview page and check the latest deployment's status. Use that exact URL; do not guess the project subdomain from the GitHub name.

You do not need to make a repository public to host public documentation. Preserve the owner's chosen repository visibility. No new public repository should be created by this workflow.

## Optional custom domain

1. In Mintlify, open **Domain Setup** and add `docs.runners.family`.
2. Copy the exact DNS record Mintlify provides into the current DNS provider.
3. Wait for Mintlify to confirm DNS and HTTPS are ready, then open the custom domain.

Use a dedicated docs subdomain. Keep `runners.family` pointed to the existing application and `claim.runners.family` pointed to the claim destination. The API's signed `appOrigin` remains the existing RUNNERS application origin.

Reference: [Mintlify custom domains](https://www.mintlify.com/docs/deploy/custom-domain).

## Verify the deployment

- The home page says RUNNERS, not Mintlify Starter Kit.
- The Guides tab includes the complete launch, signing, recovery, rate-limit and error guides.
- API reference lists only launch and metadata operations.
- API reference requests target `https://runners.family`, never the docs domain.
- The upload challenge (`GET /api/metadata`) returns only its signing context. Check proxy behavior before advertising signed write operations as tested.
- `/openapi.json` contains the expected API server and `/llms.txt` lists the published guides.
- Follow a link to the complete launch guide and a link to the error codes; confirm both work on a mobile screen too.

Do not use a production signed launch to test documentation rendering. The playground sends real requests and never needs secret keys.

## Update later

```sh
npm ci --ignore-scripts
RUNNERS_APP_DIR=/absolute/path/to/runners/ui npm run sync
npm run validate
```

Review and push only the docs changes. Read [GitHub deployment setup](https://www.mintlify.com/docs/deploy/github) for GitHub app and connected-branch troubleshooting.
