// Masonry that keeps the photographer's order.
// Each photo goes into whichever column is currently shortest, so the
// sequence reads left to right, top to bottom. Widths and heights come from
// data.json, so the layout is decided before any image has loaded and
// nothing jumps.

const COLS = [
  [matchMedia('(min-width: 1024px)'), 3],
  [matchMedia('(min-width: 700px)'), 2],
];

const columnCount = () => (COLS.find(([mq]) => mq.matches) || [null, 1])[1];

export function mountMasonry(container, photos, onOpen) {
  let current = 0;

  function build() {
    const n = columnCount();
    if (n === current) return;
    current = n;
    container.innerHTML = '';
    const cols = [];
    const heights = [];
    for (let i = 0; i < n; i++) {
      const col = document.createElement('div');
      col.className = 'mcol';
      container.appendChild(col);
      cols.push(col);
      heights.push(0);
    }
    photos.forEach((p, i) => {
      const k = heights.indexOf(Math.min(...heights));
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mitem';
      b.setAttribute('aria-label', `Open photo ${i + 1} of ${photos.length}`);
      const im = document.createElement('img');
      im.src = p.sm || p.src;
      if (p.sm) {
        im.srcset = `${p.sm} 800w, ${p.src} ${p.w}w`;
        im.sizes = n === 3 ? '33vw' : n === 2 ? '50vw' : '100vw';
      }
      im.width = p.w;
      im.height = p.h;
      im.alt = p.alt || '';
      im.loading = 'lazy';
      im.decoding = 'async';
      b.appendChild(im);
      b.addEventListener('click', () => onOpen(i, b));
      cols[k].appendChild(b);
      heights[k] += p.h / p.w + 0.06; // 0.06 stands in for the gap
    });
  }

  build();
  COLS.forEach(([mq]) => mq.addEventListener('change', build));
  return () => COLS.forEach(([mq]) => mq.removeEventListener('change', build));
}
