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
- Skills: `/plugin marketplace add adobe/skills`, then `aem-edge-delivery-services` (24 skills, incl. `docs-search`).

## fedex.com (source site)
- Bot-protected. `curl`, Node `fetch` and local headless Chromium get "FedEx | System Down".
- Use the Playwright MCP browser. Inspect the DOM with `browser_evaluate`.
- Assets (SVGs, images): `fetch()` from inside the loaded fedex.com page (same origin). `page.context().request` is blocked too.
- Bulk import (`run-bulk-import.js`) has its own fallback and works.
- Fonts fail to decode in the MCP browser. Computed styles are still correct; screenshots use fallback fonts.
