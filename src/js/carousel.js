// Spread-by-spread carousel for photo books (layout: "carousel").
// Arrow buttons, left/right keys when the carousel has focus, and swipe.

const pad = (n) => String(n).padStart(2, '0');

export function mountCarousel(root, total) {
  const track = root.querySelector('.ctrack');
  const slides = [...track.children];
  const counter = root.querySelector('.ccount');
  let i = 0;

  function go(k) {
    i = (k + total) % total;
    track.style.transform = `translateX(${-i * 100}%)`;
    counter.textContent = `${pad(i + 1)} / ${pad(total)}`;
    slides.forEach((s, j) => s.setAttribute('aria-hidden', String(j !== i)));
    // start loading the next spread before it is needed
    const next = slides[(i + 1) % total]?.querySelector('img');
    if (next) next.loading = 'eager';
  }

  const prev = () => go(i - 1);
  const next = () => go(i + 1);
  root.querySelector('.c-prev').addEventListener('click', prev);
  root.querySelector('.c-next').addEventListener('click', next);
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
  });

  let x0 = null;
  track.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
    x0 = null;
  });

  go(0);
}
