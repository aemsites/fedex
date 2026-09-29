/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: FedEx section breaks and Section Metadata.
 * Uses payload.template.sections from tools/importer/page-templates.json (selectors verified
 * against the captured DOM: home -> migration-work/home/cleaned.html, hub-landing ->
 * migration-work/cleaned.html / intl-slim.html).
 *
 * beforeTransform: insert <hr> breaks while all section elements (and their original
 *   :nth-of-type / adjacency positions) still exist. <hr> is not a <div>, so inserting it never
 *   shifts the div:nth-of-type selectors used by parsers or later sections.
 * afterTransform: insert Section Metadata blocks anchored to the marker <hr> (parsers may have
 *   replaced the original section elements by then).
 *
 * Templates whose section selectors do not all match on a given page (hub-landing is shared by
 * several URLs; e.g. a page without "Start here" or FAQs) are handled by skipping the section:
 *   - no candidate selector matches -> no break, no metadata (content stays in the previous section)
 *   - a candidate may not be an element already claimed by a later section, and must precede the
 *     next matched section's element, so a loose selector (e.g. `... ~ .title_v1`) can never
 *     create an empty section or a break out of document order.
 *   - afterTransform only uses the marker placed in beforeTransform; it never re-queries the
 *     post-parse DOM (positional selectors would hit the wrong element there).
 *
 * `style` may be a string ("light, jump-links") or an array (["light", "jump-links"]); it is
 * normalized to one comma-separated value, which EDS splits into section classes.
 */

const SECTION_MARKER_ATTR = 'data-excat-section-id';

function normalizeStyle(style) {
  if (!style) return '';
  const list = (Array.isArray(style) ? style : String(style).split(','))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return [...new Set(list)].join(', ');
}

const precedes = (a, b) => !!(a.compareDocumentPosition(b) & 4); // Node.DOCUMENT_POSITION_FOLLOWING

// section.selector is an array of candidate selectors - first valid match wins.
function querySection(root, selectors, claimed, boundary) {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  for (const sel of list) {
    if (!sel) continue;
    let matches = [];
    try {
      matches = [...root.querySelectorAll(sel)];
    } catch (e) {
      console.warn(`Section selector is invalid, skipped: ${sel}`);
      continue;
    }
    const el = matches.find((m) => !claimed.has(m)
      && !(boundary && (m.contains(boundary) || boundary.contains(m) || !precedes(m, boundary))));
    if (el) return el;
  }
  return null;
}

export default function transform(hookName, element, payload) {
  const sections = (payload && payload.template && payload.template.sections) || [];
  if (sections.length < 2) return;
  const doc = (payload && payload.document) || element.ownerDocument || document;

  if (hookName === 'beforeTransform') {
    // Unconstrained first match per section, used to detect sections listed out of DOM order
    // (banner-landing appends page-specific "gap" sections S9/S10 that sit right after the hero).
    const rawFirst = sections.map((s) => querySection(element, s.selector, new Set(), null));
    // An element claimed by section j is "in order" when every earlier section's first match precedes it.
    // Only in-order elements act as the boundary for earlier sections.
    const inOrder = (j, el) => rawFirst.slice(0, j).every((r) => !r || r === el || precedes(r, el));

    // Reverse order so earlier sections' positions are unaffected by insertions.
    const claimed = new Set();
    let boundary = null; // element of the nearest later (in-order) section that matched
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      const style = normalizeStyle(section.style);
      if (i === 0 && !style) continue; // first section: no break, no metadata
      const sectionEl = querySection(element, section.selector, claimed, boundary);
      if (!sectionEl) {
        console.warn(`Section "${section.name || section.id}" not found on this page, skipped`);
        continue;
      }
      claimed.add(sectionEl);
      if (inOrder(i, sectionEl)) boundary = sectionEl;

      const hr = doc.createElement('hr');
      if (style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
      sectionEl.before(hr);
    }
  }

  if (hookName === 'afterTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      const style = normalizeStyle(section.style);
      if (!style) continue;

      const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
      if (!marker) continue; // section did not match (or its content was removed) - skip

      const metadataBlock = WebImporter.Blocks.createBlock(doc, {
        name: 'Section Metadata',
        cells: { style },
      });
      marker.after(metadataBlock);

      marker.removeAttribute(SECTION_MARKER_ATTR);
      if (i === 0) marker.remove(); // section 0 never gets a real leading break
    }
  }
}
