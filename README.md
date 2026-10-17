# Yu Wang Portfolio

Static portfolio site. Content lives in `content/` as JSON files and image folders. A build script turns it into a site in `dist/`, and GitHub Actions publishes it to GitHub Pages on every push.

---

## Updating content

You only ever touch the `content/` folder. After a change, commit and push (GitHub Desktop: write a short summary, click **Commit to main**, then **Push origin**). The site updates in about two minutes.

If something in your change is wrong, the site does **not** break. The old version stays online, and the **Actions** tab on GitHub shows a red mark with a message telling you which file and line to fix.

### Add a photo project

1. Create a folder in `content/photo/`. Start the name with a number, which sets its position on the Photo page:
   `content/photo/04-my-new-project/`
2. Put the photos in it. They appear in **file name order**, so name them `01.jpg`, `02.jpg`, … (use two digits).
3. Add a cover named `cover.jpg`. It is used on the Photo page and as the big image at the top of the project. It is not repeated in the grid.
4. Add `project.json`:

```json
{
  "title": "My New Project",
  "year": 2026,
  "location": "Oakland, California",
  "intro": "Two or three sentences about the project."
}
```

For a photo book made of PDF spreads, add `"layout": "carousel"`. Each spread is one image, shown one at a time with arrows.

**Export settings (Lightroom preset):** JPEG, long edge 2400 px, quality 80, sRGB. Spreads for photo books: long edge 3000 px. Do not upload original files. Everything in the repository is public.

To hide a project without deleting it, put `_` at the start of the folder name: `_04-my-new-project`.

### Add a video

1. Put a cover image (16:9, about 1600 px wide) in `content/videos/`.
2. Open `content/videos.json`, copy one `{ ... }` block, paste it after the last one, and put a comma between them. Then edit the fields:

```json
{
  "title": "For All Of Us",
  "year": 2026,
  "runtime": "12 mins",
  "role": "Co-director/Cinematographer/Editor",
  "location": "San Francisco, California, USA",
  "category": "documentary",
  "provider": "youtube",
  "youtubeId": "AbCdEfGhIjK",
  "cover": "for-all-of-us.jpg",
  "description": "Two or three sentences."
}
```

- `category`: `documentary`, `fiction` or `news`
- `provider`: `youtube` (plays on the site) or `drive` (opens Google Drive in a new tab)
- `youtubeId`: the part after `v=` in the YouTube link. For `drive`, use `"url"` with the full share link instead.
- The order in the file is the order on the page.

### Change the About page

Edit `content/about.json`. Replace `content/about/portrait.jpg` for a new portrait, and add `content/about/resume.pdf` for the resume download.

### Change the home reel

Put a silent loop at `content/reel/reel.mp4` (1080p, H.264, no audio, about 3 Mbps, under 30 MB) and a smaller one at `content/reel/reel-720.mp4` for phones. `poster.jpg` shows while it loads.

### JSON tips

- Every text value needs straight double quotes: `"like this"`.
- Items are separated by commas, but there is **no comma after the last one**.
- If you are unsure, paste the file into [jsonlint.com](https://jsonlint.com) to check it.

---

## Developer notes

### 本地运行

```bash
npm install
npm run dev     
npm run build 
```

