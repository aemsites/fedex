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

  // Landing pages (hub-landing, e.g. shipping.html): optional CTA(s) in
  // .fxg-notifications__buttons (plain a.fxg-link--blue text CTA) -> paragraph holding only
  // the link. The homepage notice has no buttons, so its output is unchanged.
  const buttonLinks = [...contents.querySelectorAll('.fxg-notifications__buttons a[href]')]
    .filter((a) => a.textContent.trim() && !/^\/?#$/.test(a.getAttribute('href')) && !a.closest('.fxg-desktop--hide'));
  const ctas = buttonLinks.map((src) => {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = src.href || src.getAttribute('href');
    a.textContent = src.textContent.replace(/\s+/g, ' ').trim();
    p.append(a);
    return p;
  });

  if (!content.length && !ctas.length) {
    const text = contents.textContent.replace(/\s+/g, ' ').trim();
    if (!text) {
      element.remove();
      return;
    }
    const p = document.createElement('p');
    p.textContent = text;
    content.push(p);
  }
  content.push(...ctas);

  const cells = [[content]];
  // Amber alert (banner-landing, claims "The legacy online claims application is now retired"):
  // .fxg-notifications--theme-warning -> Notification (warning). The homepage and hub notices are
  // --theme-informational, so their block name is unchanged.
  const warning = !!element.querySelector('.fxg-notifications--theme-warning')
    || element.matches('.fxg-notifications--theme-warning');
  const block = WebImporter.Blocks.createBlock(document, { name: warning ? 'Notification (warning)' : 'notification', cells });
  element.replaceWith(block);
}
