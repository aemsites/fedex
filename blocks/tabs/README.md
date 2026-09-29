# Tabs

Generic tabbed content, e.g. the billing-online "Check out billing resources and guides" panels. One row per tab: the first cell is the tab label, the second cell is the panel content (headings, paragraphs, lists, links and images). Extra cells are merged into the panel. Rows without a label are skipped.

| Tabs | |
|---|---|
| Tab label | panel content |
| Tab label | panel content |

The tab labels sit in a row; the active tab is bold with a purple underline. When the labels don't fit (mobile), the row scrolls horizontally. The first tab is open on load.

Accessibility: an ARIA `tablist` of `tab` buttons, each controlling a `tabpanel`. Only the selected tab is in the tab order. Left/Right arrows move to the previous/next tab (wrapping), Home/End jump to the first/last tab, and the panel follows the focused tab.

Not the same as Tabs Shipping (`blocks/tabs-shipping`), which is the homepage tool tiles.

## Variants
- *(none)*: underline tabs
