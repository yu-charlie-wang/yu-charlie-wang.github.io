// Full-screen YouTube player. Uses youtube-nocookie.com for a cleaner,
// more private embed. The YouTube player's own button gives true fullscreen.

const box = document.getElementById('player');
const frame = box.querySelector('.player-frame');
const title = box.querySelector('.ov-title');
const btnClose = box.querySelector('.ov-close');
let returnTo = null;

function onKey(e) {
  if (e.key === 'Escape') closePlayer();
}

export function openPlayer({ youtubeId, title: t }, from) {
  returnTo = from || null;
  title.textContent = t || '';
  const iframe = document.createElement('iframe');
  iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?autoplay=1&rel=0&playsinline=1`;
  iframe.title = t || 'Video';
  iframe.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
  iframe.allowFullscreen = true;
  frame.replaceChildren(iframe);
  box.hidden = false;
  document.body.classList.add('no-scroll');
  btnClose.focus();
  document.addEventListener('keydown', onKey);
}

export function closePlayer() {
  if (box.hidden) return;
  box.hidden = true;
  frame.replaceChildren(); // removing the iframe stops playback
  document.body.classList.remove('no-scroll');
  document.removeEventListener('keydown', onKey);
  if (returnTo) returnTo.focus({ preventScroll: true });
}

btnClose.addEventListener('click', closePlayer);
box.addEventListener('click', (e) => { if (e.target === box) closePlayer(); });
