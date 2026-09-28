/* eslint-disable */
/* global WebImporter */
/**
 * Parser for notification. Source: https://www.fedex.com/en-us/home.html
 * Instance: div.notifications
 *
 * Output (matches blocks/notification/notification.js): 1 column, 1 row holding the notice
 * paragraph(s) with inline links. The info icon is drawn by CSS, so the source icon is dropped.
 */
export default function parse(element, { document }) {
  const contents = element.querySelector('.fxg-notifications__contents') || element;
  const content = [];

  // Optional bold heading paragraph (empty on the source)
  const heading = contents.querySelector('.fxg-notifications__contents__heading');
  if (heading && heading.textContent.trim()) {
    const p = document.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = heading.textContent.trim();
    p.append(strong);
    content.push(p);
  }

  const paragraphs = [...contents.querySelectorAll('.richtext p, .cc-aem-c-richtext p')]
    .filter((p) => p.textContent.trim());
  paragraphs.forEach((src) => {
    const p = document.createElement('p');
    // unwrap presentational spans, keep text + links
    p.innerHTML = src.innerHTML;
    p.querySelectorAll('span').forEach((s) => s.replaceWith(...s.childNodes));
    content.push(p);
  });

  if (!content.length) {
    const text = contents.textContent.replace(/\s+/g, ' ').trim();
    if (!text) {
      element.remove();
      return;
    }
    const p = document.createElement('p');
    p.textContent = text;
    content.push(p);
  }

  const cells = [[content]];
  const block = WebImporter.Blocks.createBlock(document, { name: 'notification', cells });
  element.replaceWith(block);
}
