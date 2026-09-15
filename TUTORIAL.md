# How to edit mathismaar.com

© Mathis Dabbarh Marsepoil. All rights reserved.

This is the working manual for the site: how to add a new project, change what's already there, preview it on your computer and publish it.

---

## The short version

1. Upload the new images to Cloudflare, in `assets/img/`.
2. Copy an existing project file in `content/works/`, rename it, fill it in.
3. Preview: open a terminal in the project folder and run `npm run serve`, then open http://localhost:8080.
4. In GitHub Desktop: write a commit summary, **Commit to main**, then **Push origin**.
5. About a minute later the site is updated. If you still see the old version, hard-refresh (Ctrl+Shift+R) — pages can be cached for up to 10 minutes.

---

## 1. How the site is put together

| What | Where |
|---|---|
| One file per project (text, images, credits, exhibitions) | `content/works/<project>.md` |
| Page templates (home, project page, info, archive) | `src/` |
| The layout pieces used by every project | `src/_includes/` |
| Colours, spacing, typography | `src/new.css` |
| Archive data | `data/Archive_metadata.csv` → `data/archive.json` |
| CV download | `assets/Resume.pdf` |
| Photos, video, sound | Cloudflare (served through `mathismaar.b-cdn.net`) |
| Build and publishing | GitHub Actions (`.github/workflows/deploy.yml`) |

You never edit the finished website directly. The files above are the source; on every push GitHub builds the site from them and publishes it. Images are not stored in this repository — they live on Cloudflare and the site points to them.

---

## 2. Setting up a computer (once)

Already done on your current computer. On a new one:

