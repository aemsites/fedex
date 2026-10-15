# Builds the DA block library from the migrated content (excat block-library-creator, DA path):
#  - blocks/<name>/metadata.json (block-variant-manager shape: variants = the class combinations the
#    migrated pages use, usage = the pages using the block, description from the block README)
#  - content/library/blocks/<name>.plain.html: one section per variant, its first real instance
#    (rows trimmed, images swapped for the library placeholders) + library-metadata
#  - content/library/blocks.json (the Library panel index)
# Sources: content/**/*.plain.html (earlier locale imports) and the en-to upload set.
# Run from anywhere: python3 tools/library/gen-block-library.py, then bash tools/library/upload-block-library.sh
import collections
import datetime
import glob
import json
import os
import re

R = '/backups/aemsites/fedex/repo'
ORG, SITE = 'aemsites', 'fedex'
# the site's library folder (the DA config's Blocks entry is docs/library/blocks.json)
LIB = f'{R}/content/docs/library'
SOURCES = [f'{R}/content', f'{R}/migration-work/en-to/final2/content',
           f'{R}/migration-work/en-us-150/wsb/content', f'{R}/migration-work/en-us-100c/wsc/content',
           f'{R}/migration-work/en-us-100d/wsc/content']
SOURCES = [s for s in SOURCES if os.path.isdir(s)]
# not authored as blocks in pages: the header/footer are fragments, language-switch lives in the
# footer, fragment is inserted by link
EXCLUDE = {'header', 'footer', 'language-switch'}
WIDE = {'hero', 'banner'}
MAX_ROWS = {'accordion': 3, 'table': 4, 'content-select': 5, 'cards': 3, 'tabs': 3, 'breadcrumb': 1}
NOW = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')

blocks = sorted(b for b in os.listdir(f'{R}/blocks') if os.path.isdir(f'{R}/blocks/{b}') and b not in EXCLUDE)


def find_div(html, start):
    """End index of the <div> element opening at start (balanced)."""
    depth, i = 0, start
    for m in re.finditer(r'<div\b[^>]*>|</div>', html[start:]):
        depth += 1 if m.group(0).startswith('<div') else -1
        if depth == 0:
            return start + m.end()
    return len(html)


def children(inner):
    """Top-level <div> children of a div's inner HTML."""
    out, i = [], 0
    while True:
        m = re.search(r'<div\b[^>]*>', inner[i:])
        if not m:
            return out
        s = i + m.start()
        e = find_div(inner, s)
        out.append(inner[s:e])
        i = e


def page_path(f):
    for src in SOURCES:
        if f.startswith(src + '/'):
            return '/' + f[len(src) + 1:-len('.plain.html')]
    return f


# instances: block -> combo -> [(page, html)]
instances = collections.defaultdict(lambda: collections.defaultdict(list))
pages_using = collections.defaultdict(set)
files = [f for src in SOURCES for f in glob.glob(f'{src}/**/*.plain.html', recursive=True)
         if '/library/' not in f]
for f in sorted(files):
    html = open(f, errors='ignore').read()
    for m in re.finditer(r'<div class="([a-z0-9 -]+)">', html):
        toks = m.group(1).split()
        if toks[0] not in blocks:
            continue
        combo = ' '.join([toks[0]] + [t for t in toks[1:]])
        key = ' '.join([toks[0]] + sorted(toks[1:]))
        instances[toks[0]][key].append((page_path(f), m.group(1), html[m.start():find_div(html, m.start())]))
        pages_using[toks[0]].add(page_path(f))


# README intros that don't describe the block for authors
INTRO = {
    'form': 'A form built from a sheet definition (/{locale}/forms/<name>.json): fields, fieldsets, validation and Submit.',
}


def readme(b):
    p = f'{R}/blocks/{b}/README.md'
    if not os.path.exists(p):
        return b.replace('-', ' ').title(), '', {}
    text = open(p).read()
    title = (re.search(r'^# (.+)$', text, re.M) or [None, b.replace('-', ' ').title()])[1].strip()
    intro = INTRO.get(b) or next((l.strip() for l in text.split('\n')[1:] if l.strip() and not l.startswith(('#', '|', '-'))), '')
    tokens = {}
    for m in re.finditer(r'^- `([a-z0-9-]+)`(?: with `[a-z0-9-]+`)?: (.+)$', text, re.M):
        tokens.setdefault(m.group(1), m.group(2))
    return title, intro, tokens


