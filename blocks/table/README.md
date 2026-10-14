# Table

A data table at full content width. The first row is the header (bold `th` cells, plain, no fill); every row after it is a data row. Rows are separated by 1px lines in the border colour (`--border-color`); there is no shading or striping. Cells may hold text, links and lists.

| Table | | |
|---|---|---|
| Your need | Destination | FedEx® service |
| text | text | link |

A cell holding only a check mark (`✓`, `✔`, or a single icon/image) is centered, and so is its column header, e.g. for a feature comparison (feature | ✓ | ✓).

On mobile the table keeps a minimum width and scrolls horizontally inside the block (the page itself never scrolls sideways). The scroll area is keyboard focusable and named after the nearest heading before the table.

To put a table inside an Accordion answer, author the table in a fragment and put only the fragment link in the answer cell (see Accordion).

## Variants
- *(none)*: plain data table
- `brand`: brand-purple header row (`--dark-color`) with white, centered 14px medium labels; 14px body text, no row lines, cells centered vertically. An icon authored before a cell's text (e.g. `clock-icon SNELHEID` in the first column) is shown inline at 30px, centered on the text. From 768px the cells have 20px / 35px padding and the table is inset 15px (940px wide). Author the labels as they should read (e.g. uppercase). Example: nl-nl `/shipping/freight-services` "Vind de juiste vrachtservice".

| Table (brand) | | |
|---|---|---|
| What matters most? | Best choice | Delivery |
| icon LABEL | **Service** | text |
|  | **Service** | text |
