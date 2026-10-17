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

**Two-level FAQ** (`groups`, en-to customer-support): each row is a category whose answer is a fragment holding another Accordion of questions. The importer sets `groups` on the outer block; on pages imported before that, accordion.js adds it as soon as a category's fragment turns out to hold an Accordion. As on fedex.com: `#8e8e8e` rules above the first category and below each one, 64px category rows with a 16px 32px padding at every width (24px light from 768px, 20px below; the chevron 32px from the right), the open category a light grey panel (`--panel-color`) with a regular-weight label, and its questions starting a quarter of the way in (fedex.com's 2-of-8 column offset: `(width - 64px) / 4`) and running to the right edge. Questions are white rows with a `#8e8e8e` top rule: 20px light labels (regular when open), 16px 48px padding, 64px rows, a 24px "+" icon that turns into "-" when open, 8px after the text. Labels are flex rows whose text box (`.accordion-item-label-text`, which every label gets) has fedex.com's 1.3 line-height (26px for questions, 31.2px for categories) and is centred vertically. Answers: 0 48px 16px, paragraphs 4px/8px, lists 0 0 16px with a 32px indent. Single-level accordions are unchanged.

| Accordion (groups) | |
|---|---|
| Category | /{locale}/fragments/…/category (link only; the fragment holds an Accordion of questions) |

## Variants
- `groups`: a two-level FAQ, each row a category whose fragment answer holds an Accordion of questions (see above).
