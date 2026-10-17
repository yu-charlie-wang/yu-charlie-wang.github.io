// Local preview of dist/ at http://localhost:8080. Run: npm run dev
// Watches content/ and src/ and rebuilds automatically when a file changes.
// After a change, just refresh the browser.
import http from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const PORT = Number(process.env.PORT) || 8080;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
};

// ---------- rebuild on change

let building = false;
let again = false;
function build() {
  if (building) {
    again = true;
    return;
  }
  building = true;
  const p = spawn(process.execPath, [path.join(ROOT, "scripts", "build.mjs")], {
    stdio: "inherit",
  });
  p.on("exit", () => {
    building = false;
    if (again) {
      again = false;
      build();
    } else
      console.log(
        `\nWatching for changes. Preview at http://localhost:${PORT}\n`,
      );
  });
}

let timer = null;
for (const dir of ["content", "src"]) {
  fs.watch(path.join(ROOT, dir), { recursive: true }, (_event, file) => {
    if (!file || /(^|[/\\])\.|~$/.test(file)) return; // skip hidden and temp files
    clearTimeout(timer);
    timer = setTimeout(() => {
      console.log(`\nChanged: ${dir}/${file}`);
      build();
    }, 300);
  });
}

// ---------- static server

http
  .createServer(async (req, res) => {
    const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const file = path.join(DIST, url.endsWith("/") ? `${url}index.html` : url);
    if (!file.startsWith(DIST)) {
      res.writeHead(403).end();
      return;
    }
    try {
      const body = await fsp.readFile(file);
      res.writeHead(200, {
        "Content-Type": TYPES[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(body);
    } catch {
      res.writeHead(404).end("Not found");
    }
  })
  .listen(PORT, () =>
    console.log(
      `Preview at http://localhost:${PORT} (watching content/ and src/)`,
    ),
  );
