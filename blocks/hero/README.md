# Hero

Full-bleed background image behind a centered heading. The background covers the whole section, so a block that follows in the same section (e.g. Tabs Shipping) sits on top of it.

| Hero (variant) |
|---|
| image, # Heading, optional text/CTA, optional link to an .mp4 |

Project decision: authored as one row, one cell. The standard two-row layout (image row, then heading row) is also supported. All cells are merged. An `.mp4` link becomes a muted, looping background video (skipped when the user prefers reduced motion).

## Variants
- *(none)*: full-bleed background image, centered white heading (homepage)
- `landing`: landing-page intro. Text (H1, text, **CTA**) sits left on a light band, and the photo fills the right half with a diagonal edge. On mobile the photo is stacked above the text. Example: `Hero (landing)`.
- `purple`: modifier for `landing`, for banner images that already contain the purple-to-orange gradient, the diagonal and the photo (e.g. the 1200x350 customer-support banners). From 768px the picture fills the whole block (anchored right, at least 350px tall) behind white, left-aligned text, with no light band and no diagonal clip; the fallback background is brand purple. Below 768px the picture is hidden and the text is centered, dark on white, with a full-width button. A **bold** link stays the orange primary button; a plain link is white and underlined. Example: `Hero (landing, purple)`.
- `full-image`: modifier for `landing`, for light banner images that already contain the white fade, the diagonal and the photo (nl-nl landing pages, 1200x350 / 2400x700). From 768px the picture fills the whole block (at least 350px tall, anchored right) behind dark, left-aligned text; no light band and no diagonal clip. On mobile the photo end of the banner is stacked above the text, as in `landing`. Example: `Hero (landing, full-image)`.
