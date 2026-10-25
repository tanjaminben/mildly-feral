# Mildly Feral — IPA Fieldbook

A brewing notebook for batch records, measured readings, photos, timers, and backups.

<p>
<a href="#run-locally"><img src="docs/images/buttons/ipa-fieldbook.svg" height="50" alt="Run locally"></a>&nbsp; 
</p>

[![ipa-fieldbook illustrated repository banner.](docs/images/banner.png)](docs/images/banner.png)

## What it does

- Follow seven brewing stages with checklists and explicitly confirmed recipe instructions.
- Save batch notes, dates, hydrometer readings, tasting entries, and photographs.
- Estimate alcohol content from measured original and final gravity, and use a recoverable brew timer.
- Export saved records and photos, recover deleted items, and import backups without silently replacing existing records.

This is a personal notebook application. No public hosted demo is offered here.

## Run locally

This source snapshot omits runtime artwork and hosted project identity. Supply the appropriately licensed files listed in [ASSET-REQUIREMENTS.json](ASSET-REQUIREMENTS.json) before running the interface. [Source snapshot scope](SOURCE-SNAPSHOT.md).

Use Node.js 22.13 or newer. Install the locked dependencies and build the local Worker configuration:

```sh
npm run install:ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_purple_speed_demon.sql
npm run dev -- --hostname 127.0.0.1
```

The database command initializes a fresh **local** notebook; do not replay it against an existing database. Open the URL printed by the server, then visit `/signin-with-chatgpt?return_to=/` for the loopback development identity. Hosted sign-in is a separate service and is not simulated in production builds.

## Build and check

```sh
node node_modules/typescript/bin/tsc --noEmit
node scripts/check-improvements.mjs
node scripts/check-abv.mjs
npm run build
```

The built Worker can be previewed locally with `npm start`. Hosting requires configured authentication, D1, and R2 bindings. A Git push or local build does not deploy the app.

## Limitations

Saved notebooks use D1 and photos use R2 under the signed-in user's identity. Drafts and timers remain in browser storage and do not synchronize across devices. A connection is needed to save. Backups contain private notebook data, including saved photos and Trash; store them accordingly. Limits are 40 batches, 500 entries, and 60 photos per owner.

The alcohol calculator estimates ABV from temperature-corrected gravity readings. It does not determine fermentation completion or a safe priming-sugar dose. Recipe targets never substitute for measured readings. The timer does not promise notifications after the page is closed.

## License and credits

No blanket open-source license is granted. The Hop icon is from Lucide under the ISC license; retain its SVG notice and other applicable dependency licenses. Brewing references inform the notebook and do not replace a recipe's verified instructions or the brewer's judgment.

---

Made by [Ben Tan](https://ben-tan.com). [Report a security issue](SECURITY.md).
