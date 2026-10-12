// FedEx footer: titled link groups, a locale column with the language switch block,
// a social row and a legal bar. All copy, links and images come from the footer
// fragment; this file only adds structure, controls and behaviour.

import { buildBlock, decorateBlock, loadBlock } from '../../scripts/aem.js';
import { loadLocaleFragment } from '../../scripts/locale-fragment.js';

const TABLET_UP = window.matchMedia('(width >= 768px)');
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

let uid = 0;
const nextId = (prefix) => {
  uid += 1;
  return `${prefix}-${uid}`;
};

/**
 * Resolves fragment-relative image paths against the fragment URL and marks
 * every footer image as non-critical.
 */
function prepareImages(root, base) {
  root.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src');
    if (src && !/^(https?:|data:|\/)/.test(src)) img.src = new URL(src, base).href;
    img.loading = 'lazy';
    img.decoding = 'async';
  });
}

const isHeading = (el) => /^H[1-6]$/.test(el.tagName);
const isList = (el) => el.tagName === 'UL' || el.tagName === 'OL';
const isTextOnly = (el) => el.tagName === 'P' && !el.querySelector('a, img') && el.textContent.trim();

/** A list whose every link is an image without visible text (icon links). */
function isIconList(list) {
  const links = [...list.querySelectorAll('a')];
  return links.length > 0
    && links.every((a) => a.querySelector('img') && !a.textContent.trim());
}

/**
 * Splits a section into groups: a heading starts a titled group, lists join the
 * current group, and a paragraph that follows a list starts an untitled group.
 * @param {Element} section
 * @returns {Array<{heading: Element|null, nodes: Element[]}>}
 */
function splitGroups(section) {
  const groups = [];
  let current = null;
  [...section.children].forEach((el) => {
    const last = current?.nodes[current.nodes.length - 1];
    if (isHeading(el)) {
      current = { heading: el, nodes: [] };
      groups.push(current);
    } else if (!current || (!isList(el) && last && isList(last))) {
      current = { heading: null, nodes: [el] };
      groups.push(current);
    } else {
      current.nodes.push(el);
    }
  });
  return groups;
}

const isBlock = (el) => el.tagName === 'DIV' && el.classList.length > 0;

/**
 * The language switch of a locale column: the authored language-switch block, or one
 * built from a language list (footers authored before the block).
 */
function languageSwitch(node) {
  if (isBlock(node)) return node;
  const links = [...node.querySelectorAll('a[href]')];
  return buildBlock('language-switch', links.map((a) => [a]));
}

/**
 * Builds one group of the link band: a titled link column (only lists) or a
 * locale column (country link, optional language switch), titled ("Language") or not.
 */
function buildGroup({ heading, nodes }) {
  const group = document.createElement('div');
  group.className = 'footer-group';
  if (heading) {
    heading.classList.add('footer-heading');
    heading.id = heading.id || nextId('footer-heading');
    group.append(heading);
  }
  const lists = nodes.filter(isList);
  if (heading && lists.length && lists.length === nodes.length) {
    const columns = document.createElement('div');
    columns.className = 'footer-group-lists';
    columns.style.setProperty('--footer-sub-columns', lists.length);
    lists.forEach((list) => {
      list.classList.add('footer-links');
      list.setAttribute('aria-labelledby', heading.id);
      columns.append(list);
    });
    group.append(columns);
    return group;
  }

  group.classList.add('footer-locale');
  nodes.forEach((node, i) => {
    if (isList(node) || isBlock(node)) {
      // blocks get their own wrapper (decorateBlock marks the parent as *-wrapper)
      const wrapper = document.createElement('div');
      wrapper.className = 'footer-block';
      const block = languageSwitch(node);
      if (heading) block.dataset.labelledby = heading.id;
      wrapper.append(block);
      group.append(wrapper);
    } else if (!(isTextOnly(node) && nodes[i + 1] && isList(nodes[i + 1]))) {
      // a text-only paragraph right before the list is the old dropdown label: dropped
      if (node.querySelector('a')) node.classList.add('footer-locale-link');
      node.querySelectorAll('img').forEach((img) => img.classList.add('footer-locale-icon'));
      group.append(node);
    }
  });
  return group;
}

/** Default column template (footer.css) is tuned for four groups. */
const DEFAULT_NAV_COLUMNS = 4;

function decorateLinkSection(section, inner, source) {
  section.classList.add('footer-nav');
  const groups = splitGroups(source);
  groups.forEach((group) => inner.append(buildGroup(group)));
  // locales author three to five groups; keep them on one row from tablet up
  if (groups.length !== DEFAULT_NAV_COLUMNS) {
    inner.style.setProperty('--footer-nav-columns', `repeat(${groups.length}, minmax(0, 1fr))`);
  }
}

