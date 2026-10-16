# Builds the `generic-landing` template (page-templates.json) and tools/importer/import-generic-landing.js
# (from import-generic-landing.js.tmpl). Edit this file, not the generated script.
# Block selectors: the union of the landing templates' selectors (first template wins the block order),
# plus the nl-nl additions below. URLs: tools/importer/urls-generic-landing.txt (pages, then the
# <page>.html?fragment=<n> URLs the import log reports as IMPORT_FRAGMENTS <path> <count>).
# Run from the repo root: python3 tools/importer/gen-generic-landing.py
import json

TPL = 'tools/importer/page-templates.json'
# comparison-landing is left out: its selectors were written for the one open-account page and are
# catch-alls elsewhere (any column_control_v1 with a col-sm-4 column = cards-icon, any row with a
# background colour = cards-horizontal, any column_control_v1 before an hr_v1 = table)
SOURCES = ['banner-landing', 'hub-landing', 'service-overview', 'guide-article']
DROP = set()
NOT_IN_BLOCK = ':not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *, .tabs_v1 *, .carousel_v1 *)'
# Shapes tagged by transformers/fedex-landing.js (tagShapes, mergeSplitRows) and the breadcrumb:
# their parsers claim first (FIRST below), before the generic column_control selectors read them.
TAGGED = {
    'breadcrumb': ['div.breadcrumbs_v1'],
    'banner': ['.root .column_control_v1[data-fedex-block="banner"]'],
    'cards-grid': ['.root .column_control_v1[data-fedex-block="cards-grid"]'],
    'columns-layout': ['.root .column_control_v1[data-fedex-block="columns-layout"]'],
}
FIRST = list(TAGGED)
EXTRA = {
    # dangerous-goods classes: [col-sm-3 icon (image or nested icon row) | col-sm-9 richtext]
    'cards-horizontal': [
        '.root .column_control_v1' + NOT_IN_BLOCK
        + ':not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide)):not(:has(> .row.fxg-row--has-bgcolor))'
        + ':has(> .row > .fxg-col.col-sm-3:first-child .image_v2 img)'
        + ':not(:has(> .row > .fxg-col:first-child :is(.title_v1, .richtext, .button_v1)))'
        + ':has(> .row > .fxg-col.col-sm-9:nth-child(2) > div > .aem-Grid > .richtext)'
        + ':not(:has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > :is(.title_v1, .image_v2, .button_v1, .column_control_v1)))'
        + ':not(:has(> .row > .fxg-col:nth-child(3)))',
    ],
    # icon options: 3-4 columns, each an icon (PNG/SVG, no photo) + text + link button and nothing
    # else; icon + link grids without text stay cards-icon-links (packaging, automotive)
    # (schedule-manage-pickups "Simplify shipping with FedEx pickup options", after
    # fedex-landing.js flattenIndentRows) -> Cards (icon, centered). The plain centered selector
    # leaves rows with buttons out; photo cards (cards-promo) carry titles or JPEG/WebP photos.
    'cards-icon': [
        '.root .column_control_v1' + NOT_IN_BLOCK
        + ':not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide))'
        + ':has(> .row > .fxg-col:nth-child(3)):not(:has(> .row > .fxg-col:nth-child(5)))'
        + ''.join(f':has(> .row > .fxg-col:nth-child({n}) > div > .aem-Grid > .image_v2 img:is([src*=".png"], [src*=".svg"]))'
                  f':has(> .row > .fxg-col:nth-child({n}) > div > .aem-Grid > .richtext)'
                  f':has(> .row > .fxg-col:nth-child({n}) > div > .aem-Grid > .button_v1)' for n in (1, 2, 3))
        + ':not(:has(> .row > .fxg-col > div > .aem-Grid > :is(.title_v1, .column_control_v1, .featured_offer_v2, .video_v1)))'
        + ':not(:has(> .row > .fxg-col > div > .aem-Grid > .image_v2 img:is([src*=".jpg"], [src*=".jpeg"], [src*=".webp"])))',
    ],
    # data tables (country pages, luxury-goods): div.table > table.fxg-table; any other table left in
    # the content (surcharges: table.cc-aem-c-table in div.fuelsurcharg-[dynamic-]datalookup), since a
    # raw table would become a bogus block. Tables in accordion answers / tabs are handled by those
    # parsers; tables inside other blocks are detached by their container's parser first.
    'table': [
        '.root div.table:not(.accordion_selector *, .tabs_v1 *, .fxg-desktop--hide, .fxg-desktop--hide *)',
        '.root table:not(.accordion_selector *, .tabs_v1 *, .fxg-desktop--hide *)',
    ],
    # EU homepage (nl-nl/home, authored control): the en-us homepage hero + shipping tools tabs
    # (parsers/hero.js, parsers/tabs-shipping.js, unchanged; same selectors as the home template)
    'hero': ['div.fxg-hero.fxg-hero_homepage > div.fxg-hero__image'],
    'tabs-shipping': ['div.fxg-hero__header > ul.fxg-cube-container'],
    # icon + link carousels (nl-nl/home "Beheer uw zendingen"), parsers/cards-icon-links.js; SVG icons
    # only - photo carousels (healthcare article teasers) stay default content
    'cards-icon-links': [
        '.root div.carousel_v1:has(.image_v2 img[src*=".svg"]):has(.button_v1 a):not(:has(.title_v1, .richtext))',
    ],
    # 3-up image cards whose columns are experience fragments (nl-nl/home "Tijdbesparende tips")
    'cards-promo': [
        '.root .column_control_v1' + NOT_IN_BLOCK
        + ':has(> .row > .fxg-col:nth-child(3)):not(:has(> .row > .fxg-col:nth-child(4)))'
        + ':has(> .row > .fxg-col:first-child > div > .aem-Grid > .experiencefragment .image_v2 img)'
        + ':has(> .row > .fxg-col:first-child > div > .aem-Grid > .experiencefragment .title_v1)'
        + ':has(> .row > .fxg-col:nth-child(3) > div > .aem-Grid > .experiencefragment .title_v1)',
    ],
    # the tracking pages' tracking app (en-to / en-us tracking): parsers/widget.js, /widgets/tracking.html
    'widget': ['.root div.trackingLandingContainer_v1'],
    # conditional forms (en-to ancillary-clearance-service country dropdown), marked in preprocess by
    # transformers/fedex-landing.js markConditionalForms; the comparison-landing choice panels
    # (open-account "How often do you ship?") are cards-promo's, inside a column_control_v1
    'content-select': ['.root div.conditionalform[data-fedex-options]:not(.column_control_v1 *)'],
    # last: plain multi-column rows nobody else claimed (parser leaves non-grids alone)
    'columns': [
        '.root .column_control_v1' + NOT_IN_BLOCK + ':not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide))',
    ],
}
PARSER_FILES = {
    'hero-landing': 'heroLanding', 'notification': 'notification', 'cards-icon': 'cardsIcon',
    'cards-icon-links': 'cardsIconLinks', 'cards-horizontal': 'cardsHorizontal',
    'columns-promo': 'columnsPromo', 'columns-steps': 'columnsSteps', 'cards-promo': 'cardsPromo',
    'tabs': 'tabs', 'cards-logos': 'cardsLogos', 'accordion': 'accordion', 'widget': 'widget',
    'table': 'table', 'columns': 'columns', 'hero': 'hero', 'tabs-shipping': 'tabsShipping',
    'breadcrumb': 'breadcrumb', 'banner': 'banner', 'cards-grid': 'cardsGrid',
    'columns-layout': 'columnsLayout', 'content-select': 'contentSelect',
}

