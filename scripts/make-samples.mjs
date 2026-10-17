// Makes grey placeholder images so the site can be previewed before real
// content is added. Run once: npm run samples
// Delete the sample folders when the real photos go in.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const CONTENT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'content');

async function placeholder(file, w, h, label, shade = 34) {
  const bg = `rgb(${shade},${shade},${shade})`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect width="100%" height="100%" fill="${bg}"/>
    <rect x="1" y="1" width="${w - 2}" height="${h - 2}" fill="none" stroke="#3a3a3a" stroke-width="2"/>
    <text x="50%" y="50%" fill="#8c8c8c" font-family="sans-serif" font-size="${Math.round(Math.min(w, h) / 14)}" letter-spacing="6" text-anchor="middle" dominant-baseline="middle">${label}</text>
  </svg>`;
  await fs.mkdir(path.dirname(file), { recursive: true });
  await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toFile(file);
}

const RATIOS = { '3:2': [1600, 1067], '2:3': [1067, 1600], '4:5': [1280, 1600], '16:9': [1600, 900], '2:1': [2000, 1000] };
const shades = [30, 36, 42, 33, 39];

async function project(folder, list) {
  for (const [i, r] of list.entries()) {
    const [w, h] = RATIOS[r];
    const n = String(i + 1).padStart(2, '0');
    await placeholder(path.join(CONTENT, 'photo', folder, `${n}.jpg`), w, h, n, shades[i % shades.length]);
  }
  await placeholder(path.join(CONTENT, 'photo', folder, 'cover.jpg'), 2400, 1600, 'COVER', 40);
}

await project('01-sample-project', ['3:2', '2:3', '4:5', '3:2', '3:2', '2:3', '4:5', '3:2', '3:2', '4:5', '2:3', '3:2']);
await project('02-second-project', ['2:3', '3:2', '3:2', '4:5', '3:2', '2:3']);
await project('03-sample-photo-book', ['2:1', '2:1', '2:1', '2:1', '2:1', '2:1']);

for (const name of ['for-all-of-us', 'sample-fiction', 'sample-news']) {
  await placeholder(path.join(CONTENT, 'videos', `${name}.jpg`), 1600, 900, 'VIDEO COVER', 38);
}
await placeholder(path.join(CONTENT, 'about', 'portrait.jpg'), 1200, 1500, 'PORTRAIT', 38);
await placeholder(path.join(CONTENT, 'reel', 'poster.jpg'), 2400, 1350, 'REEL', 30);
console.log('Sample images written to content/');
