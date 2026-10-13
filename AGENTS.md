# AGENTS.md

Edge Delivery Services. Read a block first. Omissions are in the repo or known.

## Avoid
- `scripts/aem.js` is vendored. Never edit.
- Markup comes from the backend. `curl localhost:3000/x.plain.html` first.
- `buildAutoBlocks` rewrites content before your block runs.
- Authors omit and add cells. Decorate defensively.
- No build step; devDependencies only.
- Scope CSS to `.blockname`; `-wrapper`/`-container` are section classes.
- `fragment/fragment.js` is the only cross-block import. Otherwise use `/scripts/`.

## Outdated
- `fstab.yaml`, `helix-query.yaml`, `paths.json` are retired. Config lives at tools.aem.live.

## Remember
- `npx -y @adobe/aem-cli up`: local code, previewed content.
- Merging `main` ships code; content publishes separately.
- A PR without a `{branch}--fedex--aemsites.aem.page/{path}` link is rejected.
- PR body: Summary, `## Preview`, Testing. Preview is a `| Page | Before | After |` table, one row per affected page (incl. pages sharing a changed block): Before `main--fedex--aemsites.aem.page/{path}`, After `{branch}--fedex--aemsites.aem.page/{path}`. Check every link returns 200. Example: PR #3.
- DA content is shared across branches. Uploaded content for an unmerged PR → add a "Merge soon" note.
- All committed files are served. Use `.hlxignore`.
- Header/footer load `/{locale}/nav` and `/{locale}/footer` (locale = first path segment), then `/en-us/…`, then root `/nav`, `/footer`. Shared loader: `scripts/locale-fragment.js`; `npm test`.
- Navs and footers are imported per locale from `{locale}/home.html`: `tools/importer/import-nav.js` / `import-footer.js`, `urls-nav.txt` / `urls-footer.txt`. Never copy another locale's nav or footer.
- Footer languages: `language-switch` block (country's languages, authored links). Links go to the same path in each `{language}-{country}`, else its `/home`, else the authored link.
- Locales mirror fedex.com, not en-us: most en-us pages don't exist in other countries. Check the source before importing a tree.
- UI labels: `/{locale}/placeholders.json` via `scripts/placeholders.js` (header reads its control labels there). Keys kebab-case (`skip-to-main-content`; `skipToMainContent` would become `skiptomaincontent`). Uploaded sheet JSON needs `":type": "sheet"` or preview fails.
- Skills: `/plugin marketplace add adobe/skills`, then `aem-edge-delivery-services` (24 skills, incl. `docs-search`).

## fedex.com (source site)
- Bot-protected. `curl`, Node `fetch` and local headless Chromium get "FedEx | System Down".
- Use the Playwright MCP browser. Inspect the DOM with `browser_evaluate`.
- Assets (SVGs, images): `fetch()` from inside the loaded fedex.com page (same origin). `page.context().request` is blocked too.
- Bulk import (`run-bulk-import.js`) has its own fallback and works.
- Fonts fail to decode in the MCP browser. Computed styles are still correct; screenshots use fallback fonts.
