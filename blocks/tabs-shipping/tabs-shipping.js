/**
 * tabs-shipping: one row per tab. Cell 1 = label (optional icon), cell 2 = panel.
 * Optional cell 3 = "active" (or a bold label) marks the default tab.
 * A panel link to the FedEx tracking page is enhanced into a tracking-number form.
 */
let uid = 0;

function buildTrackForm(link) {
  const form = document.createElement('form');
  form.className = 'tabs-shipping-track';
  form.action = link.href;
  form.method = 'get';
  const input = document.createElement('input');
  uid += 1;
  Object.assign(input, {
    type: 'text', name: 'trknbr', id: `tabs-shipping-trknbr-${uid}`, placeholder: 'Tracking ID', autocomplete: 'off',
  });
  input.setAttribute('aria-label', 'Tracking ID');
  const button = document.createElement('button');
  button.type = 'submit';
  button.className = 'button primary';
  button.textContent = link.textContent.trim() || 'Track';
  form.append(input, button);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = new URL(link.href);
    const value = input.value.trim();
    if (value) url.searchParams.set('trknbr', value);
    window.location.href = url.href;
  });
  return form;
}

export default function decorate(block) {
  uid += 1;
  const id = `tabs-shipping-${uid}`;
  const tablist = document.createElement('div');
  tablist.className = 'tabs-shipping-list';
  tablist.setAttribute('role', 'tablist');
  const panels = [];
  const buttons = [];
  let activeIndex = 0;

  [...block.children].forEach((row) => {
    const [labelCell, panelCell, flagCell] = [...row.children];
    if (!labelCell || !labelCell.textContent.trim()) return;
    const i = buttons.length;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tabs-shipping-tab';
    btn.id = `${id}-tab-${i}`;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-controls', `${id}-panel-${i}`);
    let icon = labelCell.querySelector('picture, .icon');
    // fallback for :icon-name: tokens that were not converted upstream
    const token = !icon && labelCell.textContent.match(/:([a-z0-9-]+):/);
    if (token) {
      icon = document.createElement('span');
      icon.className = `icon icon-${token[1]}`;
      const img = document.createElement('img');
      img.src = `${window.hlx.codeBasePath}/icons/${token[1]}.svg`;
      img.alt = '';
      icon.append(img);
      labelCell.innerHTML = labelCell.innerHTML.replace(token[0], '');
    }
    if (icon) btn.append(icon);
    const label = document.createElement('span');
    label.textContent = labelCell.textContent.trim();
    btn.append(label);
    if (flagCell?.textContent.trim().toLowerCase() === 'active' || labelCell.querySelector('strong, b')) {
      activeIndex = i;
    }

    const panel = document.createElement('div');
    panel.className = 'tabs-shipping-panel';
    panel.id = `${id}-panel-${i}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', btn.id);
    if (panelCell) panel.append(...panelCell.childNodes);
    const trackLink = panel.querySelector('a[href*="fedextrack"]');
    if (trackLink) {
      const holder = trackLink.closest('p') || trackLink;
      holder.replaceWith(buildTrackForm(trackLink));
    }
    buttons.push(btn);
    panels.push(panel);
    tablist.append(btn);
  });

  const select = (index, focus = false) => {
    buttons.forEach((b, i) => {
      const on = i === index;
      b.setAttribute('aria-selected', on);
      b.tabIndex = on ? 0 : -1;
      panels[i].hidden = !on;
    });
    if (focus) buttons[index].focus();
  };

  buttons.forEach((btn, i) => {
    btn.addEventListener('click', () => select(i));
    btn.addEventListener('keydown', (e) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      select((i + step + buttons.length) % buttons.length, true);
    });
  });

  block.replaceChildren(tablist, ...panels);
  if (buttons.length) select(activeIndex);
}
