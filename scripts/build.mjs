// Builds the site into dist/.
//   1. Checks every JSON file in content/ and stops with a clear message if one is broken.
//   2. Scans content/photo/<folder>/ and orders photos by file name.
//   3. Makes web-sized WebP images with sharp (cached in .cache/media).
//   4. Writes dist/data.json, which the browser reads.
//
// Run: npm run build

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'content');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const CACHE = path.join(ROOT, '.cache', 'media');

const IMAGE = /\.(jpe?g|png|webp|tiff?)$/i;
const CATEGORIES = ['documentary', 'fiction', 'news'];
const PROVIDERS = ['youtube', 'drive'];
const LAYOUTS = ['masonry', 'carousel'];
const SITE_LIMIT_MB = 900; // GitHub Pages allows 1 GB; keep headroom

const errors = [];
const warnings = [];
const byName = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
const exists = (p) => fs.access(p).then(() => true, () => false);
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

// ---------------------------------------------------------- JSON

async function readJson(file) {
  let text;
  try {
    text = await fs.readFile(file, 'utf8');
  } catch {
    errors.push(`${rel(file)}: file not found`);
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    let where = '';
    const pos = /position (\d+)/.exec(e.message);
    const lc = /line (\d+)/.exec(e.message);
    if (pos) where = ` (around line ${text.slice(0, +pos[1]).split('\n').length})`;
    else if (lc) where = ` (around line ${lc[1]})`;
    errors.push(`${rel(file)}: this file is not valid JSON${where}. Look for a missing comma, a missing quote or a trailing comma. Details: ${e.message}`);
    return null;
  }
}

function need(obj, key, file, label = key) {
  if (obj[key] === undefined || obj[key] === null || obj[key] === '') {
    errors.push(`${rel(file)}: "${label}" is missing`);
    return false;
  }
  return true;
}

// ---------------------------------------------------------- images

const hashes = new Map();
async function fileHash(file) {
  if (!hashes.has(file)) {
    const buf = await fs.readFile(file);
    hashes.set(file, crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10));
  }
  return hashes.get(file);
}

// Resize one source image to fit inside `size` x `size`, as WebP.
// Output name carries a content hash so browsers never show a stale copy.
async function webp(srcFile, outBase, size, quality = 82) {
  const h = await fileHash(srcFile);
  const name = `${outBase}-${size}-${h}.webp`;
  const cached = path.join(CACHE, name.replaceAll('/', '__'));
  if (!(await exists(cached))) {
    await sharp(srcFile)
      .rotate() // respect camera orientation
      .resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      .toFile(cached); // EXIF (including GPS) is not copied
  }
  const meta = await sharp(cached).metadata();
  const out = path.join(DIST, 'media', name);
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.copyFile(cached, out);
  return { src: `media/${name}`, w: meta.width, h: meta.height };
}

// A large and a small version, used together with srcset.
async function responsive(srcFile, outBase, large, small = 800) {
  const stat = await fs.stat(srcFile);
  if (stat.size > 15 * 1024 * 1024) {
    warnings.push(`${rel(srcFile)} is ${(stat.size / 1048576).toFixed(0)} MB. Export a web-sized copy (long edge 2400px) to keep the repository small.`);
  }
  const big = await webp(srcFile, outBase, large);
  const sm = await webp(srcFile, outBase, small);
  return { ...big, sm: sm.src };
}

async function copyAsset(srcFile, outRel) {
  const out = path.join(DIST, outRel);
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.copyFile(srcFile, out);
  return outRel.split(path.sep).join('/');
}

// ---------------------------------------------------------- content

async function buildSite() {
  const file = path.join(CONTENT, 'site.json');
  const site = await readJson(file);
  if (!site) return null;
  need(site, 'name', file);
  const out = { name: site.name, title: site.title || '', reel: {} };
  const r = site.reel || {};
  for (const key of ['src', 'srcMobile', 'poster']) {
    if (!r[key]) continue;
    const f = path.join(CONTENT, r[key]);
    if (!(await exists(f))) { warnings.push(`site.json: reel.${key} points to ${r[key]}, which does not exist yet`); continue; }
    if (key === 'poster') out.reel.poster = (await webp(f, 'reel/poster', 2400, 78)).src;
    else {
      const mb = (await fs.stat(f)).size / 1048576;
      if (mb > 45) warnings.push(`${r[key]} is ${mb.toFixed(0)} MB. Aim for under 30 MB (1080p, no audio, about 3 Mbps).`);
      out.reel[key] = await copyAsset(f, path.join('media', 'reel', path.basename(f)));
    }
  }
  return out;
}

async function buildAbout() {
  const file = path.join(CONTENT, 'about.json');
  const a = await readJson(file);
  if (!a) return null;
  const out = { bio: Array.isArray(a.bio) ? a.bio : [a.bio].filter(Boolean), email: a.email, phone: a.phone, base: a.base, instagram: a.instagram };
  if (a.portrait) {
    const f = path.join(CONTENT, a.portrait);
    if (await exists(f)) out.portrait = await responsive(f, 'about/portrait', 1200, 600);
    else warnings.push(`about.json: portrait ${a.portrait} not found`);
  }
  if (a.resume) {
    const f = path.join(CONTENT, a.resume);
    if (await exists(f)) out.resume = await copyAsset(f, path.join('media', 'about', path.basename(f)));
    else warnings.push(`about.json: resume ${a.resume} not found`);
  }
  return out;
}

