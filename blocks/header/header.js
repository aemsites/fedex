// FedEx header: desktop click-dropdown nav, inline query forms and an expandable search.
// All copy, links and images come from the nav fragment; this file only adds
// structure, controls and behaviour.

const DESKTOP = window.matchMedia('(width >= 1024px)');
const TABLET_UP = window.matchMedia('(width >= 768px)');

let uid = 0;
const nextId = (prefix) => {
  uid += 1;
  return `${prefix}-${uid}`;
};

const LOCALE = /^[a-z]{2}-[a-z]{2}$/;
const DEFAULT_LOCALE = 'en-us';

/** Fetches the first path that responds ok, in order. */
async function fetchFirst([path, ...rest]) {
  if (!path) return null;
  const resp = await fetch(path);
  if (resp.ok) return { html: await resp.text(), base: resp.url };
  return fetchFirst(rest);
}

/**
 * Fetches the nav fragment of the current locale (/{locale}/nav, e.g. /de-ch/nav).
 * Metadata-independent on purpose. Pages under /content (local aem up) read from
 * /content. Falls back to the default locale nav, then the legacy root nav.
 * @returns {Promise<{html: string, base: string}|null>}
 */
async function fetchNav() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  const root = segments[0] === 'content' ? '/content' : '';
  const first = segments[root ? 1 : 0];
  const locale = LOCALE.test(first || '') ? first : DEFAULT_LOCALE;
  return fetchFirst([...new Set([
    `${root}/${locale}/nav.plain.html`,
    `${root}/${DEFAULT_LOCALE}/nav.plain.html`,
    `${root}/nav.plain.html`,
  ])]);
}

/**
 * Resolves fragment-relative image paths against the fragment URL, so
 * "images/x.png" works no matter which page renders the header.
 */
function resolveImages(root, base) {
  root.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src');
    if (src && !/^(https?:|data:|\/)/.test(src)) img.src = new URL(src, base).href;
  });
}

/** A link whose href ends with "=" is an authored query endpoint (value is appended). */
const isQueryLink = (a) => /=$/.test(a.getAttribute('href') || '');

/** Paragraph that carries only text (no links, no images). */
const isTextOnly = (p) => p.tagName === 'P' && !p.querySelector('a, img') && p.textContent.trim();

/**
 * Builds a query form from authored content: a text paragraph (label), a query link
 * (submit) and an optional following text paragraph (validation message).
 * @param {Element} container Element holding the authored paragraphs
 * @param {Element} link The query link
 * @param {Object} opts { hideLabel: boolean, className: string }
 */
function buildQueryForm(container, link, { hideLabel = false, className = '' } = {}) {
  const paras = [...container.children].filter((el) => el.tagName === 'P');
  const linkPara = link.closest('p');
  const idx = paras.indexOf(linkPara);
  const labelPara = paras.slice(0, Math.max(idx, 0)).reverse().find(isTextOnly);
  const messagePara = paras.slice(idx + 1).find(isTextOnly);
  const labelText = labelPara ? labelPara.textContent.trim() : link.textContent.trim();

  const form = document.createElement('form');
  form.className = `nav-query ${className}`.trim();
  form.noValidate = true;
  const inputId = nextId('nav-query-input');

  const label = document.createElement('label');
  label.htmlFor = inputId;
  label.textContent = labelText;
  if (hideLabel) label.className = 'nav-visually-hidden';

  const input = document.createElement('input');
  input.id = inputId;
  input.type = 'text';
  input.name = 'q';
  input.placeholder = labelText;
  input.autocomplete = 'off';

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'nav-query-submit';
  const linkImg = link.querySelector('img');
  if (linkImg) {
    submit.append(linkImg);
    submit.setAttribute('aria-label', linkImg.alt || labelText);
  } else {
    submit.textContent = link.textContent.trim();
    submit.classList.add('button', 'primary');
  }

  let message;
  if (messagePara) {
    message = document.createElement('p');
    message.className = 'nav-query-message';
    message.id = nextId('nav-query-message');
    message.textContent = messagePara.textContent.trim();
    message.hidden = true;
    input.setAttribute('aria-describedby', message.id);
  }

  form.append(label, input);
  if (message) form.append(message);
  form.append(submit);

  const action = link.href;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = input.value.trim();
    if (!value) {
      if (message) {
        message.hidden = false;
        input.setAttribute('aria-invalid', 'true');
      }
      input.focus();
      return;
    }
    window.location.href = `${action}${encodeURIComponent(value)}`;
  });
  input.addEventListener('input', () => {
    if (message) message.hidden = true;
    input.removeAttribute('aria-invalid');
  });

  [labelPara, linkPara, messagePara].forEach((p) => p?.remove());
  return { form, input };
}

/**
 * Closes every open dropdown (and optionally the search) in the nav.
 * @param {Element} nav
 * @param {Element} [except] trigger to keep open
 */
function closeDropdowns(nav, except) {
  nav.querySelectorAll('.nav-drop-trigger[aria-expanded="true"]').forEach((btn) => {
    if (btn !== except) btn.setAttribute('aria-expanded', 'false');
  });
}

