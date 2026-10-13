# Your Project's Title...
Your project's description...

## Environments
- Preview: https://main--fedex--aemsites.aem.page/
- Live: https://main--fedex--aemsites.aem.live/

## Documentation

Before using the aem-boilerplate, we recommand you to go through the documentation on https://www.aem.live/docs/ and more specifically:
1. [Developer Tutorial](https://www.aem.live/developer/tutorial)
2. [The Anatomy of a Project](https://www.aem.live/developer/anatomy-of-a-project)
3. [Web Performance](https://www.aem.live/developer/keeping-it-100)
4. [Markup, Sections, Blocks, and Auto Blocking](https://www.aem.live/developer/markup-sections-blocks)

## Installation

```sh
npm i
```

## Linting

```sh
npm run lint
```

## Translated UI labels

Author a `placeholders` sheet in each locale folder with `Key` and `Text` columns,
published as `/{locale}/placeholders.json` (EDS JSON with a `data` array).
The `/en-us/placeholders.json` sheet is required and supplies fallback values for
keys missing from a locale sheet.

```js
import { fetchPlaceholders } from '../../scripts/placeholders.js';

const labels = await fetchPlaceholders();
input.placeholder = labels.trackingId;
input.setAttribute('aria-label', labels.trackingId);
```

Keys such as `tracking-id` or `Tracking ID` become `trackingId`. Values remain
plain strings; use `textContent` for visible labels, not `innerHTML`.
The helper resolves the locale from the page path, including the local `/content`
prefix. An optional page pathname can be passed explicitly. Requests are cached
and shared across blocks. A missing locale sheet (404) logs a warning and uses
English; other HTTP, network, and malformed-data errors reject and can be retried.
A key absent from both sheets remains undefined; consumers must report missing
required labels. Page-specific text and CTA labels should stay in localized
authored content.

## Local development

1. Create a new repository based on the `aem-boilerplate` template
1. Add the [AEM Code Sync GitHub App](https://github.com/apps/aem-code-sync) to the repository
1. Install the [AEM CLI](https://github.com/adobe/helix-cli): `npm install -g @adobe/aem-cli`
1. Start AEM Proxy: `aem up` (opens your browser at `http://localhost:3000`)
1. Open the `fedex` directory in your favorite IDE and start coding :)
