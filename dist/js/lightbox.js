// Full-screen photo viewer: arrows, left/right keys, swipe, Esc to close.
// Neighbouring photos are preloaded so paging feels instant.

const box = document.getElementById('lightbox');
const image = box.querySelector('.lb-img');
const counter = box.querySelector('.lb-count');
const btnPrev = box.querySelector('.lb-prev');
const btnNext = box.querySelector('.lb-next');
const btnClose = box.querySelector('.ov-close');
const pad = (n) => String(n).padStart(2, '0');

let items = [];
let idx = 0;
let returnTo = null;

function show(i) {
  idx = (i + items.length) % items.length;
  const p = items[idx];
  image.src = p.src;
  image.width = p.w;
  image.height = p.h;
  image.alt = p.alt || `Photo ${idx + 1}`;
  counter.textContent = `${pad(idx + 1)} / ${pad(items.length)}`;
  [idx - 1, idx + 1].forEach((j) => {
    const q = items[(j + items.length) % items.length];
    if (q) new Image().src = q.src;
  });
}

function onKey(e) {
  if (e.key === 'Escape') closeLightbox();
  else if (e.key === 'ArrowLeft') show(idx - 1);
  else if (e.key === 'ArrowRight') show(idx + 1);
  else if (e.key === 'Tab') {
    // keep focus inside the viewer
    const f = [btnPrev, btnNext, btnClose];
    const at = f.indexOf(document.activeElement);
    e.preventDefault();
    f[(at + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
  }
}

export function openLightbox(list, start, from) {
  items = list;
  returnTo = from || null;
  box.hidden = false;
  document.body.classList.add('no-scroll');
  show(start);
  btnClose.focus();
  document.addEventListener('keydown', onKey);
}

export function closeLightbox() {
  if (box.hidden) return;
  box.hidden = true;
  image.removeAttribute('src');
  document.body.classList.remove('no-scroll');
  document.removeEventListener('keydown', onKey);
  if (returnTo) returnTo.focus({ preventScroll: true });
}

btnPrev.addEventListener('click', () => show(idx - 1));
btnNext.addEventListener('click', () => show(idx + 1));
btnClose.addEventListener('click', closeLightbox);
box.addEventListener('click', (e) => { if (e.target === box) closeLightbox(); });

let x0 = null;
box.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
box.addEventListener('touchend', (e) => {
  if (x0 === null) return;
  const dx = e.changedTouches[0].clientX - x0;
  if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1));
  x0 = null;
});
