import decorateVideo, { setVideoTitle } from '../../scripts/video.js';
import { anchorTeaser, buildTeaser, teaserLink } from '../../scripts/teasers.js';

/**
 * Groups each h3 and the content after it (up to the next heading) into a feature item.
 * @param {Element} cell The column cell holding the features
 */
function buildFeatures(cell) {
  const headings = [...cell.querySelectorAll(':scope > h3')];
  if (!headings.length) return;
  const grid = document.createElement('div');
  grid.className = 'columns-features';
  headings[0].before(grid);
  headings.forEach((h3) => {
    const item = document.createElement('div');
    item.className = 'columns-feature';
    const parts = [h3];
    let next = h3.nextElementSibling;
    while (next && !/^H[1-3]$/.test(next.tagName)) {
      parts.push(next);
      next = next.nextElementSibling;
    }
    item.append(...parts);
    grid.append(item);
  });
}

/**
 * teasers: a row that only links to a page of this site becomes [text | image] from that page:
 * title, description and the link as CTA, then its image (scripts/teasers.js); a row whose page
 * cannot be loaded goes.
 * @param {Element} block The columns block
 */
async function expandTeasers(block) {
  await Promise.all([...block.children].map(async (row) => {
    const a = teaserLink(row);
    if (!a) return;
    const teaser = await buildTeaser(a);
    if (!teaser) {
      row.remove();
      return;
    }
    const text = document.createElement('div');
    text.append(...teaser.body);
    const cells = [text];
    if (teaser.picture) {
      const image = document.createElement('div');
      image.append(teaser.picture);
      cells.push(image);
    }
    row.replaceChildren(...cells);
    anchorTeaser(row, teaser.id);
  }));
}

/**
 * columns: each row is a row of columns; an image-only cell becomes an image column.
 * A row with a single cell spans the full width.
 * A poster image + Kaltura link cell becomes a click-to-play video column.
 * Variants: feature (h3 + text pairs become a feature grid), promo, light (panel background),
 * steps (ordered list with circled numbers beside an image, or centered on its own when
 * authored as one cell; CSS only), overlay (with promo: text on a translucent panel over
 * the image from 768px, panel side follows the cell order; CSS only), centered (centered
 * columns with bottom-aligned CTAs), one-third (1/3 image, 2/3 text) and divided (two
 * titled columns with a vertical rule, circled-number steps and icon lists); CSS only.
 * teasers: rows that only link to a page of this site are filled from that page (see
 * expandTeasers).
 */
export default async function decorate(block) {
  if (block.classList.contains('teasers')) await expandTeasers(block);
  if (!block.firstElementChild) return;
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);
  const feature = block.classList.contains('feature');

  [...block.children].forEach((row) => {
    if (row.children.length === 1) row.classList.add('columns-full');
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic && decorateVideo(col)) {
        col.classList.add('columns-img-col', 'columns-video-col');
        return;
      }
      if (pic && col.children.length === 1 && !col.textContent.trim()) {
        col.classList.add('columns-img-col');
        return;
      }
      if (feature) buildFeatures(col);
      // a paragraph holding only a plain link is a text CTA
      col.querySelectorAll('p').forEach((p) => {
        const a = p.querySelector('a');
        if (a && !a.classList.contains('button') && p.textContent.trim() === a.textContent.trim()) {
          p.classList.add('columns-cta');
        }
      });
    });

    // video: name the player after the row's heading
    const heading = row.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading) setVideoTitle(row.querySelector('.video-embed'), heading.textContent.trim());
  });
}
