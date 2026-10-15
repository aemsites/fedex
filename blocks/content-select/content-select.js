// eslint-disable-next-line import/no-cycle
import { loadFragment } from '../fragment/fragment.js';

/**
 * content-select: a dropdown that shows the content of the chosen option below it, e.g. a
 * country's clearance fees. Row 1 is the prompt (the dropdown's label and empty choice); every
 * further row is an option: label | link to a fragment (or the content itself). Nothing is shown
 * until an option is chosen; fragments are loaded on demand.
 * @param {Element} block The block
 */
export default function decorate(block) {
  const [promptRow, ...optionRows] = [...block.children];
  const prompt = promptRow ? promptRow.textContent.trim() : '';
  const options = optionRows.map((row) => {
    const [labelCell, contentCell] = [...row.children];
    const link = contentCell && contentCell.querySelector('a[href]');
    return {
      label: labelCell ? labelCell.textContent.trim() : '',
      path: link ? new URL(link.href, window.location).pathname : null,
      content: contentCell && !link ? [...contentCell.childNodes] : [],
    };
  }).filter((o) => o.label);

  const id = `content-select-${[...document.querySelectorAll('.content-select')].indexOf(block)}`;
  const field = document.createElement('div');
  field.className = 'content-select-field';
  const label = document.createElement('label');
  label.htmlFor = id;
  label.textContent = prompt;
  const select = document.createElement('select');
  select.id = id;
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = prompt;
  empty.disabled = true;
  empty.selected = true;
  select.append(empty);
  options.forEach((o, i) => {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = o.label;
    select.append(option);
  });
  field.append(label, select);

  const panel = document.createElement('div');
  panel.className = 'content-select-panel';
  panel.setAttribute('aria-live', 'polite');

  const cache = new Map();
  select.addEventListener('change', async () => {
    const choice = options[Number(select.value)];
    if (!choice) return;
    const key = select.value;
    panel.setAttribute('aria-busy', 'true');
    if (!cache.has(key)) {
      const holder = document.createElement('div');
      if (choice.path) {
        const fragment = await loadFragment(choice.path);
        if (fragment) holder.append(...fragment.childNodes);
      } else {
        holder.append(...choice.content);
      }
      cache.set(key, holder);
    }
    // a slower earlier choice must not replace a later one
    if (select.value === key) panel.replaceChildren(cache.get(key));
    panel.removeAttribute('aria-busy');
  });

  block.replaceChildren(field, panel);

  // a link to the page with the option's name as hash opens that option (the footer's
  // "International Holiday Schedule" link: /en-to/about/holiday-schedule#en_to ->
  // /fragments/holiday/en-to)
  const hash = decodeURIComponent(window.location.hash.slice(1)).toLowerCase().replace(/_/g, '-');
  const preset = hash ? options.findIndex((o) => o.path && o.path.split('/').pop() === hash) : -1;
  if (preset >= 0) {
    select.value = String(preset);
    select.dispatchEvent(new Event('change'));
  }
}
