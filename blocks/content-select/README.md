# Content Select

A dropdown that shows the content of the chosen option below it, e.g. the clearance fees or the holiday schedule of a country. Nothing is shown until an option is chosen; each option's content is loaded when it is chosen.

| Content Select | |
|---|---|
| Select Country/Territory | |
| Australia | link to /fragments/ancillary/en-us/au |
| Austria | link to /fragments/ancillary/en-us/at |

- Row 1: the prompt, shown as the dropdown's label and its empty choice.
- Every further row is an option: its label, then a link to a fragment holding its content (or the content itself).

A link to the page whose hash names an option's fragment opens that option: `/en-to/about/holiday-schedule#en_to` opens the option linking `/fragments/holiday/en-to` (`_` and `-` are the same).

The importer builds the block from fedex.com's conditional forms (`div.conditionalform`, `tools/importer/parsers/content-select.js`); the component-library pages the options load become the fragments `/fragments/<path>` (`/content/fedex-com/component-library/ancillary/en_us/au.html` -> `/fragments/ancillary/en-us/au`).

## Variants
- *(none)*
