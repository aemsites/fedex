/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero. Source: https://www.fedex.com/en-us/home.html
 * Instance: div.fxg-hero.fxg-hero_homepage > div.fxg-hero__image
 *
 * Output (matches blocks/hero/hero.js): 1 row, 1 cell holding the background picture,
 * the h1 (taken from sibling div.fxg-hero__header > h1), an optional CTA paragraph and,
 * when a video source exists, a link to the .mp4.
 *
 * The original h1 is removed from the DOM so it is not duplicated as default content.
 */
export default function parse(element, { document }) {
  const hero = element.closest('.fxg-hero') || element.parentElement;

  // ---- Row 1: background image (img element, or CSS background-image as fallback)
  let bgImg = element.querySelector('img:not([src^="data:"])')
    || (hero && hero.querySelector(':scope > .fxg-hero__image img:not([src^="data:"]), video[poster]'));
  if (bgImg && bgImg.tagName === 'VIDEO') {
    const poster = document.createElement('img');
    poster.src = bgImg.getAttribute('poster');
    bgImg = poster;
  }
  if (!bgImg) {
    const styled = [element, ...element.querySelectorAll('[style*="background"]')]
      .find((el) => /url\(/.test(el.getAttribute('style') || ''));
    const match = styled && (styled.getAttribute('style') || '').match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/);
    if (match) {
      bgImg = document.createElement('img');
      bgImg.src = match[1];
    }
  }
  if (bgImg && !bgImg.hasAttribute('alt')) bgImg.setAttribute('alt', '');

  // Optional background video (.mp4) - variant A of the homepage hero
  const scope = hero || element;
  let videoSrc = null;
  const videoSource = scope.querySelector('video source[src*=".mp4"], video[src*=".mp4"]');
  if (videoSource) videoSrc = videoSource.getAttribute('src');
  if (!videoSrc) {
    const dataEl = [...scope.querySelectorAll('[data-src], [data-video], [data-video-src]')]
      .find((el) => /\.mp4/i.test(el.getAttribute('data-src') || el.getAttribute('data-video') || el.getAttribute('data-video-src') || ''));
    if (dataEl) videoSrc = dataEl.getAttribute('data-src') || dataEl.getAttribute('data-video') || dataEl.getAttribute('data-video-src');
  }

  const row1 = [];
  if (bgImg) row1.push(bgImg);
  if (videoSrc) {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = videoSrc;
    a.textContent = videoSrc;
    p.append(a);
    row1.push(p);
  }

  // ---- Row 2: heading from sibling header + optional CTA
  const header = (hero && hero.querySelector(':scope > .fxg-hero__header')) || null;
  const origH1 = (header && header.querySelector('h1'))
    || (hero && hero.querySelector('h1'));

  const row2 = [];
  if (origH1) {
    const h1 = document.createElement('h1');
    h1.innerHTML = origH1.innerHTML.trim();
    row2.push(h1);
    origH1.remove();
  }

  // Optional CTA ("learn more") inside the hero header, excluding the tab cubes
  if (header) {
    const cta = [...header.querySelectorAll('a[href]')]
      .find((a) => !a.closest('.fxg-cube-container') && a.textContent.trim());
    if (cta) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = cta.href;
      a.textContent = cta.textContent.trim();
      p.append(a);
      row2.push(p);
      (cta.closest('div.button_v1, div.link') || cta).remove();
    }
  }

  // Remove play/pause controls if present (not authored)
  if (hero) hero.querySelectorAll('.fxg-hero__video-controls, button[class*="play"], button[class*="pause"]').forEach((b) => b.remove());

  if (!row1.length && !row2.length) {
    element.remove();
    return;
  }

  // Single row, single cell: picture, heading, CTA, then the optional video link
  // Project decision: one row (the hero block also accepts the 2-row library layout)
  const images = row1.filter((el) => el.tagName === 'IMG');
  const videoLinks = row1.filter((el) => el.tagName !== 'IMG');
  const cells = [[[...images, ...row2, ...videoLinks]]];

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero', cells });
  element.replaceWith(block);
}
