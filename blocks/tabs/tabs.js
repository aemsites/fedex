import { toClassName } from '../../scripts/aem.js';

let tabsCount = 0;

/**
 * Selects a tab and shows its panel.
 * @param {HTMLButtonElement[]} buttons All tab buttons
 * @param {number} index Index of the tab to select
 * @param {boolean} focus Whether to move focus to the selected tab
 */
function selectTab(buttons, index, focus = false) {
  buttons.forEach((button, i) => {
    const selected = i === index;
    button.setAttribute('aria-selected', selected);
    button.tabIndex = selected ? 0 : -1;
    document.getElementById(button.getAttribute('aria-controls')).hidden = !selected;
  });
  if (focus) buttons[index].focus();
  buttons[index].scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

/**
 * tabs: one row per tab, [tab label | tab panel content]. Extra cells are merged into
 * the panel. Builds an ARIA tablist with roving tabindex: arrow keys move between
 * tabs (selection follows focus), Home/End jump to the first/last tab.
 * The tab list scrolls horizontally when it doesn't fit.
 */
export default function decorate(block) {
  tabsCount += 1;
  const prefix = `tabs-${tabsCount}`;

  const tablist = document.createElement('div');
  tablist.className = 'tabs-list';
  tablist.setAttribute('role', 'tablist');

  const panels = [];
  const buttons = [];
  [...block.children].forEach((row) => {
    const [labelCell, ...contentCells] = [...row.children];
    const label = labelCell?.textContent.trim();
    if (!label) return;
    const id = `${prefix}-${toClassName(label) || buttons.length + 1}`;

    const panel = document.createElement('div');
    panel.className = 'tabs-panel';
    panel.id = `${id}-panel`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', `${id}-tab`);
    panel.tabIndex = 0;
    contentCells.forEach((cell) => panel.append(...cell.childNodes));

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tabs-tab';
    button.id = `${id}-tab`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', panel.id);
    button.textContent = label;

    buttons.push(button);
    panels.push(panel);
    tablist.append(button);
  });

  buttons.forEach((button, i) => {
    button.addEventListener('click', () => selectTab(buttons, i));
    button.addEventListener('keydown', (e) => {
      const last = buttons.length - 1;
      const next = {
        ArrowRight: i === last ? 0 : i + 1,
        ArrowLeft: i === 0 ? last : i - 1,
        Home: 0,
        End: last,
      }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      selectTab(buttons, next, true);
    });
  });

  block.replaceChildren(tablist, ...panels);
  if (buttons.length) {
    buttons.forEach((button, i) => {
      button.setAttribute('aria-selected', i === 0);
      button.tabIndex = i === 0 ? 0 : -1;
      panels[i].hidden = i !== 0;
    });
  }
}
