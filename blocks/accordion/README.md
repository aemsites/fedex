# Accordion

Stacked expandable rows (native `details`/`summary`): bordered rows, label left, chevron right, content width. Use it for FAQs and for service rows with rich panels.

| Accordion | |
|---|---|
| Question / label | Answer: paragraphs, #### subheads, links |
| Question / label | Answer |

One row per item. The first cell is the label and the other cells form the body. A row without a label is dropped. A row with an empty body shows only its label. Rows start closed and open independently. The chevron doesn't animate when the user prefers reduced motion.

A label may start with a small icon image (e.g. freight's "Find the right freight service"). It is shown inline before the label text at 32px (`--icon-size-m`), and treated as decorative. The chevron is unchanged.

An answer cell holding **only a link to a fragment** (a path with a `fragments` folder, e.g. `/en-us/fragments/freight-services-table`) loads that fragment into the answer the first time the row opens (shared `blocks/fragment/fragment.js`). Use this to put blocks such as Table inside an answer. If the fragment can't be loaded, the link stays.

| Accordion | |
|---|---|
| icon, Label | Answer |
| Label | /en-us/fragments/… (link only) |

## Variants
- *(none)*
