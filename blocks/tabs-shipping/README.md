# tabs-shipping

Custom **tabs** block. Purpose: shipping-tools.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: 2 columns, 1 row per tab. Cell 1 = icon + tab label, e.g. `:track: Track` (icons live in /icons: rate-ship, track, locations); bold label = default tab. Cell 2 = panel content: a list of quick links and/or a paragraph + CTA link. Rows: (1) 'Rate & Ship' | links: Get a quote (https://www.fedex.com/en-us/online/rating.html), Ship now (https://www.fedex.com/en-us/shipping/ship-manager/login.html). (2) 'Track' | 'Enter a FedEx tracking number to review shipping details.' + CTA 'Track' (https://www.fedex.com/fedextrack/); mark it as the default active tab, as on the source. (3) 'Locations' | links: FedEx locations (https://local.fedex.com/en-us), Contact support (https://www.fedex.com/en-us/customer-support.html)..

## Layout notes

Tiles: 158 x 120px from 768px (115 x 102 on mobile), the selected tile is purple and rises above and below the row. The Track panel's FedEx tracking link becomes a tracking form (input + TRACK).

fedex.com "cube" widget (en-to, nl-nl homes; detected in CSS when the Track panel holds only the tracking link, en-us has an intro text before it): tiles 10px lower under the heading (7px on mobile), the selected tile rises 15px above and 5px below the row (7/3 on mobile) with its icon and label in line with the others, the form 58px below the tiles (56 on mobile) and the hero section ends 40px below the form (10 on mobile). The input text is black 20px with a 10px inset and a 16px placeholder, the form gap is 10px, and TRACK has no minimum width and a 15px arrow (same arrow as the header). en-us is unchanged.

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)
