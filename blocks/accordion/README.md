# Accordion

Stacked expandable rows (native `details`/`summary`): bordered rows, label left, chevron right, content width. Use it for FAQs and for service rows with rich panels.

| Accordion | |
|---|---|
| Question / label | Answer: paragraphs, #### subheads, links |
| Question / label | Answer |

One row per item. The first cell is the label and the other cells form the body. A row without a label is dropped. A row with an empty body shows only its label. Rows start closed and open independently. The chevron doesn't animate when the user prefers reduced motion.

Labels follow fedex.com in every locale: 24px light (line-height 1.15) with a 32px inset and ~64px rows from 768px, 20px light with a 16px inset on mobile. The body text lines up with the label text. The chevron is 24 × 12px, 32px from the right edge from 768px.

A label may start with a small icon image (e.g. freight's "Find the right freight service"). It is shown inline before the label text at 32px (`--icon-size-m`), and treated as decorative. The chevron is unchanged.

An answer cell holding **only a link to a fragment** (a path with a `fragments` folder, e.g. `/en-us/fragments/freight-services-table`) loads that fragment into the answer the first time the row opens (shared `blocks/fragment/fragment.js`). Use this to put blocks such as Table inside an answer. If the fragment can't be loaded, the link stays.

| Accordion | |
|---|---|
| icon, Label | Answer |
| Label | /en-us/fragments/… (link only) |

**Two-level FAQ** (en-to customer-support): when a fragment answer holds another Accordion, the outer row is a category. Open, its label and panel turn light grey (`--panel-color`) with a regular-weight label, and the questions start a quarter of the way in (fedex.com's 2-of-8 column offset: `(width - 64px) / 4`) and run to the right edge. Questions are white rows with a `#8e8e8e` top rule (no bottom rule): 20/26px light labels (regular when open), 16px/48px insets, 64px rows, a 24px "+" icon that turns into "-" when open, 48px from the right. Answers: 0 48px 16px, paragraphs 4px/8px, lists 0 0 16px with a 32px indent. CSS-only, scoped to `.accordion .accordion` and the item whose body holds an accordion; single-level accordions are unchanged. The category label keeps the single-level insets (on mobile fedex.com uses 32px, but that isn't known until the fragment has loaded).

| Accordion | |
|---|---|
| Category | /{locale}/fragments/…/category (link only; the fragment holds an Accordion of questions) |

## Variants
- *(none)*
