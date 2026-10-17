// Single-page app: reads data.json (made by scripts/build.mjs) and renders
// each page into <main id="view"> based on the URL hash.
//   #/                home reel
//   #/video?cat=...   video list, optional category filter
//   #/photo           photo projects
//   #/photo/<slug>    one project
//   #/about           about and contact

import { mountMasonry } from "./masonry.js";
import { mountCarousel } from "./carousel.js";
import { openLightbox, closeLightbox } from "./lightbox.js";
import { openPlayer, closePlayer } from "./player.js";

const view = document.getElementById("view");
let data = null;
let cleanup = null;
let lastSection = null;
let firstRender = true;

const CATS = [
  { key: "all", label: "All" },
  { key: "documentary", label: "Documentary", color: "var(--accent)" },
  { key: "fiction", label: "Fiction", color: "var(--secondary)" },
  { key: "news", label: "News video", color: "var(--primary)" },
];

const esc = (s = "") =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

const ICON_IG =
  '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor"/></svg>';
const ICON_DL =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg>';
const arrow = (dir) =>
  `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" aria-hidden="true"><path d="${dir === "prev" ? "M15 4l-8 8 8 8" : "M9 4l8 8-8 8"}"/></svg>`;

// An <img> for a processed image, or a grey placeholder when it is missing.
function img(image, { sizes = "100vw", lazy = true, alt = "", cls = "" } = {}) {
  if (!image) return '<div class="placeholder">Image</div>';
  const srcset = image.sm
    ? ` srcset="${image.sm} 800w, ${image.src} ${image.w}w" sizes="${sizes}"`
    : "";
  return `<img${cls ? ` class="${cls}"` : ""} src="${image.src}"${srcset} width="${image.w}" height="${image.h}" alt="${esc(alt)}"${lazy ? ' loading="lazy"' : ""} decoding="async">`;
}

// ---------------------------------------------------------- pages

function homePage() {
  const r = data.site.reel || {};
  const media = r.src
    ? `<video muted loop playsinline preload="auto"${r.poster ? ` poster="${r.poster}"` : ""} aria-hidden="true"></video>`
    : r.poster
      ? `<img src="${r.poster}" alt="">`
      : '<div class="placeholder">Reel</div>';
  return {
    tab: "home",
    html: `<section class="reel" aria-label="Showreel">${media}<p class="reel-credit">© ${new Date().getFullYear()} ${esc(data.site.name)}</p></section>`,
    after() {
      const v = view.querySelector(".reel video");
      if (!v) return;
      const small = r.srcMobile && matchMedia("(max-width: 700px)").matches;
      v.src = small ? r.srcMobile : r.src;
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
        v.play().catch(() => {});
    },
  };
}

function videoPage(query) {
  const cat = CATS.some((c) => c.key === query.get("cat"))
    ? query.get("cat")
    : "all";
  const list = data.videos.filter((v) => cat === "all" || v.category === cat);
  const count = (key) =>
    key === "all"
      ? data.videos.length
      : data.videos.filter((v) => v.category === key).length;

  const filters = CATS.filter((c) => c.key === "all" || count(c.key) > 0)
    .map(
      (c) =>
        `<a class="flt" data-cat="${c.key}" href="#/video${c.key === "all" ? "" : `?cat=${c.key}`}"${c.key === cat ? ' aria-current="true"' : ""}>${c.label}<span class="n">${count(c.key)}</span></a>`,
    )
    .join("");

  const cards = list
    .map((v) => {
      const c = CATS.find((x) => x.key === v.category) || CATS[0];
      const title = `${esc(v.title)}${v.year ? ` (${esc(v.year)})` : ""}`;
      const metaBits = [
        v.runtime,
        [v.role].filter(Boolean).join(", "),
        v.location,
      ].filter(Boolean);
      const trigger =
        v.provider === "drive"
          ? `<a class="stretch" href="${esc(v.url)}" target="_blank" rel="noopener"><span class="ul vtitle">${title}</span></a>`
          : `<button class="stretch" type="button" data-play="${data.videos.indexOf(v)}"><span class="ul vtitle">${title}</span></button>`;
      return `
      <article class="card vcard" data-cat="${c.key}">
        <div class="vrow">
          <div class="clip vcover">${img(v.cover, { sizes: "(min-width: 900px) 67vw, 100vw" })}</div>
          <div class="vside">
            <div class="vhead">
              ${trigger}
              <div class="meta"><span class="hl">${metaBits.map(esc).join(" | ")}</span></div>
            </div>
            <div class="vtxt">
              <div class="meta cat"><span class="dot" style="background:${c.color}"></span>${c.label}</div>
              ${v.description ? `<p>${esc(v.description)}</p>` : ""}
            </div>
          </div>
        </div>
      </article>`;
    })
    .join("");

  return {
    tab: "video",
    title: "Video",
    html: `<div class="filters" role="navigation" aria-label="Filter by category">${filters}</div><div class="vlist">${cards}</div>`,
    after() {
      const onClick = (e) => {
        const b = e.target.closest("[data-play]");
        if (!b) return;
        const v = data.videos[+b.dataset.play];
        openPlayer(
          {
            youtubeId: v.youtubeId,
            title: `${v.title}${v.year ? ` (${v.year})` : ""}`,
          },
          b,
        );
      };
      view.addEventListener("click", onClick);
      return () => view.removeEventListener("click", onClick);
    },
  };
}

