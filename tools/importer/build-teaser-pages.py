# Builds tools/importer/teaser-pages.js: the detail pages that a listing teases AND that are
# imported with the generic-landing importer (tools/importer/urls-generic-landing.txt: it is the one
# that writes the teaser image as metadata Image), with the listing's teaser image. A page teased
# by several listings with different photos keeps the image it already has in teaser-pages.js (so
# a rebuild does not change published teasers), else the first teaser's (link alone, the
# component's only target).
#  - transformers/fedex-teasers.js uses it twice: a detail page gets that image as its metadata Image
#    (fedex.com's og:image is the FedEx logo on every page), and a listing's teaser blocks become
#    link-only `teasers` rows that blocks/cards and blocks/columns fill from the detail page.
#  - A teaser whose detail page is not migrated stays an authored teaser.
# Input: tools/importer/teasers-collected.json, the output of collect-teasers.js run in a fedex.com
# page on every migrated en-us page (any page can tease another). Re-run both after adding URLs.
#  - Each page also gets its current title and description (from its preview on
#    main--fedex--aemsites.aem.page, as scripts/teasers.js reads them): a listing card with its own
#    copy (en-to about "FedEx History in APAC") stays authored (fedex-teasers.js).
# Run from the repo root: python3 tools/importer/build-teaser-pages.py
import concurrent.futures
import html
import json
import re
import urllib.request

collected = json.load(open('tools/importer/teasers-collected.json'))
migrated = set()
for f in ['tools/importer/urls-generic-landing.txt']:
    for line in open(f):
        line = line.strip()
        if line.startswith('https://www.fedex.com/') and '?' not in line:
            migrated.add(re.sub(r'\.html$', '', line[len('https://www.fedex.com'):]))

previous = {}
try:
    text = open('tools/importer/teaser-pages.js').read()
    previous = json.loads(text[text.index('{'):text.rindex('}') + 1])
except (FileNotFoundError, ValueError):
    pass


# a detail page's link back to a listing that teases it (how-to-ship-computers "Have other specialty
# items to ship? Go to the hub" -> how-to-hub) is a promo with its own copy, not a teaser of the
# listing (the one of the two that teases more pages)
def teases(listing, path):
    return any(t['listing'] == listing and t.get('teaser', True) for t in collected.get(path, []))


teased_by = {}
for path, teasers in collected.items():
    for t in teasers:
        if t.get('teaser', True):
            teased_by.setdefault(t['listing'], set()).add(path)


def back_link(path, listing):
    return teases(path, listing) and len(teased_by.get(path, ())) > len(teased_by.get(listing, ()))


pages = {}
for path, teasers in sorted(collected.items()):
    if path not in migrated:
        continue
    teasers = [t for t in teasers if not back_link(path, t['listing'])]
    if not teasers:
        continue
    # the image comes from a teaser (link alone, the component's only target), not from a photo
    # beside a link in running text; no teaser, no image (the listings still read the page)
    first = next((t for t in teasers if t.get('teaser', True)), {'image': '', 'alt': ''})
    kept = previous.get(path, {}).get('image')
    if kept:
        first = next((t for t in teasers if t['image'] == kept), {**first, 'image': kept, 'alt': previous[path].get('alt', '')})
    pages[path] = {
        'image': first['image'],
        'alt': first['alt'],
        'listings': sorted({t['listing'] for t in teasers}),
    }
    # a featured offer's own copy (collect-teasers.js) becomes the detail page's Description, so
    # the listing's teaser shows the text fedex.com shows there
    description = next((t['description'] for t in teasers if t.get('teaser', True) and t.get('description')), '')
    if description:
        pages[path]['description'] = description
    # the listings showing it as a featured offer (only those carry their own copy): `featured`
    featured = sorted({t['listing'] for t in teasers if t.get('teaser', True) and t.get('description')})
    if featured:
        pages[path]['featured'] = featured



# the page's title and description as the teaser shows them (scripts/teasers.js: og:title without
# the site suffix, description); a page that is not previewed yet keeps the ones it had
def page_copy(path):
    try:
        with urllib.request.urlopen(f'https://main--fedex--aemsites.aem.page{path}', timeout=30) as r:
            head = r.read().decode('utf-8', 'ignore').split('</head>', 1)[0]
    except Exception:  # noqa: BLE001
        return None
    meta = {}
    for m in re.finditer(r'<meta (?:name|property)="([^"]+)" content="([^"]*)"', head):
        meta.setdefault(m.group(1).lower(), html.unescape(m.group(2)).strip())
    title = re.sub(r'\s+\|\s+FedEx(\s+[^|]+)?\s*$', '', meta.get('og:title', ''), flags=re.I)
    return {'title': title, 'pageDescription': meta.get('description', meta.get('og:description', ''))} if title else None


with concurrent.futures.ThreadPoolExecutor(12) as ex:
    for path, copy in zip(list(pages), ex.map(page_copy, list(pages))):
        if not copy:
            copy = {k: previous.get(path, {}).get(k) for k in ('title', 'pageDescription') if previous.get(path, {}).get(k) is not None}
        pages[path].update(copy)

body = json.dumps(pages, indent=2, ensure_ascii=False)
open('tools/importer/teaser-pages.js', 'w').write(
    '/* eslint-disable */\n'
    '// Generated by tools/importer/build-teaser-pages.py from teasers-collected.json - do not edit.\n'
    '// Migrated detail pages that a listing teases: path -> the listing teaser image.\n'
    f'export default {body};\n')
print(f'{len(pages)} teased detail pages of {len(collected)} teaser targets')
for path in sorted(set(collected) - set(pages)):
    print('  not migrated (teaser stays authored):', path)
