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

Example: `Columns (promo, light)`.

To put several blocks and/or default content on one shared panel, use the section style instead: Section Metadata `style | light`. A `light` block inside a `light` section doesn't draw a second panel.