function photoIndexPage() {
  const cards = data.projects
    .map(
      (p) => `
    <a class="card" href="#/photo/${p.slug}">
      <div class="clip">${img(p.cover, { sizes: "(min-width: 700px) 50vw, 100vw" })}</div>
      <span class="ptitle"><span class="ul">${esc(p.title)}</span></span>
    </a>`,
    )
    .join("");
  return {
    tab: "photo",
    title: "Photo",
    html: `<div class="pgrid">${cards}</div>`,
  };
}

function introBlock(p, extra = "") {
  const meta = [p.year, p.location, extra].filter(Boolean).map(esc).join(" · ");
  return `
    <section class="intro">
      <h1>${esc(p.title)}</h1>
      <div>${p.intro ? `<p>${esc(p.intro)}</p>` : ""}${meta ? `<div class="meta">${meta}</div>` : ""}</div>
    </section>`;
}

function projectPage(slug) {
  const p = data.projects.find((x) => x.slug === slug);
  if (!p) return notFoundPage();

  if (p.layout === "carousel") {
    const slides = p.photos
      .map(
        (ph, i) =>
          `<div class="cslide" aria-roledescription="slide" aria-label="${i + 1} of ${p.photos.length}">${img(ph, { lazy: i > 1, alt: ph.alt })}</div>`,
      )
      .join("");
    return {
      tab: "photo",
      title: p.title,
      html: `
        <section aria-label="${esc(p.title)}" aria-roledescription="carousel" tabindex="0" class="cwrap">
          <div class="carousel">
            <button class="arrow c-prev" type="button" aria-label="Previous spread">${arrow("prev")}</button>
            <div class="cview"><div class="ctrack">${slides}</div></div>
            <button class="arrow c-next" type="button" aria-label="Next spread">${arrow("next")}</button>
          </div>
          <p class="meta ccount" aria-live="polite"></p>
        </section>
        ${introBlock(p)}`,
      after: () => mountCarousel(view.querySelector(".cwrap"), p.photos.length),
    };
  }

  return {
    tab: "photo",
    title: p.title,
    html: `
      ${p.cover ? img(p.cover, { lazy: false, cls: "hero", alt: "" }) : '<div class="hero"></div>'}
      ${introBlock(p, `${p.photos.length} photographs`)}
      <section class="masonry" aria-label="Photographs"></section>`,
    after: () =>
      mountMasonry(view.querySelector(".masonry"), p.photos, (i, from) =>
        openLightbox(p.photos, i, from),
      ),
  };
}

function aboutPage() {
  const a = data.about;
  const bio = (a.bio || []).map((t) => `<p>${esc(t)}</p>`).join("");
  const tel = a.phone ? a.phone.replace(/[^\d+]/g, "") : "";
  return {
    tab: "about",
    title: "About",
    html: `
      <div class="about">
        <div class="abt">
          <div>
            <h1>${esc(data.site.name)}</h1>
            <div class="meta">${esc(data.site.title || "")}</div>
            ${bio}
          </div>
          <div class="clip portrait">${img(a.portrait, { lazy: false, alt: `Portrait of ${data.site.name}`, sizes: "414px" })}</div>
        </div>
        <div class="ctrow">
          ${a.email ? `<div><div class="meta">Email</div><a class="lk cv" href="mailto:${esc(a.email)}">${esc(a.email)}</a></div>` : ""}
          ${a.phone ? `<div><div class="meta">Phone</div><a class="lk cv" href="tel:${esc(tel)}">${esc(a.phone)}</a></div>` : ""}
          ${a.base ? `<div><div class="meta">Base</div><div class="cv">${esc(a.base)}</div></div>` : ""}
          <div class="links">
            ${a.instagram ? `<a class="lk" href="${esc(a.instagram)}" target="_blank" rel="noopener" aria-label="Instagram">${ICON_IG}</a>` : ""}
            ${a.resume ? `<a class="lk dl" href="${a.resume}" download>Download resume ${ICON_DL}</a>` : ""}
          </div>
        </div>
      </div>`,
  };
}