d = json.load(open(TPL))
by_name = {t['name']: t for t in d['templates']}
blocks = {}
for src in SOURCES:
    for b in by_name[src]['blocks']:
        lst = blocks.setdefault(b['name'], [])
        for s in b['instances']:
            if s not in DROP and s not in lst:
                lst.append(s)
# logo carousels only: an article carousel (healthcare "Zorg: 3 strategieën voor succes", image +
# title link per slide) would lose its titles in cards-logos; it stays default content
blocks['cards-logos'] = [s.replace('.root div.carousel_v1:has(.image_v2 img)',
                                   '.root div.carousel_v1:has(.image_v2 img):not(:has(.title_v1, .button_v1 a))')
                         for s in blocks.get('cards-logos', [])]
# advanced tables are icon-link grids on the homepages (every cell an icon + link); a comparison
# table (en-us tracking/advanced "Which FedEx tracking tool is right for you?": text cells) is a
# data table, left to the table parser (the component is also div.table)
blocks['cards-icon-links'] = [s.replace('.root div.advanced_table_v1:not(.accordion_selector *)',
                                        '.root div.advanced_table_v1:not(.accordion_selector *):not(:has(td:not(:has(a[href]))))')
                              for s in blocks.get('cards-icon-links', [])]
# image-column steps: the image column holds only the image (international.html "Prep for a smooth
# trip"); a grid whose columns each open with a photo and go on with a title, text and nested
# icon rows (en-us sweepstakes "Check out some of our past sweepstakes") is not a steps row
STEPS_IMAGE_COL = ':has(> .row > .fxg-col:first-child > div > .aem-Grid > .image_v2)'
blocks['columns-steps'] = [s.replace(STEPS_IMAGE_COL, STEPS_IMAGE_COL
                                     + ':not(:has(> .row > .fxg-col:first-child > div > .aem-Grid > :is(.title_v1, .richtext)))')
                           for s in blocks.get('columns-steps', [])]
