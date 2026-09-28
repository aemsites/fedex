// FedEx footer: titled link groups, a locale column with a language disclosure,
// a social row and a legal bar. All copy, links and images come from the footer
// fragment; this file only adds structure, controls and behaviour.

const TABLET_UP = window.matchMedia('(width >= 768px)');
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

let uid = 0;
const nextId = (prefix) => {
  uid += 1;
  return `${prefix}-${uid}`;
};

/**
 * Fetches the footer fragment. Metadata-independent on purpose: /content first
 * (local aem up), then the site root (DA / EDS preview + publish).
 * @returns {Promise<{html: string, base: string}|null>}
 */
async function fetchFooter() {
  let resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) resp = await fetch('/footer.plain.html');
  if (!resp.ok) return null;
  return { html: await resp.text(), base: resp.url };
}

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

/**
 * Picks the list item that represents the current page: the entry whose link
 * path starts with a segment of the current URL (e.g. /en-us/), else the first.
 */
function findCurrentItem(items) {
  const here = window.location.pathname.split('/').filter(Boolean);
  const match = items.find((li) => {
    const a = li.querySelector('a');
    if (!a) return false;
    const [first] = new URL(a.href, window.location.href).pathname.split('/').filter(Boolean);
    return first && here.includes(first);
  });
  return match || items[0];
}

function setDisclosure(button, panel, open) {
  button.setAttribute('aria-expanded', open ? 'true' : 'false');
  panel.hidden = !open;
}

/**
 * Turns an authored list into a disclosure (button + list). The optional label
 * paragraph names the control for assistive technology; the button shows the
 * current entry.
 * @param {Element} list
 * @param {Element} [labelPara]
 * @returns {Element} the disclosure wrapper
 */
function buildDisclosure(list, labelPara) {
  const items = [...list.children];
  const current = findCurrentItem(items);
  const currentLink = current?.querySelector('a');
  if (currentLink) currentLink.setAttribute('aria-current', 'true');

  const wrapper = document.createElement('div');
  wrapper.className = 'footer-disclosure';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'footer-disclosure-trigger';
  const panelId = nextId('footer-disclosure');
  button.setAttribute('aria-controls', panelId);
  if (labelPara) {
    const hidden = document.createElement('span');
    hidden.className = 'footer-visually-hidden';
    hidden.textContent = `${labelPara.textContent.trim()}: `;
    button.append(hidden);
    labelPara.remove();
  }
  const value = document.createElement('span');
  value.className = 'footer-disclosure-value';
  value.textContent = (currentLink || current)?.textContent.trim() || '';
  button.append(value);

  list.id = panelId;
  list.classList.add('footer-disclosure-panel');
  wrapper.append(button, list);
  const toggle = (open) => setDisclosure(button, list, open);
  toggle(false);

  button.addEventListener('click', () => toggle(button.getAttribute('aria-expanded') !== 'true'));
  wrapper.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || button.getAttribute('aria-expanded') !== 'true') return;
    toggle(false);
    button.focus();
  });
  wrapper.addEventListener('focusout', (e) => {
    if (e.relatedTarget && !wrapper.contains(e.relatedTarget)) toggle(false);
  });
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) toggle(false);
  });
  return wrapper;
}

/**
 * Builds one group of the link band: a titled link column (one or more lists)
 * or an untitled utility column (links, optional disclosure).
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
  if (heading && lists.length) {
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
    const prev = nodes[i - 1];
    if (isList(node)) {
      group.append(buildDisclosure(node, prev && isTextOnly(prev) ? prev : null));
    } else if (!(isTextOnly(node) && nodes[i + 1] && isList(nodes[i + 1]))) {
      if (node.querySelector('a')) node.classList.add('footer-locale-link');
      node.querySelectorAll('img').forEach((img) => img.classList.add('footer-locale-icon'));
      group.append(node);
    }
  });
  return group;
}

function decorateLinkSection(section, inner, source) {
  section.classList.add('footer-nav');
  splitGroups(source).forEach((group) => inner.append(buildGroup(group)));
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
  const data = await fetchFooter();
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
}
