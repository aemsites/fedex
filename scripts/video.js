import { loadCSS } from './aem.js';

/*
 * Shared click-to-play video helper (Kaltura).
 * A block cell holding a poster image + a link to a Kaltura player/embed URL, e.g.
 * https://www.kaltura.com/index.php/extwidget/preview/partner_id/4296983/uiconf_id/55255333/entry_id/1_abc
 * becomes a poster with a play button. Clicking it swaps in the Kaltura iframe player.
 * Nothing loads from Kaltura until the user clicks. Autoplay after the click is skipped
 * when the user prefers reduced motion.
 */

const DEFAULT_PARTNER_ID = '4296983';
const DEFAULT_UICONF_ID = '55255333';

/**
 * Reads a `/<key>/<value>` segment pair from a URL path.
 * @param {string[]} segments Path segments
 * @param {string} key Segment name, e.g. `entry_id`
 * @returns {string|null}
 */
function pathParam(segments, key) {
  const i = segments.indexOf(key);
  return i >= 0 && segments[i + 1] ? segments[i + 1] : null;
}

/**
 * Parses a Kaltura player, preview or embed link.
 * @param {string} href Link URL
 * @returns {{ partnerId: string, uiconfId: string, entryId: string }|null}
 */
export function parseKalturaLink(href) {
  let url;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return null;
  }
  if (!/(^|\.)kaltura\.com$/i.test(url.hostname)) return null;
  const segments = url.pathname.split('/').filter(Boolean);
  const entryId = url.searchParams.get('entry_id') || pathParam(segments, 'entry_id');
  if (!entryId) return null;
  return {
    partnerId: pathParam(segments, 'partner_id') || pathParam(segments, 'p') || DEFAULT_PARTNER_ID,
    uiconfId: pathParam(segments, 'uiconf_id') || url.searchParams.get('uiconf_id') || DEFAULT_UICONF_ID,
    entryId,
  };
}

/**
 * Builds the Kaltura (player v7) iframe embed URL.
 * @param {{ partnerId: string, uiconfId: string, entryId: string }} video Parsed link
 * @param {boolean} autoplay Start playing once loaded
 * @returns {string}
 */
export function kalturaEmbedUrl({ partnerId, uiconfId, entryId }, autoplay) {
  const url = new URL(`https://cdnapisec.kaltura.com/p/${partnerId}/embedPlaykitJs/uiconf_id/${uiconfId}`);
  url.searchParams.set('iframeembed', 'true');
  url.searchParams.set('entry_id', entryId);
  if (autoplay) url.searchParams.set('config[playback]', JSON.stringify({ autoplay: true }));
  return url.href;
}

/**
 * Finds the Kaltura link in a cell.
 * @param {Element} cell The block cell
 * @returns {HTMLAnchorElement|undefined}
 */
export function findVideoLink(cell) {
  return [...cell.querySelectorAll('a[href]')].find((a) => parseKalturaLink(a.href));
}

/**
 * Sets the accessible title of a click-to-play video (play button label and iframe title).
 * @param {Element} embed The `.video-embed` element
 * @param {string} title Video title, e.g. the card heading
 */
export function setVideoTitle(embed, title) {
  if (!embed || !title) return;
  embed.dataset.title = title;
  embed.querySelector('.video-play')?.setAttribute('aria-label', `Play video: ${title}`);
  const iframe = embed.querySelector('iframe');
  if (iframe) iframe.title = title;
}

/**
 * Turns a poster image + Kaltura link cell into a click-to-play video.
 * Only a pure media cell is converted: its only text is the video link text.
 * @param {Element} cell The block cell
 * @param {{ title?: string }} [options] Accessible video title (defaults to link text / alt)
 * @returns {Element|null} The `.video-embed` element, or null if the cell isn't a video cell
 */
export default function decorateVideo(cell, { title } = {}) {
  const link = findVideoLink(cell);
  if (!link || cell.textContent.trim() !== link.textContent.trim()) return null;
  const video = parseKalturaLink(link.href);

  loadCSS(`${window.hlx.codeBasePath}/styles/video.css`);

  const linkText = link.textContent.trim();
  const picture = cell.querySelector('picture');
  const label = title
    || (linkText && !/^https?:/i.test(linkText) ? linkText : '')
    || picture?.querySelector('img')?.alt
    || 'Video';

  const embed = document.createElement('div');
  embed.className = 'video-embed';
  if (picture) embed.append(picture);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'video-play';
  button.addEventListener('click', () => {
    const autoplay = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const iframe = document.createElement('iframe');
    iframe.src = kalturaEmbedUrl(video, autoplay);
    iframe.title = embed.dataset.title;
    iframe.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
    button.replaceWith(iframe);
    embed.classList.add('video-embed-playing');
    iframe.focus();
  }, { once: true });
  embed.append(button);
  setVideoTitle(embed, label);

  cell.replaceChildren(embed);
  return embed;
}
