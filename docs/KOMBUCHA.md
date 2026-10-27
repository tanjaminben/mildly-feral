# Kombucha batches

IPA and Kombucha share one authenticated notebook, revision guard, photo library, timer and backup area. The interface remembers a separate selected batch for each edition. The existing IPA collections, recipe instructions, hydrometer sources and seven-stage workflow retain their meaning.

Kombucha follows six freely browsable stages: brew tea; cool and culture; first fermentation; flavor and bottle; second fermentation; chill and taste. Changing the current stage requires an explicit action. A future date or elapsed recipe interval never completes a stage or observation.

The starting tea recipe is the Kombucha Shop recipe supplied by the brewer. Its 4 cups hot water, 3 tbsp tea, 1 cup cane sugar and 8 cups cold water are preserved as supplied. New house batches include 2 cups of mature, unflavored starter, following the Cornell Cooperative Extension recipe for 12 cups of sweet tea. Actual yield remains a brewer record. The 5–7 minute steep, 68–86°F cooling range (76°F ideal), starting pH at or below 4.5, finish pH 2.5–3.5 and 8–10 day reference remain separate from the longer house fermentation preference. Per-batch edits are saved with the batch.

The guide gives numbered instructions for preparation, cooling, culture and starter, pH checks, tasting, starter reservation, flavor amounts, headspace, daily bottle checks and refrigerated storage. The few-week house method belongs to the cloth-covered first fermentation; sealed bottle fermentation uses a separate 1–3 day reference with daily checks. Plain kombucha can go straight to the refrigerator without a second fermentation. Serving guidance uses pH 2.5–4.2, including a check after flavoring, and refrigeration at 4°C or colder. Neither dates nor pH indicate bottle pressure.

Instructions use the selected batch's quantities, timing and temperature display units. The legacy house starter placeholder receives the sourced quantity for display only when the original house water amounts are unchanged; stored recipes are not rewritten. Custom starter text is preserved. Previous/Next controls browse instructions without advancing the saved stage. Journal shortcuts retain the browsed phase. Existing checklist keys keep their order and meaning; checklists and sources are available below each step.

Primary brewing references checked October 26, 2026:

- [The Kombucha Shop brewing Q&A](https://www.thekombuchashop.com/pages/brew-q-a): flavor amounts and bottle handling.
- [Cornell Cooperative Extension workshop packet](https://s3.amazonaws.com/assets.cce.cornell.edu/attachments/52316/Kombucha_tips__tricks___recipes_BrownatHK_2021.pdf?1627483925=): starter quantity and starter reservation.
- [Utah State Extension](https://extension.usu.edu/preserve-the-harvest/kombucha): initial pH, headspace and daily bottle checks.
- [Colorado State Extension](https://extension.colostate.edu/resource/understanding-and-making-kombucha/): cleaning, fermentation, mold, the optional second fermentation and refrigeration.
- [BC Centre for Disease Control](https://www.bccdc.ca/resource-gallery/Documents/Educational%20Materials/EH/FPS/Food/Fermented/Fermented%20Foods%20Guideline%20-%203.11%20Kombucha%20and%20Jun.pdf): finished acidity, checking flavored mixtures and cold storage.

Journal records distinguish tea from room temperature and planned, completed and unconfirmed events. Completed readings retain dates and phases. Optional flavor groups record actual ingredients, quantities, bottle counts, bottling and refrigeration dates and notes; entries may refer to a group from their own batch. They do not calculate a sugar dose, alcohol level, bottle pressure or readiness. General guidance: [The Kombucha Shop brewing Q&A](https://www.thekombuchashop.com/pages/brew-q-a).

## Compatibility and storage

Schema 2 adds `kombuchaBatches` and `kombuchaEntries` beside the unchanged IPA collections. Schema-1 notebooks receive empty Kombucha collections when read; no IPA identifiers, gravity sources, checklists, dates or photos are reassigned. Saves use the same optimistic revision check.

The version-2 backup envelope includes both editions. Version-1 backups remain importable. Import adds independent copies and remaps batch, entry, flavor-group, photo and gravity-source identifiers. Trash counts toward the shared limits of 40 batches, 500 entries and 60 photos. Saved Kombucha photo references, including Trash, are protected by the same ownership and atomic reference checks as IPA photos.

Drafts recover in this browser tab and stay attached to their original batch. They are excluded from backups until saved. Timers and preferences remain device-local. These behaviors do not add background notifications or cross-device draft synchronization.

## Verification

Run the existing domain suites and `node scripts/check-kombucha.mjs`. Optional runtime checks use `node scripts/check-kombucha.mjs --api` against a loopback development server, default port 8878. `FIELDBOOK_TEST_ORIGIN` may select another loopback origin; hosted addresses are rejected. The suite restores the original local notebook and photo quota. Never run synthetic mutation tests against a deployed notebook.
