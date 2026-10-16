/* eslint-disable */
/* global WebImporter */
/**
 * Parser for widget. Base: widget (local generic loader, blocks/widget/widget.js).
 * Template: hub-landing. Source: https://www.fedex.com/en-us/shipping/international.html
 * (also shipping.html). Instance: div.genericAppContainer
 *
 * The source is the client-rendered FedEx rate app (#fedex-mags-app / <magr-root>, "Calculate
 * FedEx shipping rates" with From/To fields). It is not re-implemented: the block is
 *   `Widget`, 1 row, 1 cell: a link to /widgets/rate-calculator.html
 * widget.js reads the link's pathname (/widgets/[path/]name.html) and loads
 * /widgets/rate-calculator.{html,css,js}. The app markup itself is dropped.
 * An app container that isn't the rate app is removed (nothing authorable in it).
 */
const WIDGETS = [
  // the tracking pages' tracking box (div.trackingLandingContainer_v1: the Angular app
  // <app-landing-page-entry> with the Tracking number / reference / TCN / proof-of-delivery tabs;
  // en-to and en-us tracking): /widgets/tracking.html
  {
    path: '/widgets/tracking.html',
    test: (el) => el.matches('.trackingLandingContainer_v1')
      || !!el.querySelector('#trk-LandingModule-div, app-landing-page-entry'),
  },
  {
    path: '/widgets/rate-calculator.html',
    test: (el) => !!el.querySelector('#fedex-mags-app, magr-root, magr-welcome, #magr-heading, link[href*="/magr/"]')
      || /calculate (fedex )?shipping rates/i.test(el.textContent),
  },
];

export default function parse(element, { document }) {
  const widget = WIDGETS.find((w) => w.test(element));
  if (!widget) {
    element.remove();
    return;
  }

  const p = document.createElement('p');
  const a = document.createElement('a');
  a.href = widget.path;
  a.textContent = widget.path;
  p.append(a);

  const cells = [[p]];
  const block = WebImporter.Blocks.createBlock(document, { name: 'Widget', cells });
  element.replaceWith(block);
}