function setSearch(nav, open, { focus = true } = {}) {
  const toggle = nav.querySelector('.nav-search-toggle');
  if (!toggle) return;
  toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  nav.classList.toggle('search-open', open);
  if (open) {
    closeDropdowns(nav);
    if (focus) nav.querySelector('.nav-search-form input')?.focus();
  } else if (focus) {
    toggle.focus();
  }
}

/**
 * Turns each `li` that has a nested list into a click dropdown:
 * the authored label becomes a disclosure button, the list becomes the panel.
 * @param {Element} section Nav section
 * @param {Element} nav
 */
function decorateDropdowns(section, nav) {
  const list = section.querySelector(':scope > ul');
  if (!list) return;
  list.classList.add('nav-drop-list');
  [...list.children].forEach((li) => {
    const panel = li.querySelector(':scope > ul');
    const labelEl = li.querySelector(':scope > p') || li.firstChild;
    if (!panel || !labelEl) return;
    li.classList.add('nav-drop');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'nav-drop-trigger';
    trigger.setAttribute('aria-expanded', 'false');
    const panelId = nextId('nav-dropdown');
    trigger.setAttribute('aria-controls', panelId);

    const label = document.createElement('span');
    label.className = 'nav-drop-label';
    const imgs = [];
    [...labelEl.childNodes].forEach((node) => {
      if (node.nodeName === 'IMG') imgs.push(node);
      else if (node.nodeName === 'PICTURE') imgs.push(node.querySelector('img'));
      else label.append(node.textContent);
    });
    label.textContent = label.textContent.replace(/\s+/g, ' ').trim();
    trigger.append(label);
    // first image = default icon, second (optional) = active/open-state icon
    imgs.filter(Boolean).forEach((img, i) => {
      img.classList.add('nav-drop-icon', i === 0 ? 'nav-drop-icon-default' : 'nav-drop-icon-active');
      // the visible label already names the button; keep icons decorative
      if (i > 0 || label.textContent) img.alt = '';
      img.loading = 'eager';
      trigger.append(img);
    });
    if (imgs.length) li.classList.add('nav-drop-has-icon');
    labelEl.replaceWith(trigger);

    panel.id = panelId;
    panel.classList.add('nav-dropdown-panel');
    [...panel.children].forEach((item) => {
      const query = [...item.querySelectorAll('a')].find(isQueryLink);
      const links = [...item.querySelectorAll('a')];
      if (links.length === 2 && !query
        && links[0].textContent.trim() === links[1].textContent.trim()) {
        // same label, two destinations: first = desktop, second = small screens
        links[0].classList.add('nav-desktop-only');
        links[1].classList.add('nav-mobile-only');
        item.replaceChildren(...links);
      } else if (query) {
        item.classList.add('nav-dropdown-form');
        const { form } = buildQueryForm(item, query);
        item.append(form);
      } else if (item.querySelector(':scope > strong > a, :scope > b > a')) {
        item.classList.add('nav-dropdown-all');
      } else if (item.querySelector(':scope > p')) {
        item.classList.add('nav-dropdown-note');
      }
    });

    trigger.addEventListener('click', () => {
      const open = trigger.getAttribute('aria-expanded') === 'true';
      if (!open) {
        setSearch(nav, false, { focus: false });
        // a dropdown outside the menu (e.g. account) replaces the open mobile menu
        // eslint-disable-next-line no-use-before-define
        if (!section.classList.contains('nav-sections')) toggleMobileMenu(nav, false);
      }
      closeDropdowns(nav, trigger);
      trigger.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
  });
}

/**
 * Builds the expandable search from a section holding a query link.
 * @param {Element} section
 * @param {Element} nav
 */
function decorateSearch(section, nav) {
  const link = [...section.querySelectorAll('a')].find(isQueryLink);
  if (!link) return;
  const openIcon = link.querySelector('img')?.cloneNode(true);
  const closePara = [...section.querySelectorAll(':scope > p')]
    .find((p) => p.querySelector('img') && !p.querySelector('a'));
  const closeIcon = closePara?.querySelector('img');

  const { form } = buildQueryForm(section, link, { hideLabel: true, className: 'nav-search-form' });
  form.setAttribute('role', 'search');
  const panelId = nextId('nav-search');
  form.id = panelId;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'nav-search-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', panelId);
  toggle.setAttribute('aria-label', openIcon?.alt || form.querySelector('label').textContent);
  if (openIcon) toggle.append(openIcon);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'nav-search-close';
  close.setAttribute('aria-label', closeIcon?.alt || 'Close');
  if (closeIcon) close.append(closeIcon);
  closePara?.remove();

  section.textContent = '';
  const bar = document.createElement('div');
  bar.className = 'nav-search-bar';
  bar.append(form, close);
  section.append(toggle, bar);

  toggle.addEventListener('click', () => setSearch(nav, toggle.getAttribute('aria-expanded') !== 'true'));
  close.addEventListener('click', () => setSearch(nav, false));
}

function toggleMobileMenu(nav, force) {
  const btn = nav.querySelector('.nav-hamburger button');
  if (!btn) return;
  const open = force ?? !nav.classList.contains('menu-open');
  if (open) closeDropdowns(nav);
  nav.classList.toggle('menu-open', open);
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  btn.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  document.body.style.overflowY = open && !DESKTOP.matches ? 'hidden' : '';
}

/**
 * loads and decorates the header
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const navData = await fetchNav();
  if (!navData) return;

  const fragment = document.createElement('div');
  fragment.innerHTML = navData.html;
  resolveImages(fragment, navData.base);

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Main');

  const sections = [...fragment.children].filter((el) => el.tagName === 'DIV');
  let dropGroups = 0;
  sections.forEach((section, i) => {
    section.classList.add('nav-section');
    const hasDropdowns = section.querySelector(':scope > ul > li > ul');
    const hasQuery = [...section.querySelectorAll(':scope > p a')].some(isQueryLink);
    if (i === 0) {
      section.classList.add('nav-brand');
      const logo = section.querySelector('img');
      logo?.closest('a')?.classList.add('nav-brand-link');
      if (logo) {
        logo.loading = 'eager';
        logo.fetchPriority = 'high';
      }
      // in-page links in the brand bar become skip links (visible on focus)
      section.querySelectorAll('a[href^="#"]').forEach((a) => {
        a.classList.add('nav-skip');
        const p = a.closest('p');
        section.prepend(a); // first tab stop
        p?.remove();
        a.addEventListener('click', (e) => {
          const target = document.getElementById(a.hash.slice(1)) || document.querySelector('main');
          if (!target) return;
          e.preventDefault();
          if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
          target.focus();
        });
      });
    } else if (hasDropdowns) {
      section.classList.add(dropGroups === 0 ? 'nav-sections' : 'nav-tools');
      dropGroups += 1;
      decorateDropdowns(section, nav);
    } else if (hasQuery) {
      section.classList.add('nav-search');
      decorateSearch(section, nav);
    }
    // any image not in the brand bar is non-critical
    if (i > 0) {
      section.querySelectorAll('img').forEach((img) => {
        if (!img.closest('.nav-drop-trigger, .nav-search-toggle')) {
          img.loading = 'lazy';
          img.fetchPriority = 'low';
        }
      });
    }
    nav.append(section);
  });

  // hamburger (mobile only; hidden on desktop)
  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  const hamburgerBtn = document.createElement('button');
  hamburgerBtn.type = 'button';
  const menuSections = nav.querySelector('.nav-sections');
  if (menuSections) {
    menuSections.id = menuSections.id || 'nav-menu';
    hamburgerBtn.setAttribute('aria-controls', menuSections.id);
  }
  hamburgerBtn.setAttribute('aria-expanded', 'false');
  hamburgerBtn.setAttribute('aria-label', 'Open navigation');
  hamburgerBtn.innerHTML = '<span class="nav-hamburger-icon"></span>';
  hamburgerBtn.addEventListener('click', () => toggleMobileMenu(nav));
  hamburger.append(hamburgerBtn);
  nav.append(hamburger);

  // keep keyboard focus inside the header while the mobile menu is open
  nav.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || DESKTOP.matches || !nav.classList.contains('menu-open')) return;
    const focusable = [...nav.querySelectorAll('a[href], button, input')]
      .filter((el) => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  // page overlay shown while a dropdown or the search is open (CSS decides visibility)
  const scrim = document.createElement('div');
  scrim.className = 'nav-scrim';
  scrim.addEventListener('click', () => {
    closeDropdowns(nav);
    setSearch(nav, false, { focus: false });
    toggleMobileMenu(nav, false);
  });

  // Escape closes everything and returns focus to the trigger that owned the panel
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!DESKTOP.matches && nav.classList.contains('menu-open')) {
      toggleMobileMenu(nav, false);
      hamburgerBtn.focus();
      return;
    }
    const openTrigger = nav.querySelector('.nav-drop-trigger[aria-expanded="true"]');
    const searchOpen = nav.classList.contains('search-open');
    if (openTrigger) {
      closeDropdowns(nav);
      if (nav.contains(document.activeElement)) openTrigger.focus();
    }
    if (searchOpen) setSearch(nav, false, { focus: nav.contains(document.activeElement) });
  });

  // click outside the nav closes open dropdowns
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target)) closeDropdowns(nav);
  });

  // keyboard: leaving an open dropdown closes it
  // (desktop only: in the mobile accordion this would collapse a row mid-tap)
  nav.addEventListener('focusout', (e) => {
    if (!DESKTOP.matches) return;
    const drop = e.target.closest('.nav-drop');
    if (drop && !drop.contains(e.relatedTarget)) {
      drop.querySelector('.nav-drop-trigger')?.setAttribute('aria-expanded', 'false');
    }
  });

  // reset transient state when crossing the desktop breakpoint
  const resetOnResize = () => {
    closeDropdowns(nav);
    setSearch(nav, false, { focus: false });
    toggleMobileMenu(nav, false);
  };
  DESKTOP.addEventListener('change', resetOnResize);
  TABLET_UP.addEventListener('change', resetOnResize);

  block.textContent = '';
  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav, scrim);
  block.append(navWrapper);
}
