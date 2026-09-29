/**
 * rate-calculator widget: static placeholder panel (heading, text, CTA to the FedEx
 * rating app). The markup comes from rate-calculator.html; nothing to decorate.
 * This module exists because the widget loader always imports `<name>.js`.
 * @param {Element} widget The widget block element
 */
export default function decorate(widget) {
  widget.dataset.widgetReady = 'true';
}
