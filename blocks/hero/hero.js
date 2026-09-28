/**
 * hero: full-bleed background image (optionally an autoplaying .mp4) behind a heading.
 * One row, one cell: picture, heading, optional text/CTA, optional link to an .mp4.
 * Extra rows/cells are merged. The background covers the whole section, so blocks
 * that follow in the same section (e.g. tabs-shipping) sit on top of it.
 */
export default function decorate(block) {
  const bg = document.createElement('div');
  bg.className = 'hero-bg';
  const content = document.createElement('div');
  content.className = 'hero-content';

  [...block.querySelectorAll(':scope > div > div')].forEach((cell) => content.append(...cell.childNodes));

  const picture = content.querySelector('picture');
  if (picture) {
    bg.append(picture);
    const img = picture.querySelector('img');
    if (img) {
      img.loading = 'eager';
      img.fetchPriority = 'high';
    }
  }

  const videoLink = [...content.querySelectorAll('a[href]')]
    .find((a) => new URL(a.href, window.location).pathname.toLowerCase().endsWith('.mp4'));
  if (videoLink) {
    (videoLink.closest('p') || videoLink).remove();
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const video = document.createElement('video');
      Object.assign(video, {
        muted: true, loop: true, autoplay: true, playsInline: true,
      });
      video.setAttribute('muted', '');
      video.setAttribute('aria-hidden', 'true');
      const img = picture?.querySelector('img');
      if (img) video.poster = img.currentSrc || img.src;
      const source = document.createElement('source');
      source.src = videoLink.href;
      source.type = 'video/mp4';
      video.append(source);
      bg.append(video);
    }
  }

  [...content.children].forEach((el) => {
    if (!el.textContent.trim() && !el.querySelector('img, a')) el.remove();
  });

  block.replaceChildren(bg, content);
}
