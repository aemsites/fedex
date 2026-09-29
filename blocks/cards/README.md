# Cards

One row per card. A cell holding only an image becomes the card image; all other cells form the card body. A paragraph holding only a plain link becomes a blue uppercase text CTA. Bold/italic links stay buttons.

| Cards (variant) | |
|---|---|
| image | ### Title, text, link |

## Variants
- *(none)*: grid of bordered cards
- `icon-links`: icon + single link per item, centered; the whole item is clickable (1 per row, all items in one row from 768px)
- `promo`: borderless image-top cards, 727:463 images, CTA pinned to the bottom (1 → 3 per row from 768px)
- `horizontal`: stacked list, 727:463 images; from 768px the image takes 1/4 on the left, the text 3/4. Square-ish icon artwork is shown whole (up to 120px), not cropped
- `icon`: icon left of a **heading** (author as H3), text and link; 1 column on mobile, 2 from 768px
- `centered`: modifier for `icon`: the icon sits on top and the text is centered, 3 per row from 768px. Example: `Cards (icon, centered)`
- `light`: light panel background (`--panel-color`, #fafafa), the same look as `Columns (light)`. With `promo`, each card body gets the panel instead of the whole block. Examples: `Cards (horizontal, light)`, `Cards (promo, light)`
- `logos`: centered grid of partner/retailer logos. One row per logo: an image, optionally linked (link the image itself, or put a link next to it in the row; the link text is not shown). Other text is ignored. Logos are contained, never cropped, at a consistent height (80px, 120px from 768px); no borders. 2 per row on mobile, 3 from 768px, 4 from 1024px (3, 6 or 9 logos stay 3 per row). Example: `Cards (logos)`

Promo with exactly 2 cards lays out 2 across from 768px. In promo, an italic/bold link button is pinned to the card bottom like the text CTA.

## Video cards
A media cell holding a poster image plus a link to a Kaltura video (`https://www.kaltura.com/index.php/extwidget/preview/partner_id/4296983/uiconf_id/55255333/entry_id/<entryId>`) becomes a click-to-play video (shared helper `scripts/video.js`). The player loads only after the click and doesn't autoplay when the user prefers reduced motion.

| Cards (promo) | |
|---|---|
| image + Kaltura link | ### Title, text |

The CTA is a blue uppercase link. It is underlined on hover and focus, and turns darker blue on hover. There is no motion.
