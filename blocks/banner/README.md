# Banner

A one-row promo panel: an icon on the left, a title with text in the middle and a call to action on the right, vertically centered. On mobile the three parts are stacked and centered.

| Banner (variant) | | |
|---|---|---|
| icon image (96x96) | ### title, text | ***CTA*** |

The CTA follows the usual button formatting: ***bold italic*** = orange outline (accent), **bold** = orange (primary), *italic* = blue pill (secondary). A plain link stays a link. Cells are optional. The block sorts the content by kind, so it can also be authored in one or two cells: the first image (or `:icon:`) is the icon, the link-only paragraphs at the end become the CTA, and everything else is the text. Without an icon or CTA, the text takes the free space.

## Variants
- *(none)*: light panel (`--panel-color`, #fafafa), 936px wide and centered. The columns are 2/12 icon, 6/12 text, 4/12 CTA, and the title is 25px. Example: nl-nl/shipping "Verzend slimmer met tips van experts".
- `dark`: brand purple panel (`--dark-color`) across the full 970px content width, with white text and links. The columns are 3/12 icon, 6/12 text, 3/12 CTA, and the title is 21px. An *italic* CTA is a white outline pill that fills white with purple text on hover. Example: `Banner (dark)` on nl-nl/shipping/freight-services "Vracht verzenden met FedEx". A `dark` banner with an h2 title (`## title`; fedex.com APAC's "Open a FedEx account and enjoy more benefits." column row, en-to `/shipping` and `/customer-support`) follows that source instead: columns 2/12, 6/12, 4/12, top-aligned (45px above the icon and the CTA, 60px below the text), a 90px icon, a 25px regular title with a 40px top and 20px bottom margin and the text's 4px top margin (they add up to 24px, as on the source), and an orange **bold** button without a border (300px wide on mobile).

Small print in the title ("Verzend naar Azië vanaf € 16,67 excl. btw") is authored as subscript and shown as 14px text on the baseline.