1. Install **Node.js** (the "LTS" version) from nodejs.org.
2. Install **Git for Windows** from git-scm.com (this also installs *Git Bash*).
3. Install **GitHub Desktop** and clone `mathisthatshtisgroovy/MATHISMAAR`.
4. Unlock the encrypted files — see [section 9](#9-encryption-and-access). Until you do, the source files are unreadable.
5. Open a terminal in the project folder and run:

   ```
   npm install
   ```

---

## 3. Previewing your changes

In a terminal in the project folder:

```
npm run serve
```

Open **http://localhost:8080**. The preview rebuilds and reloads every time you save a file. Stop it with Ctrl+C.

---

## 4. Publishing

1. Open GitHub Desktop. Your changed files are listed on the left.
2. Tick the files you want to publish, write a short summary, click **Commit to main**.
3. Click **Push origin**.
4. Check progress on GitHub: the repository's **Actions** tab. A green tick means the site is live; a red cross means the build stopped — click it to see which step failed (see [Troubleshooting](#11-troubleshooting)).

**Never commit** the password file, or anything from `copyright-images/`, `new images/` or `node_modules/` (these are already set to be ignored).

---

## 5. Adding a new project

### 5a. Prepare and upload the images

1. **Name them** like the others: `PROJECT_NAME_VISUAL_1.webp`, `PROJECT_NAME_VISUAL_2.webp`, `PROJECT_NAME_PROCESS_1.webp`… Capitals and underscores, no spaces (a stray space before `.webp` breaks the link).
2. **Convert to WebP** (much lighter than JPG/PNG). Keep the long side around 2000–3000 px.
3. **Stamp your copyright** into them (optional but recommended):

   ```
   python tools/stamp_copyright.py "path/to/PROJECT_NAME_VISUAL_1.webp" "path/to/PROJECT_NAME_VISUAL_2.webp"
   ```

   This only writes the metadata; the picture itself is untouched.
4. **Upload** them to Cloudflare, into `assets/img/`.
5. **Check** one works by opening `https://mathismaar.b-cdn.net/assets/img/PROJECT_NAME_VISUAL_1.webp` in a browser.
6. **Note each image's size in pixels**: right-click the file → Properties → Details → Dimensions.

### 5b. Create the project file

Copy an existing file in `content/works/` (for example `borders-of-neutrality.md`) and rename it after the new project, lowercase with hyphens: `my-new-project.md`.

The top part, between the two `---` lines, describes the project:

```yaml
---
slug: my-new-project              # the web address: mathismaar.com/works/my-new-project/
number: "09"                      # for your own reference
title: MY NEW PROJECT
subtitle: ""
year: 2026
medium: Sound Installation
details: ""                       # optional extra line under the medium
abstract: >-
  The short description (45–70 words). Shown in the project's box on the
  home page and at the top of the project page.
featured: true
order: 8                          # position on the home page: 0 is first
tags: []
hero: "MY_NEW_PROJECT_VISUAL_1.webp"
links:
  - { label: "Publication", url: "https://example.com" }
images:
  - { src: "MY_NEW_PROJECT_VISUAL_1.webp", alt: "MY NEW PROJECT installation view", layout: full, w: 4000, h: 2667 }
  - { src: "MY_NEW_PROJECT_VISUAL_2.webp", alt: "MY NEW PROJECT detail", layout: half, w: 3000, h: 2000 }
  - { src: "MY_NEW_PROJECT_VISUAL_3.webp", alt: "MY NEW PROJECT detail", layout: half, w: 3000, h: 2000 }
credits:
  - { role: "Photography", name: "Name Surname" }
exhibitions:
  - { year: 2026, title: "Exhibition name", venue: "Venue", city: "City" }
---
```

- Anything after a `#` is a note to yourself; it never appears on the site.
- Put text containing a colon (`:`) or a comma between quotes.
- `order` decides the position on the home page. To slot a project between two others, change the `order` of the ones after it.
- Empty lists are written `[]` (for example `exhibitions: []`).

### 5c. Choosing how the images sit

Each image has a `layout`:

| layout | what it does |
|---|---|
| `full` | the whole width of the screen |
| `half` | two images side by side — put two `half` images one after the other |
| `third` | three side by side |
| `lead` + `stack` | one big image on the left with two smaller ones stacked on the right — one `lead` followed by two `stack` images. Good for projects that shouldn't take a full screen per image |
| `solo` | one image at a set width on the left, with the rest of the row left open; add `width: 25` (percent) and optionally `note: "text beside it"` |

Images are cropped to the site's standard shape — landscape 3:2, portrait 2:3 — so rows always line up:

- Two images side by side should both be landscape or both portrait.
- To keep an image's own shape, add `ratio: natural`. To force a shape, add `ratio: "4/5"` (or `"16/9"`, etc.).
- The `w` and `h` numbers are the real pixel size. They let the page reserve space before the image loads.
- To add a small caption under an image: `caption: "…"`.

**Video** works the same way, as an entry with a video file:

```yaml
  - { src: "teaser.mp4", folder: "assets/home/", poster: "/assets/home/teaser-poster.webp", alt: "…", layout: full, ratio: "1280/407", w: 1280, h: 407 }
```

It only plays when clicked. `poster` is the still shown before playing: a file in this repository, starting with `/`.

**Coloured lines between images**: add `accent: "#ff2200"` to the project to turn its 2px gaps that colour. Delete the line to go back to black.

### 5d. The long text (optional)

Everything **below** the second `---` is the project's long text. It only appears on the project's own page, before the images, and only if there is text.

```markdown
### Text by Name Surname

First paragraph…

Second paragraph…

#### A subheading

A paragraph after the subheading.  
Two spaces at the end of a line make a line break inside a paragraph.
```

- `### Text by …` makes a small credit line.
- `#### …` makes an italic subheading.
- A blank line between paragraphs. `_italic_` and `**small capitals**`.

**How the text is laid out** (the spread, two portrait pages side by side):

- If the text **fits on the left page**, it goes there and an image fills the right page. Choose the image with `textImage: "FILE_NAME.webp"`; if it's also in the image list, it's left out of the images below.
- If it **doesn't fit**, it runs over both pages as two columns, and there's no image.
- The site decides automatically. If a text is right on the edge and it picks the wrong one, force it with `spread: image` or `spread: columns`.

### 5e. Preview, then publish

Run `npm run serve`, check the home page and the project's page (`/works/my-new-project/`) on a wide window and a narrow one, then commit and push.

---

## 6. Everyday changes

| I want to… | Do this |
|---|---|
| Change a project's text or description | Edit its file in `content/works/` |
| Remove an image | Delete its line from `images:` (and fix any pair it belonged to) |
| Swap an image | Upload the new file to Cloudflare, change `src`, `w` and `h` |
| Add an exhibition | Add a line under `exhibitions:` |
| Change the bio or contact details | `src/info.njk` |
| Replace the CV | Replace `assets/Resume.pdf`, keeping the same name |
| Change the home photos | Upload to Cloudflare `assets/home/`, then edit the `heroImages` list in `src/index.njk` |
| Change the menu | `src/_includes/nav.njk` |
| Change spacing, line thickness, typeface | The variables at the top of `src/new.css`: `--seam` (the 2px lines), `--text-inset`, `--font-serif` |

---

## 7. The archive

1. Upload the images to Cloudflare `assets/img/`.
2. Open `data/Archive_metadata.csv`. Columns are separated by **semicolons**:

   ```
   id;title;year;type;file_main;dimensions;tags;description;scale;credits
   ```

   - `file_main` is just the file name; `assets/img/` is added for you.
   - `type` can hold several values separated by `/` (for example `visual/installation`).
   - `scale` makes a picture bigger in the grid (1, 2, 3).
3. Rebuild the archive data:

   ```
   node data/convert.js
   ```

4. Preview, then commit **both** `Archive_metadata.csv` and `archive.json`.

The filter categories (Sound, Video, Object…) are worked out from the type and tags.

---

## 8. Copyright

- Every page ends with "© [current year] Mathis Dabbarh Marsepoil. All rights reserved." The year updates on its own.
- `LICENSE` states that nothing here may be reused without your written permission.
- Every code file starts with a copyright line.
- **Images**: `python tools/stamp_copyright.py` (no file names) downloads every image the site uses, writes your copyright into them without touching the picture, and saves the stamped copies in `copyright-images/`, in the same folders as on Cloudflare. Upload that folder's contents to Cloudflare to replace the originals. With file names, it stamps those files where they are.

---

## 9. Encryption and access

The source files in the GitHub repository are **encrypted**. On GitHub they look like scrambled text to anyone without the password. On your own computer, once unlocked, they are normal files and you work exactly as before; encryption happens automatically on commit.

**Not encrypted** (on purpose): `README.md`, `LICENSE`, `TUTORIAL.md`, `.gitignore`, `.gitattributes`, the GitHub workflow, `package.json`, `package-lock.json`, `CNAME` and the `transcrypt` tool itself. Everything else is. To encrypt `TUTORIAL.md` too, delete its line from `.gitattributes`.

The website itself is public, as any website is. Encryption protects the source, not the published pages.

### Where the password lives

- In your **password manager** — keep it there. If it's lost, the encrypted files on GitHub can never be read again.
- In the repository's GitHub secret **`TRANSCRYPT_PASSWORD`** (Settings → Secrets and variables → Actions), so GitHub can decrypt and build the site.

### Unlocking on a new computer

After cloning, open **Git Bash** in the project folder and run (with your real password, in single quotes):

```
./transcrypt --cipher=aes-256-cbc --password='YOUR-PASSWORD' --yes
```

### Giving someone access (your consent)

Give them the password, privately. With it they can clone and unlock the source as above.

### Taking access away

Change the password. Your computer must be unlocked, with everything committed:

```
./transcrypt --rekey --password='NEW-PASSWORD' --yes
```

Then commit and push the re-encrypted files, update the `TRANSCRYPT_PASSWORD` secret on GitHub with the new password, and store it in your password manager. Anyone who already copied the old files keeps what they copied; they just can't read anything new.

---

## 10. Where things are on this computer

- The project: `Documents\GitHub\MATHISMAAR`
- Images not in git (CDN copies, sounds, new material): the same folder, kept in OneDrive
- Stamped image copies waiting to be uploaded: `copyright-images\`

---

## 11. Troubleshooting

**The site didn't update.** Open the repository's Actions tab.
- **Red "Decrypt source" step** — the GitHub secret is missing or wrong. Re-enter `TRANSCRYPT_PASSWORD`.
- **Red build step** — usually a typo in a project file: a missing quote, a colon inside unquoted text, or wrong indentation under `images:`. Run `npm run serve` locally; it shows the exact line.
- **Green, but you still see the old version** — hard-refresh (Ctrl+Shift+R) or wait up to 10 minutes.

**An image doesn't show.** Open its `mathismaar.b-cdn.net/assets/img/…` address directly.
- **Not found** — the file isn't uploaded, the folder is wrong, or the name or extension differs (`.jpg` vs `.webp`, a stray space).
- **It opens** — check that `src` in the project file matches it exactly.

**Two images side by side are different heights.** One is portrait and one is landscape. Pair matching shapes, or give both the same `ratio`.

**The long text sits in the wrong layout.** Add `spread: image` or `spread: columns` to the project.

**GitHub Desktop shows an error mentioning "filter" or "crypt".** The files aren't unlocked on this computer. Run the unlock command from section 9 in Git Bash.
