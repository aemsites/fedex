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
- `centered`: modifier for `icon`: the icon sits on top and the text is centered across the full card width, 3 per row from 768px; a single card sits in the middle third, 2 cards take half the row each. Example: `Cards (icon, centered)`. With `promo`, the card text and CTA/button are centered. Example: `Cards (promo, light, centered)`. Without `light`, images keep their natural aspect ratio (never cropped; artwork narrower than the card, e.g. a 112px icon, shows at its own size, centred), the title is large and light (24px, 32px from 768px), 24px below the image and 20px above the text (36px and 28px from 768px); the CTA follows the text instead of being pinned to the bottom. Primary (bold) buttons are 300px wide (long labels wrap); outlined (italic) buttons fit their label. Example: `Cards (promo, centered)`
- `large`: modifier for `icon, centered`: 144px round photos (author any photo; it is cropped to a circle) and a light 24px title. Author the title as a linked H3 (`### [Title](link)`): it shows as dark underlined text. From 768px the title keeps room for two lines so the texts line up. Example: `Cards (icon, centered, large)`
- `two-columns`: modifier for `icon, centered`: 96px icons, large light titles (24px, 32px from 768px), 2 per row from 768px. Example: `Cards (icon, centered, two-columns)`; with `promo`: 2 cards per row from 768px (e.g. 4 cards as 2 x 2). `Cards (promo, centered)` with exactly 4 cards shows them 2 x 2 from 768px and 4 across from 1024px
- `small-icons`: modifier for `icon, centered`: 40px icons (e.g. step numbers 1-2-3), the height follows the artwork. The importer sets it when the source icons are 20% of the column or less. Example: `Cards (icon, centered, small-icons)`
- `big-icons`: modifier for `icon, centered`: 112px illustrations, the height follows the artwork. The importer sets it when the source icons are 45% of the column or more. Example: `Cards (icon, centered, big-icons)`
- `photos`: modifier for `icon, centered`: full-width photo cards instead of icons. The photo spans the card at its natural aspect ratio (not cropped, square corners; loaded at a 750px rendition), the title (H3) is regular-weight 20px, 20px below the photo, the text follows 14px below; 1 per row on mobile, 3 per row from 768px. Photos may also sit between the texts of a single cell (`### Title`, text, image, text, image …, as the source's step-by-step examples): they span the card the same way (750px rendition), with 8px above an image and 4px below it, 12px between paragraphs. A bold paragraph (`**Title**`) instead of an H3 gives a 16px bold caption. A card holding only a photo and a link (`image | [Small Box](/…)`, as the packaging overview) shows the link as a caption: 16px light, underlined, in the text colour and authored case, lined up across the row below photos at 90% of the card. The importer sets it when every image is a JPEG/WebP photo at 90% or more of its column. Example: `Cards (icon, centered, photos)`
- `three-columns`: modifier for `icon`: 3 per row from 1024px (2 from 768px). Example: `Cards (icon, three-columns)`
- `compact`: modifier for `horizontal`: small icon artwork instead of photos (80px, 96px from 768px) and a bold 20px title with the text and CTA close below it. From 768px the icon is centered in a 1/6 column on the left. With `light`, each row gets its own panel and the title is 18px. Examples: `Cards (horizontal, compact)`, `Cards (horizontal, light, compact)`
- `large` with `horizontal`: the titles are 32px light from 768px (24px on mobile), for sources with default-size titles. Example: `Cards (horizontal, large)`. With `icon, centered`, an unlinked title is 32px from 768px
- `icon-right`: modifier for `horizontal`: from 768px the image/icon sits on the right (1/6 column, vertically centered) and the text on the left. Keep the image as the first cell; on mobile it stays above the text. Example: `Cards (horizontal, light, compact, icon-right)`
- `arrows`: adds a decorative chevron (›) after each text CTA. With `promo`, the CTA ends in an orange ">" instead. Examples: `Cards (icon-links, arrows)`, `Cards (promo, centered, arrows)`
- `light`: light panel background (`--panel-color`, #fafafa), the same look as `Columns (light)`. With `promo`, each card body gets the panel instead of the whole block. Examples: `Cards (horizontal, light)`, `Cards (promo, light)`
- `logos`: centered grid of partner/retailer logos. One row per logo: an image, optionally linked (link the image itself, or put a link next to it in the row; the link text is not shown). Other text is ignored. Logos are contained, never cropped, at a consistent height (80px, 120px from 768px); no borders. 2 per row on mobile, 3 from 768px, 4 from 1024px (3, 6 or 9 logos stay 3 per row). Example: `Cards (logos)`
- `teasers`: cards read from the pages they link to, combined with any layout variant. Author one row per card holding only a link to a page of this site; the block shows that page's image (metadata Image), title (its Title without " | FedEx") and description. A link labelled with the bare URL or path (`/en-us/shipping/how-to-ship-a-bike`) makes the title the link; any other label is the CTA (`*link*` = outlined button, as usual). A row whose page does not exist is dropped. Each card gets the page name as id, so `#how-to-ship-a-bike` jumps to it. Use it for listings of detail pages (en-us `/how-to-hub/articles`): title, text and image stay with the detail page. Examples: `Cards (promo, teasers)`, `Cards (horizontal, light, teasers)`

Icon-links with a description: put a text paragraph after the link (`icon | link, description`). The icons are larger (96px, 128px from 768px) and the description sits below the link as plain text. Only the icon and the link are clickable; the description is not part of the link.

| Cards (icon-links, arrows) | |
|---|---|
| icon | link, description |

Promo with exactly 2 cards lays out 2 across from 768px. In promo, an italic/bold link button is pinned to the card bottom like the text CTA.

## Video cards
A media cell holding a poster image plus a link to a Kaltura video (`https://www.kaltura.com/index.php/extwidget/preview/partner_id/4296983/uiconf_id/55255333/entry_id/<entryId>`) becomes a click-to-play video (shared helper `scripts/video.js`). The player loads only after the click and doesn't autoplay when the user prefers reduced motion.

| Cards (promo) | |
|---|---|
| image + Kaltura link | ### Title, text |

The CTA is a blue uppercase link. It is underlined on hover and focus, and turns darker blue on hover. There is no motion.

In `icon, centered` cards, a CTA that jumps within the page (a link to `#section-id`, alone in its paragraph, e.g. "Explore on-call pickups") is a medium-weight blue 16px text link in the authored case instead (not uppercase), after a small blue down arrow (↓, decorative, not underlined), with the same hover and focus. CTAs to other pages keep the uppercase look.
