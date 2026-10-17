# Yu Wang Portfolio

Static portfolio site. Content lives in `content/` as JSON files and image folders. A build script turns it into a site in `dist/`, and GitHub Actions publishes it to GitHub Pages on every push.

- [Updating content (for Yu)](#updating-content)
- [Developer notes](#developer-notes)

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

需要 Node 20 以上。

```bash
npm install
npm run dev        # 构建并在 http://localhost:8080 预览
npm run build      # 只构建，输出到 dist/
npm run samples    # 重新生成灰色占位图
```

### 结构

```
content/              内容，朋友只改这里
  site.json           名字、标题、首页 reel
  about.json          简介和联系方式
  videos.json         视频列表
  videos/             视频封面
  photo/NN-slug/      每个摄影专题一个文件夹，含 project.json
src/                  网站代码
  index.html
  css/style.css       颜色、字体、动效变量都在 :root
  js/app.js           hash 路由和各页面
  js/masonry.js       保持顺序的瀑布流
  js/carousel.js      画册轮播
  js/lightbox.js      照片全屏查看
  js/player.js        YouTube 播放器
scripts/build.mjs     校验 JSON、扫描照片、生成 WebP、写出 data.json
.github/workflows/    推送到 main 后自动构建和部署
```

### 构建做了什么

1. 先校验所有 JSON。任何一个写错，构建立刻停止，并打印文件名、大概行号和修改建议。
2. 按文件夹名排序摄影专题，按文件名排序照片（`2.jpg` 排在 `10.jpg` 前面）。
3. 用 sharp 为每张图生成大图（2400px，画册 3000px）和小图（800px）两个 WebP，网页用 srcset 自动挑选。文件名带内容哈希，换图后浏览器不会显示旧缓存。EXIF（包括 GPS）不会被带到网站上。
4. 处理过的图缓存在 `.cache/media/`，GitHub Actions 也会缓存它，所以只有新照片需要重新处理。
5. 构建结束时报告站点总大小，超过 900MB 会警告（GitHub Pages 上限 1GB）。

### 部署

1. 在 Yu 的账号下建一个公开仓库，推送这个项目。
2. 仓库 Settings → Pages → Build and deployment → Source 选 **GitHub Actions**。
3. 之后每次推送到 `main` 都会自动部署。自定义域名也在 Settings → Pages 里设置。

### 待替换的占位内容

- `content/photo/01-*`、`02-*`、`03-*` 是灰色示例，换成真实专题后删掉即可。
- `videos.json` 里的 `REPLACE_WITH_YOUTUBE_ID` 和 Drive 链接。
- `about.json` 里的邮箱、电话、所在地、Instagram 链接。
- `content/reel/reel.mp4` 还没有，首页暂时显示 poster。