def first_sentence(t, limit=220):
    t = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', t)
    t = re.sub(r'`([^`]*)`', r'\1', t)
    t = re.sub(r'\*\*?([^*]+)\*\*?', r'\1', t)
    s = re.split(r'(?<=[.;:])\s', t, maxsplit=1)[0].rstrip(':;')
    return (s[:limit - 1] + '…') if len(s) > limit else s


def clean(block_html, b):
    h = re.sub(r'<source\b[^>]*>', '', block_html)
    ph = 'placeholder-16x9.png' if b in WIDE else 'placeholder-4x3.png'

    def img(m):
        alt = re.search(r'alt="([^"]*)"', m.group(0))
        return f'<img src="./images/{ph}" alt="{(alt.group(1) if alt and alt.group(1) else "Sample image")}">'
    h = re.sub(r'<img\b[^>]*>', img, h)
    h = re.sub(r'\s(data-aue-[a-z-]+|data-richtext-[a-z-]+|id)="[^"]*"', '', h)
    # media links (.mp4 hero videos) stay; trim long repeating blocks
    m = re.match(r'(<div class="[^"]*">)(.*)(</div>)$', h, re.S)
    rows = children(m.group(2))
    limit = MAX_ROWS.get(b)
    if b == 'table' and rows:
        rows = rows[:limit]
    elif limit and len(rows) > limit:
        # content-select: keep the prompt row + the first options
        rows = rows[:limit]
    return m.group(1) + ''.join(rows) + m.group(3)


index = []
for b in blocks:
    title, intro, tokens = readme(b)
    combos = instances.get(b, {})
    if not combos:
        # fragment: inserted by link, no instance in the pages
        if b == 'fragment':
            combos = {'fragment': [('', 'fragment', '<div class="fragment"><div><div><p><a href="/fragments/ancillary/en-us/au">/fragments/ancillary/en-us/au</a></p></div></div></div>')]}
        else:
            print('SKIP', b, '(no instance, no sample)')
            continue
    # default first, then by use
    order = sorted(combos, key=lambda k: (k != b, -len(combos[k]), k))
    # English samples first: en-us, then en-to and the other English locales, then the rest
    lang = lambda inst: (0 if inst[0].startswith('/en-us/') else 1 if inst[0].startswith('/en-') else 2 if inst[0].startswith('/fragments/') or not inst[0] else 3)
    combos = {k: sorted(v, key=lang) for k, v in combos.items()}
    sections, variants = [], []
    for key in order:
        page, cls, html = combos[key][0]
        toks = cls.split()[1:]
        name = f'{title} ({", ".join(toks)})' if toks else title
        if toks:
            variants.append(', '.join(toks))
            desc = '; '.join(first_sentence(tokens[t]) for t in toks if t in tokens) or f'{title} with {", ".join(toks)}.'
        else:
            desc = first_sentence(intro) or f'{title} block.'
        desc = desc.replace('<', '&lt;').replace('>', '&gt;')
        sections.append(
            '<div>\n' + clean(html, b) + '\n'
            f'<div class="library-metadata"><div><div>name</div><div>{name}</div></div>'
            f'<div><div>description</div><div>{desc}</div></div></div>\n</div>')
    out = f'{LIB}/blocks/{b}.plain.html'
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w').write('\n'.join(sections) + '\n')
    legacy = f'{LIB}/blocks/{b}.html'
    if os.path.exists(legacy):
        os.remove(legacy)
    pages = sorted(p for p in pages_using.get(b, []) if p)
    meta = {
        'variantName': b,
        'baseBlock': b,
        'version': '1.0.0',
        'created': NOW,
        'name': title,
        'description': first_sentence(intro, 400) if intro else f'{title} block.',
        'variants': variants,
        'usage': {'pagesUsing': pages[:20], 'reuseCount': len(pages), 'lastUsed': NOW},
    }
    if not variants:
        del meta['variants']
    if not pages:
        del meta['usage']
    meta_path = f'{R}/blocks/{b}/metadata.json'
    # generated from the content: rewritten on every run
    json.dump(meta, open(meta_path, 'w'), indent=2)
    open(meta_path, 'a').write('\n')
    index.append({'name': title, 'path': f'https://content.da.live/{ORG}/{SITE}/docs/library/blocks/{b}'})
    print(f'{b}: {len(sections)} sections ({", ".join(order)[:150]})')

index.sort(key=lambda e: e['name'])
json.dump({'total': len(index), 'offset': 0, 'limit': len(index), 'data': index, ':type': 'sheet'},
          open(f'{LIB}/blocks.json', 'w'), indent=2)
print(len(index), 'blocks in blocks.json')
