# Form

Vendored from [adobe-rnd/aem-boilerplate-forms](https://github.com/adobe-rnd/aem-boilerplate-forms/tree/main/blocks/form) (kept as published, excluded from ESLint and Stylelint). Project changes in `form.css` only:

- the reference block's `:root` variables and `*` reset are scoped to `main .form`, so they do not override the site tokens on pages with a form;
- a FedEx theme at the end: 14px medium labels above 56px square fields, an orange uppercase submit button, no card around the form.

## Authoring

A one-cell block linking the form definition, a sheet (`:type: sheet`) with one row per field (`Name`, `Type`, `Label`, `Placeholder`, `Mandatory`, `Options`, …):

| Form |
| --- |
| [/en-us/forms/accessibility-feedback.json](/en-us/forms/accessibility-feedback.json) |

Never use variants (`Form (contact)`): the fields come from the sheet. Submissions are posted to the sheet's path until a submission target is configured.
