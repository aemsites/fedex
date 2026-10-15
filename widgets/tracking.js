/**
 * tracking widget: the tracking box of fedex.com's tracking pages (four tabs: tracking number,
 * reference, TCN, proof of delivery). The forms hand over to the FedEx tracking app
 * (https://www.fedex.com/fedextrack/) in the page's locale: tracking numbers (one per line, up to
 * 30) as `trknbr`; a reference or TCN number opens the app with it as `trknbr` too, where the app
 * offers its own reference / TCN search.
 * @param {Element} widget The widget block element
 */
const APP = 'https://www.fedex.com/fedextrack/';

function appLocale() {
  const [lang, country] = (window.location.pathname.split('/')[1] || 'en-us').split('-');
  return country ? `${lang}_${country.toUpperCase()}` : 'en_US';
}

function selectTab(tabs, tab, focus) {
  tabs.forEach((t) => {
    const selected = t === tab;
    t.setAttribute('aria-selected', String(selected));
    t.tabIndex = selected ? 0 : -1;
    const panel = document.getElementById(t.getAttribute('aria-controls'));
    if (panel) panel.hidden = !selected;
  });
  if (focus) tab.focus();
}

export default function decorate(widget) {
  const tabs = [...widget.querySelectorAll('[role="tab"]')];
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tabs, tab));
    tab.addEventListener('keydown', (e) => {
      const moves = { ArrowRight: 1, ArrowLeft: -1 };
      if (e.key in moves) {
        e.preventDefault();
        selectTab(tabs, tabs[(i + moves[e.key] + tabs.length) % tabs.length], true);
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        selectTab(tabs, e.key === 'Home' ? tabs[0] : tabs[tabs.length - 1], true);
      }
    });
  });

  widget.querySelectorAll('form.tracking-panel').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const field = form.querySelector('textarea, input');
      const numbers = field.value.split(/[\s,]+/).map((n) => n.trim()).filter(Boolean).slice(0, 30);
      if (!numbers.length) {
        field.focus();
        return;
      }
      const url = new URL(APP);
      url.searchParams.set('trknbr', numbers.join(','));
      url.searchParams.set('locale', appLocale());
      window.location.assign(url.href);
    });
  });
  widget.dataset.widgetReady = 'true';
}
