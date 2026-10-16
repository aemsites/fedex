# Breadcrumb

The page trail in a 30px light-gray bar (`--light-color`, #f2f2f2) right under the header, aligned with the content column, from 993px wide; up to 992px it is hidden (with its section, when the section holds nothing else), as on fedex.com in every locale. Links are bold, the current page is regular, and "›" separators are drawn by CSS. It renders as `<nav aria-label="Breadcrumb">` with an ordered list, and the last item gets `aria-current="page"`.

| Breadcrumb |
|---|
| bulleted list: [Home](/nl-nl/home), [Verzenden](/nl-nl/shipping), Vrachtzendingen |

Put it alone in the first section of the page, above the hero section. That section drops the normal section spacing and gets the gray band, and the next section starts right below it. Instead of a list, the trail can also be links (and a last plain-text paragraph) in paragraphs or in separate cells. The nav label comes from the `breadcrumb` key in `/{locale}/placeholders.json`; without that key it is "Breadcrumb".

## Variants
- *(none)*