async function buildVideos() {
  const file = path.join(CONTENT, 'videos.json');
  const list = await readJson(file);
  if (!list) return [];
  if (!Array.isArray(list)) { errors.push('content/videos.json: should be a list in square brackets [ ... ]'); return []; }
  const out = [];
  for (const [i, v] of list.entries()) {
    const label = `video #${i + 1}${v.title ? ` "${v.title}"` : ''}`;
    if (!v.title) errors.push(`content/videos.json: ${label} has no "title"`);
    if (!CATEGORIES.includes(v.category)) errors.push(`content/videos.json: ${label} has category "${v.category}". Use one of: ${CATEGORIES.join(', ')}`);
    if (!PROVIDERS.includes(v.provider)) errors.push(`content/videos.json: ${label} has provider "${v.provider}". Use one of: ${PROVIDERS.join(', ')}`);
    if (v.provider === 'youtube' && !v.youtubeId) errors.push(`content/videos.json: ${label} needs "youtubeId" (the part after v= in the YouTube link)`);
    if (v.provider === 'drive' && !/^https:\/\//.test(v.url || '')) errors.push(`content/videos.json: ${label} needs "url" (the Google Drive share link)`);
    let cover = null;
    if (v.cover) {
      const f = path.join(CONTENT, 'videos', v.cover);
      if (await exists(f)) cover = await responsive(f, `videos/${path.parse(v.cover).name}`, 1600);
      else warnings.push(`content/videos.json: ${label} cover "${v.cover}" not found in content/videos/`);
    }
    out.push({
      title: v.title, year: v.year, runtime: v.runtime, role: v.role, location: v.location,
      category: v.category, provider: v.provider, youtubeId: v.youtubeId, url: v.url,
      description: v.description, cover,
    });
  }
  return out;
}

async function buildProjects() {
  const base = path.join(CONTENT, 'photo');
  const dirs = (await fs.readdir(base, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && !d.name.startsWith('.') && !d.name.startsWith('_'))
    .map((d) => d.name)
    .sort(byName);

  const out = [];
  for (const dir of dirs) {
    const folder = path.join(base, dir);
    const file = path.join(folder, 'project.json');
    const p = await readJson(file);
    if (!p) continue;
    need(p, 'title', file);
    const layout = p.layout || 'masonry';
    if (!LAYOUTS.includes(layout)) errors.push(`${rel(file)}: layout "${layout}" should be "masonry" or "carousel"`);

    const slug = dir.replace(/^\d+[-_ ]*/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || dir;
    const files = (await fs.readdir(folder)).filter((f) => IMAGE.test(f)).sort(byName);
    const coverName = p.cover || files.find((f) => /^cover\./i.test(f)) || files[0];
    const photoFiles = files.filter((f) => !/^cover\./i.test(f));
    if (!photoFiles.length) warnings.push(`content/photo/${dir}: no photos found`);

    const large = layout === 'carousel' ? 3000 : 2400;
    const photos = [];
    for (const f of photoFiles) {
      const img = await responsive(path.join(folder, f), `photo/${slug}/${path.parse(f).name}`, large);
      photos.push({ ...img, alt: (p.alt && p.alt[f]) || '' });
    }
    let cover = null;
    if (coverName && (await exists(path.join(folder, coverName)))) {
      cover = await responsive(path.join(folder, coverName), `photo/${slug}/cover`, 2400);
    } else if (p.cover) {
      warnings.push(`${rel(file)}: cover "${p.cover}" not found in the folder`);
    }
    out.push({ slug, title: p.title, year: p.year, location: p.location, intro: p.intro, layout, cover, photos });
    console.log(`  photo/${dir}: ${photos.length} photos (${layout})`);
  }
  return out;
}

// ---------------------------------------------------------- main

async function dirSize(dir) {
  let total = 0;
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    total += e.isDirectory() ? await dirSize(p) : (await fs.stat(p)).size;
  }
  return total;
}

async function main() {
  const t0 = Date.now();

  // Check all JSON first, so a typo fails fast before any image work.
  const jsonFiles = ['site.json', 'about.json', 'videos.json'].map((f) => path.join(CONTENT, f));
  for (const d of await fs.readdir(path.join(CONTENT, 'photo'), { withFileTypes: true })) {
    if (d.isDirectory() && !d.name.startsWith('.') && !d.name.startsWith('_')) jsonFiles.push(path.join(CONTENT, 'photo', d.name, 'project.json'));
  }
  for (const f of jsonFiles) await readJson(f);
  if (errors.length) return finish(t0);

  await fs.rm(DIST, { recursive: true, force: true });
  await fs.mkdir(CACHE, { recursive: true });
  await fs.cp(SRC, DIST, { recursive: true });

  const fontDir = path.join(ROOT, 'node_modules', '@fontsource', 'karla', 'files');
  await fs.mkdir(path.join(DIST, 'fonts'), { recursive: true });
  for (const w of [300, 400]) {
    await fs.copyFile(path.join(fontDir, `karla-latin-${w}-normal.woff2`), path.join(DIST, 'fonts', `karla-${w}.woff2`));
  }

  console.log('Building content');
  const site = await buildSite();
  const about = await buildAbout();
  const videos = await buildVideos();
  const projects = await buildProjects();
  if (errors.length) return finish(t0);

  await fs.writeFile(path.join(DIST, 'data.json'), JSON.stringify({ site, about, videos, projects }));
  const mb = (await dirSize(DIST)) / 1048576;
  console.log(`Site size: ${mb.toFixed(1)} MB`);
  if (mb > SITE_LIMIT_MB) warnings.push(`The built site is ${mb.toFixed(0)} MB. GitHub Pages allows 1 GB. Consider moving images to external hosting.`);
  finish(t0);
}

function finish(t0) {
  for (const w of warnings) console.warn(`Warning: ${w}`);
  if (errors.length) {
    console.error(`\nBuild stopped. Fix ${errors.length === 1 ? 'this' : 'these'} and try again:`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s. Output: dist/`);
}

main().catch((e) => { console.error(e); process.exit(1); });