for name, sels in {**TAGGED, **EXTRA}.items():
    lst = blocks.setdefault(name, [])
    lst.extend(s for s in sels if s not in lst)
# table and columns run last (containers first; columns only sees what is left)
order = FIRST + [n for n in blocks if n not in FIRST + ['table', 'columns']] + ['table', 'columns']

urls = [l.strip() for l in open('tools/importer/urls-generic-landing.txt') if l.strip()]
template = {
    'name': 'generic-landing',
    'urls': [u for u in urls if '?fragment=' not in u],
    'coverageGaps': [
        'Forms (AEM forms div.start > form.fxg-forms, adaptive forms): no form block yet, fields dropped, text kept',
        'Standalone Kaltura video (div.video_v1 outside media-text rows): no video block yet',
        'Section styles: light / dark panels, jump links and centred intros (center-intro) are derived; other section looks are not',
    ],
    'description': 'Generic FedEx landing page (nl-nl shipping tree): title or photo hero, then container sections of icon cards, media-text rows, card grids, tabs, accordions, data tables and text; sections from the top-level page grid',
    'blocks': [{'name': n, 'instances': blocks[n]} for n in order],
    'representativeUrl': 'https://www.fedex.com/nl-nl/shipping.html',
}
d['templates'] = [t for t in d['templates'] if t['name'] != 'generic-landing'] + [template]
with open(TPL, 'w') as f:
    json.dump(d, f, indent=2, ensure_ascii=False)
    f.write('\n')

imports = '\n'.join(f"import {PARSER_FILES[n]}Parser from './parsers/{n}.js';" for n in order)
registry = '\n'.join(f"  '{n}': {PARSER_FILES[n]}Parser," for n in order)
script = open('tools/importer/import-generic-landing.js.tmpl').read()
script = (script.replace('__PARSER_IMPORTS__', imports)
          .replace('__PARSER_REGISTRY__', registry)
          .replace('__TEMPLATE__', json.dumps(template, indent=2, ensure_ascii=False)))
open('tools/importer/import-generic-landing.js', 'w').write(script)
print('blocks:', {n: len(blocks[n]) for n in order}, 'urls:', len(template['urls']))
