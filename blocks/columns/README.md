# Columns

Each row is a row of columns (max 4). A cell holding only an image becomes an image column. A row with a single cell spans the full width (e.g. footnotes + a button). A paragraph holding only a plain link becomes a blue uppercase text CTA.

| Columns (variants) | |
|---|---|
| text | image |
| optional full-width row | |

## Variants (combinable)
- `feature`: each `h3` + the text after it becomes a feature item; image on top on mobile, text left + image right with a 2-up feature grid from 768px
- `promo`: text + image promo; the image bleeds to the panel edge (44% wide from 768px), the text column carries the inset
- `light`: light panel background (`--panel-color`, #fafafa) on this block only
- `steps`: image column beside an intro paragraph, an ordered list shown as circled numbered steps, and an optional small-print footnote paragraph after the list; 30% image from 768px

| Columns (steps) | |
|---|---|
| image | intro, 1. step, 2. step, 3. step, footnote |

`steps` can also be authored as **one cell** (no image column). The steps are then centered in a ~620px column (`--content-narrow-width-s`) at body text size, with 58px circles (`--icon-size-step`) from 768px. The intro may be a paragraph plus a bulleted list. Each step may have a title, a description paragraph and a nested bulleted list (description and sub-bullets are 14px); paragraph margins in loose lists are removed. The circled numbers come from CSS; don't author number images.

| Columns (steps) |
|---|
| intro, bullets, 1. title / description / sub-bullets, 2. ... |

- `overlay`: modifier for `promo`. From 768px the image fills the whole row (970:494, cover) and the text sits on a ~390px translucent white panel (`--overlay-panel-color`) over it, vertically centered and inset 40px from the edge. The cell order sets the panel side: text second = panel right, text first = panel left. On mobile the image is stacked above the text with no translucency. Example: `Columns (promo, overlay)`

| Columns (promo, overlay) | |
|---|---|
| image | ### heading, text, *outlined CTA* |

- `centered`: short, centered columns, each `#### title`, a paragraph and a CTA paragraph (`*link*` = outlined pill button). From 768px the columns sit side by side in a 912px area (3 × 288px, 24px gaps) and each CTA is pushed to the bottom of its column, so the buttons line up even when the texts differ in length. Titles are 20px regular. Put it in a `dark` section for the purple band with white outline buttons (nl-nl `/shipping` "Bereken uw tarieven | Open een account | Vraag een ophaling aan"); on the band the block uses the source spacing (36px above the titles, 44px below the buttons, ~277px band).

| Columns (centered) | | |
|---|---|---|
| #### title, text, *CTA link* | #### title, text, *CTA link* | #### title, text, *CTA link* |

- `one-third`: image | text. From 768px the image column takes 1/3 and the text 2/3 (each with a 12px inset), tops aligned; the `##` heading keeps the 40px section-title gap below it, then a paragraph and an optional bulleted list. On mobile the image (max 300px, centered) sits above the text. Example: nl-nl `/shipping/freight-services` "Wij maken vrachtvervoer eenvoudiger dan u denkt".

| Columns (one-third) | |
|---|---|
| image | ## heading, text, bullets |

- `divided`: two titled columns with a 1px vertical rule between them from 768px (stacked, no rule, on mobile). Each column starts with a centered `### title`. An ordered list shows purple circled numbers (the same CSS as `steps`, 48px circles, no number images); a bulleted list whose items each start with an icon image shows the icon (53px) left of the item's bold title paragraph and text paragraph, without bullets. Example: nl-nl `/shipping/freight-services` "Hoe verzendt u uw vracht | Wat kan ik verzenden?".
- `icon-lists`: columns of photo, `### title`, text and a bulleted list whose items each start with an icon image: the icon (30px) sits left of its one-line text, without bullets (the icon list of `divided`, without the rule). Example: en-us `/sweepstakes` "Check out some of our past sweepstakes" (the prizes per sweepstakes).
- `teasers`: a row holding only a link to a page of this site becomes [text | image] from that page: its title, description and the link as CTA (`*link*` = outlined button), then its image (metadata Image). Combine with the layout variants, e.g. `Columns (promo, light, teasers)` (en-us `/sweepstakes`: the current sweepstakes, read from its page). A row whose page does not exist is dropped. See `Cards (teasers)` for the link label rules.

| Columns (divided) | |
|---|---|
| ### title, 1. **Step** text, 2. … | ### title, • icon / **Title** / text, • … |

A column holding a poster image plus a link to a Kaltura video (`https://www.kaltura.com/index.php/extwidget/preview/partner_id/4296983/uiconf_id/55255333/entry_id/<entryId>`) becomes a click-to-play video column (shared helper `scripts/video.js`), e.g. in `Columns (promo)`. The player loads only after the click and doesn't autoplay when the user prefers reduced motion.

Example: `Columns (promo, light)`.

To put several blocks and/or default content on one shared panel, use the section style instead: Section Metadata `style | light`. A `light` block inside a `light` section doesn't draw a second panel.
