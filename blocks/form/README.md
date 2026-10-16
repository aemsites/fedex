# Form

Vendored from [adobe-rnd/aem-boilerplate-forms](https://github.com/adobe-rnd/aem-boilerplate-forms/tree/main/blocks/form) (kept as published, excluded from ESLint and Stylelint). Project changes:

- the reference block's `:root` variables and `*` reset are scoped to `main .form`, so they do not override the site tokens on pages with a form;
- a FedEx theme at the end: 14px medium labels above 56px square fields, an orange uppercase submit button, no card around the form;
- section style `classic-form` (Section Metadata `Style: classic-form` on the form's section): fedex.com's classic `fxg-forms` look (en-to customer-support/write-to-fedex): label right above each field, 100px field pitch, 8px control inset with black text, dark asterisk, FedEx chevron on selects, 153px message box, centred submit button sized to its text. A section style rather than a variant because the form block takes none;
- `util.js` `createRadioOrCheckboxUsingEnum`: sheet-based radio and checkbox groups have no `properties`, which threw (`fd.properties || {}`; en-us dropbox maintenance request).

## Authoring

A one-cell block linking the form definition, a sheet (`:type: sheet`) with one row per field (`Name`, `Type`, `Label`, `Placeholder`, `Mandatory`, `Options`, `Fieldset`, …). A `fieldset` row groups the rows naming it in `Fieldset` under its label; `radio-group` takes comma-separated `Options` and a default `Value`:

| Form |
| --- |
| [/en-us/forms/accessibility-feedback.json](/en-us/forms/accessibility-feedback.json) |

Never use variants (`Form (contact)`): the fields come from the sheet. Submissions are posted to the sheet's path until a submission target is configured.