/** Decorative chevron for the pager buttons (UI chrome, not content). */
function createChevron(direction) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 12 22');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', direction === 'prev' ? 'M11 1 1 11l10 10' : 'M1 1l10 10L1 21');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.5');
  svg.append(path);
  return svg;
}

/**
 * Small screens: the icon list becomes a horizontal scroller with prev/next pager
 * buttons (as on the source). The buttons are pointer affordances only; keyboard and
 * screen-reader users reach every link in the list directly (focus scrolls it into view).
 * Larger screens: plain inline row, pager removed.
 */
function setupIconPager(list) {
  let pager = null;
  const update = () => {
    if (!pager) return;
    const max = list.scrollWidth - list.clientWidth;
    pager.prev.hidden = list.scrollLeft <= 1;
    pager.next.hidden = list.scrollLeft >= max - 1;
  };
  const page = (dir) => {
    const step = Math.max(list.clientWidth - 2 * pager.next.offsetWidth, list.clientWidth / 2);
    list.scrollBy({ left: dir * step, behavior: REDUCED_MOTION.matches ? 'auto' : 'smooth' });
  };
  const build = () => {
    const wrapper = document.createElement('div');
    wrapper.className = 'footer-social-pager';
    list.replaceWith(wrapper);
    const buttons = ['prev', 'next'].map((dir) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `footer-social-pager-${dir}`;
      btn.tabIndex = -1;
      btn.setAttribute('aria-hidden', 'true');
      btn.setAttribute('aria-label', dir === 'prev' ? 'Scroll social links back' : 'Scroll social links forward');
      btn.append(createChevron(dir));
      btn.addEventListener('click', () => page(dir === 'prev' ? -1 : 1));
      return btn;
    });
    wrapper.append(buttons[0], list, buttons[1]);
    pager = { wrapper, prev: buttons[0], next: buttons[1] };
    update();
  };
  const destroy = () => {
    pager.wrapper.replaceWith(list);
    pager = null;
  };
  const sync = () => {
    if (TABLET_UP.matches && pager) destroy();
    else if (!TABLET_UP.matches && !pager) build();
  };
  list.addEventListener('scroll', update, { passive: true });
  new ResizeObserver(update).observe(list);
  TABLET_UP.addEventListener('change', sync);
  sync();
}

function decorateSocialSection(section, inner) {
  section.classList.add('footer-social');
  const heading = inner.querySelector(':scope > :is(h1, h2, h3, h4, h5, h6)');
  const list = [...inner.children].find(isList);
  if (heading) {
    heading.classList.add('footer-heading');
    heading.id = heading.id || nextId('footer-heading');
    list?.setAttribute('aria-labelledby', heading.id);
  }
  if (!list) return;
  list.classList.add('footer-social-links');
  setupIconPager(list);
}

function decorateLegalSection(section, inner) {
  section.classList.add('footer-legal');
  [...inner.children].filter(isList).forEach((list) => list.classList.add('footer-legal-links'));
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // /{locale}/footer (e.g. /de-ch/footer), then /en-us/footer, then the legacy root /footer
  const data = await loadLocaleFragment('footer');
  if (!data) return;

  const fragment = document.createElement('div');
  fragment.innerHTML = data.html;
  prepareImages(fragment, data.base);

  const sections = document.createElement('div');
  sections.className = 'footer-sections';

  [...fragment.children].filter((el) => el.tagName === 'DIV').forEach((source) => {
    const section = document.createElement('div');
    section.className = 'footer-section';
    const inner = document.createElement('div');
    inner.className = 'footer-inner';
    const children = [...source.children];
    const hasIconList = children.some((el) => isList(el) && isIconList(el));
    const hasHeading = children.some(isHeading);

    if (hasIconList) {
      inner.append(...children);
      decorateSocialSection(section, inner);
    } else if (hasHeading) {
      decorateLinkSection(section, inner, source);
    } else {
      inner.append(...children);
      decorateLegalSection(section, inner);
    }
    section.append(inner);
    sections.append(section);
  });

  block.textContent = '';
  block.append(sections);

  // blocks inside the fragment (the language switch), labelled by their column heading
  await Promise.all([...sections.querySelectorAll('.footer-block > div')].map(async (el) => {
    decorateBlock(el);
    await loadBlock(el);
    const { labelledby } = el.dataset;
    if (labelledby) el.querySelector('ul')?.setAttribute('aria-labelledby', labelledby);
  }));
}
