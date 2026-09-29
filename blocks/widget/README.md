# Widget

Embeds a self-contained widget from the `/widgets/` folder, e.g. the rate calculator.

| Widget |
|---|
| link to /widgets/rate-calculator.html |

The block fetches `<name>.html` into itself, then loads `<name>.css` and runs the default export of `<name>.js`. The widget name replaces `widget` as the block class (and on the section wrapper and container), so each widget styles itself. Query parameters on the link become `data-` attributes on the widget. Widgets in subfolders work too (`/widgets/<folder>/<name>.html`).

Available widgets: `rate-calculator` (static placeholder panel with a CTA to the FedEx rating app).

## Variants
- *(none)*
