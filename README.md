# Mildly Feral — IPA & kombucha

A personal brewing fieldbook for IPA and kombucha: recipes, batch notes, readings, photos, and tasting notes.

<p>
<a href="#run-locally"><img src="docs/images/buttons/ipa-fieldbook.svg" height="50" alt="Run locally"></a>&nbsp;
</p>

[![Mildly Feral banner showing IPA and kombucha.](docs/images/banner.png)](docs/images/banner.png)

## What it does

- **IPA:** start with your own recipe or choose an optional preset. Use extract, extract-with-grains or all-grain instructions, batch volume, ingredients, yeast guidance and a method-specific checklist. Reuse a saved recipe for the next batch.
- **Kombucha:** brew separate batches through tea preparation, starter culture, fermentation, flavoring, bottling, and tasting, with starter notes, measured pH and temperature, and bottle flavor groups.
- Keep the Kombucha Shop recipe reference separate from the longer house fermentation method.
- Save batch notes, dates, readings, tasting entries, and photographs.
- Estimate IPA alcohol content from measured original and final gravity, and use a recoverable brew timer.
- Export saved records and photos, recover deleted items, and import backups without silently replacing existing records.

[Open Mildly Feral](https://mildly-feral.ben-tan.com). No account is needed. Notebooks and photos stay in your browser profile; export a file for backup or transfer. You can also launch it from Play on [ben-tan.com](https://ben-tan.com).

## Run locally

This source snapshot omits runtime artwork and hosted project identity. Supply the appropriately licensed files listed in [ASSET-REQUIREMENTS.json](ASSET-REQUIREMENTS.json) before running the interface. [Source snapshot scope](SOURCE-SNAPSHOT.md).

Use Node.js 22.13 or newer. Install the locked dependencies and start the browser app:

```sh
npm run install:ci
npm run dev
```

Open the URL printed by the server. The browser creates its own IndexedDB notebook. No database initialization, sign-in, or server storage is required.

## Build and check

```sh
node node_modules/typescript/bin/tsc --noEmit
node scripts/check-improvements.mjs
node scripts/check-abv.mjs
node scripts/check-backup.mjs
node scripts/check-review-brewing.mjs
node scripts/check-kombucha.mjs
node scripts/check-own-recipes.mjs
npm run check:browser
npm run build
```

The built Worker can be previewed locally with `npm start`. `wrangler.jsonc` serves the built assets with no notebook API, identity service, D1 database, or R2 bucket. A Git push or local build does not deploy the app. Deployment requires the domain owner's Cloudflare account; use a different Worker name and domain for your own deployment.

### Portfolio path build

`npm run build:portfolio` builds a separate edition for `https://ben-tan.com/mildlyferal` in `dist/portfolio/mildlyferal`. The portfolio's release assembler supplies the route and security headers. This output includes a Back to portfolio link and instructions for bringing a notebook from the old address. The normal root build remains available for the existing subdomain. Building or pushing source does not deploy the app; the portfolio owns publication of this path.

Browser storage belongs to an origin. Export a JSON file at the old address, then import it at the new one and check both brewing editions and photos. Keep the old address and export available until the transfer is verified. The two copies do not sync, and import adds copies rather than replacing records. A path on ben-tan.com shares that origin's storage boundary with other code served by ben-tan.com; it does not have the subdomain's origin isolation.

## Limitations

Notebooks and compressed photos are saved in IndexedDB for this browser profile and site address. People who share that profile can access the same notebook. Other browsers and devices have separate notebooks. Clearing site data, removing the profile, or closing a private browsing session can remove saved records. Export regularly. Limits are 40 batches, 500 entries, and 60 photos per browser notebook.

One JSON export contains both brewing editions, saved photo bytes, and Trash. It contains compressed JPEG copies, not original camera files. Import adds separate copies and preserves existing records; repeated imports create duplicates. Backup files are not encrypted. Keep them private. Drafts and timers stay in the browser and are not part of a notebook export.

The IPA alcohol calculator estimates ABV from temperature-corrected gravity readings. These calculations do not apply to kombucha. Kombucha has its own pH, temperature, and taste records; the notebook does not infer bottle pressure or readiness. It does not determine fermentation completion or a safe priming-sugar dose. Recipe targets never substitute for measured readings. The timer does not promise notifications after the page is closed.

Notebook schema 3 retains existing IPA and kombucha records and imports schema-1/2 backups additively. New exports use version 3 to preserve custom recipe methods and batch volumes; older app versions cannot open those exports. Use the updated app when importing them. New backups include both kinds of brewing, including flavor groups, photos, and Trash. Storage limits are shared across both editions. See [Kombucha workflow and compatibility](docs/KOMBUCHA.md).

## Earlier Sites version

The original Sites release remains a separate private application with ChatGPT sign-in, D1 notebooks, and R2 photos. Its saved data does not automatically move to this browser app. Export from that release and import the file here. Legacy server source and migrations remain in this repository for reference; they are outside the default browser build. The previously deployed Sites source is preserved separately for recovery.

## License and credits

No blanket open-source license is granted. The Hop icon is from Lucide under the ISC license; retain its SVG notice and other applicable dependency licenses. Included Barlow and Barlow Semi Condensed fonts are licensed under the SIL Open Font License; their notices are in `public/fonts/`. Brewing references inform the notebook and do not replace a recipe's verified instructions or the brewer's judgment.

---

Made by [Ben Tan](https://ben-tan.com). [Report a security issue](SECURITY.md).
