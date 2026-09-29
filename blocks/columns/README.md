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

A column holding a poster image plus a link to a Kaltura video (`https://www.kaltura.com/index.php/extwidget/preview/partner_id/4296983/uiconf_id/55255333/entry_id/<entryId>`) becomes a click-to-play video column (shared helper `scripts/video.js`), e.g. in `Columns (promo)`. The player loads only after the click and doesn't autoplay when the user prefers reduced motion.

Example: `Columns (promo, light)`.

To put several blocks and/or default content on one shared panel, use the section style instead: Section Metadata `style | light`. A `light` block inside a `light` section doesn't draw a second panel.