function notFoundPage() {
  return {
    tab: null,
    title: "Not found",
    html: `<section class="intro"><h1>Page not found</h1><div><p><a class="lk" href="#/">Back to the reel</a></p></div></section>`,
  };
}

// ---------------------------------------------------------- router

function parseHash() {
  const h = location.hash.replace(/^#/, "") || "/";
  const [path, qs = ""] = h.split("?");
  return {
    parts: path.split("/").filter(Boolean),
    query: new URLSearchParams(qs),
  };
}

function setNav(tab) {
  document.querySelectorAll("[data-tab]").forEach((a) => {
    const on = a.dataset.tab === tab;
    a.classList.toggle("is-current", on);
    a.classList.toggle("is-long", on && tab !== "home");
    if (on) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  document.body.classList.toggle("is-home", tab === "home");
}

function render() {
  if (!data) return;
  if (location.hash && !location.hash.startsWith("#/")) return;
  const { parts, query } = parseHash();
  const [section, slug] = parts;

  closePlayer();
  closeLightbox();
  closeMenu();
  if (cleanup) {
    cleanup();
    cleanup = null;
  }

  let page;
  if (!section) page = homePage();
  else if (section === "video") page = videoPage(query);
  else if (section === "photo")
    page = slug ? projectPage(decodeURIComponent(slug)) : photoIndexPage();
  else if (section === "about") page = aboutPage();
  else page = notFoundPage();

  const key = `${section || ""}/${slug || ""}`;
  const sameSection = key === lastSection; // e.g. switching a video filter
  lastSection = key;

  view.innerHTML = page.html;
  if (!sameSection) {
    view.classList.remove("rise");
    void view.offsetWidth; // restart the rise animation
    view.classList.add("rise");
    window.scrollTo(0, 0);
    if (!firstRender) view.focus({ preventScroll: true });
  }
  setNav(page.tab);
  document.title = page.title
    ? `${page.title} | ${data.site.name}`
    : `${data.site.name}`;
  cleanup = page.after ? page.after() || null : null;
  firstRender = false;
}

// ---------------------------------------------------------- mobile menu

const menu = document.getElementById("mmenu");
const menuOpenBtn = document.querySelector(".menu-open");

function openMenu() {
  menu.hidden = false;
  menuOpenBtn.setAttribute("aria-expanded", "true");
  document.body.classList.add("no-scroll");
  menu.querySelector(".menu-close").focus();
}
function closeMenu() {
  if (menu.hidden) return;
  menu.hidden = true;
  menuOpenBtn.setAttribute("aria-expanded", "false");
  document.body.classList.remove("no-scroll");
}
menuOpenBtn.addEventListener("click", openMenu);
menu.querySelector(".menu-close").addEventListener("click", () => {
  closeMenu();
  menuOpenBtn.focus();
});
menu.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeMenu();
    menuOpenBtn.focus();
  }
});
// tapping the current page's link does not change the hash, so close explicitly
menu
  .querySelectorAll("a")
  .forEach((a) => a.addEventListener("click", closeMenu));

document.querySelector(".skip").addEventListener("click", () => view.focus());

// ---------------------------------------------------------- start

async function start() {
  try {
    const res = await fetch("data.json", { cache: "no-cache" });
    data = await res.json();
  } catch (err) {
    view.innerHTML =
      '<section class="intro"><h1>Could not load the site content.</h1></section>';
    console.error(err);
    return;
  }
  document.querySelectorAll("[data-name]").forEach((el) => {
    el.textContent = data.site.name;
  });
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
  window.addEventListener("hashchange", render);
  render();
}
start();
