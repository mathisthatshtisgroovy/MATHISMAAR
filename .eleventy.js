// © Mathis Dabbarh Marsepoil. All rights reserved. See LICENSE.
const fs = require("fs");
const path = require("path");

module.exports = function (eleventyConfig) {
  // static files the new templates reuse as-is from the current site
  eleventyConfig.addPassthroughCopy("global.css");
  eleventyConfig.addPassthroughCopy("archive.css");
  eleventyConfig.addPassthroughCopy("work.css");
  eleventyConfig.addPassthroughCopy("home.css");
  eleventyConfig.addPassthroughCopy("works.css");
  eleventyConfig.addPassthroughCopy("sound.js");
  eleventyConfig.addPassthroughCopy("transition.js");
  eleventyConfig.addPassthroughCopy("archive.js");
  eleventyConfig.addPassthroughCopy("data/sound_archive.json");
  // archive.js fetches "data/archive.json" relative to the page, and the page
  // lives at /archive/ — so the data has to sit beside it. leaves archive.js
  // untouched.
  eleventyConfig.addPassthroughCopy({ "data/archive.json": "archive/data/archive.json" });
  eleventyConfig.addPassthroughCopy("favicon.ico");
  eleventyConfig.addPassthroughCopy("CNAME");
  eleventyConfig.addPassthroughCopy({ "src/new.css": "new.css" });
  // the CV rides along in the build rather than the CDN — it's 117KB and this
  // way there's no upload step to forget
  eleventyConfig.addPassthroughCopy("assets/Resume.pdf");

  // one work = one file in content/works/*.md — this collection is what
  // src/works.11tydata.js paginates into a /works/<slug>/ page each
  eleventyConfig.addCollection("works", function () {
    const dir = path.join(__dirname, "content/works");
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => {
        const { data, content } = require("gray-matter")(
          fs.readFileSync(path.join(dir, f), "utf-8")
        );
        return { data, templateContent: content, filePathStem: "/" + data.slug };
      })
      .sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0));
  });

  eleventyConfig.addShortcode("year", () => String(new Date().getFullYear()));

  eleventyConfig.addFilter("markdown", function (str) {
    return require("markdown-it")({ html: false }).render(str || "");
  });

  // markdown-it runs with html off, so a leftover <!-- note --> in a work's
  // body would print as visible text — drop comments before anything renders
  eleventyConfig.addFilter("stripComments", (s) =>
    String(s || "").replace(/<!--[\s\S]*?-->/g, "")
  );
  // the portrait shown beside a work's body text: `textImage` names a file
  // from images[], otherwise it's the work's second image
  eleventyConfig.addFilter("textImage", (data) => {
    const imgs = (data && data.images) || [];
    if (data && data.textImage) return imgs.find((i) => i.src === data.textImage) || { src: data.textImage };
    return imgs[1] || imgs[0];
  });
  eleventyConfig.addFilter("withoutSrc", (images, src) =>
    (images || []).filter((i) => i.src !== src)
  );

  // does a work's long text fit the left page of the spread ("image": its image
  // takes the right page) or does it need both pages as two columns
  // ("columns")? every size in the spread is in vw, so the answer holds at any
  // desktop width — estimated from characters per line and lines per page,
  // calibrated against the rendered spread: ~51 characters a line and ~27
  // lines a page. a subheading, or a credit line after text, takes about 3
  // lines with its spacing; a credit line opening the text about 1.5. texts
  // within a line or so of the limit should be pinned with `spread:`.
  const SPREAD_CHARS_PER_LINE = 51;
  const SPREAD_LINES_PER_PAGE = 27;
  eleventyConfig.addFilter("spreadMode", (body, override) => {
    if (override === "image" || override === "columns") return override;
    let lines = 0;
    for (const block of String(body || "").split(/\n\s*\n/)) {
      const b = block.trim();
      if (!b) continue;
      if (b.startsWith("#")) {
        lines += b.startsWith("####") || lines > 0 ? 3 : 1.5;
        continue;
      }
      for (const row of b.split("\n")) {
        const text = row.replace(/[*_]/g, "").trim();
        lines += Math.max(1, Math.ceil(text.length / SPREAD_CHARS_PER_LINE));
      }
      lines += 1;
    }
    return lines - 1 <= SPREAD_LINES_PER_PAGE ? "image" : "columns";
  });

  // mirrors the client-side assetUrl() bootstrap in base.njk, for building
  // absolute CDN urls server-side (og:image, srcset, etc.)
  eleventyConfig.addFilter("assetPath", function (filename, folder) {
    if (!filename) return "";
    // a leading slash means the file ships with the site rather than the CDN
    if (filename.startsWith("http") || filename.startsWith("/")) return filename;
    return "https://mathismaar.b-cdn.net/" + (folder || "") + filename;
  });

  // not on the CDN, so served from the repo until it's uploaded to assets/img/.
  // this is an 1800px-tall copy (179KB) — the original is 9.3MB.
  eleventyConfig.addPassthroughCopy("assets/works/SYRINX_VISUAL_7-1800.webp");
  // still frame shown on the Birds and Machines video until it's played
  eleventyConfig.addPassthroughCopy("assets/home/teaser-poster.webp");

  eleventyConfig.addFilter("findWork", function (works, slug) {
    return (works || []).find((w) => w.data.slug === slug);
  });

  eleventyConfig.addFilter("workNeighbors", function (works, slug) {
    const list = works || [];
    const i = list.findIndex((w) => w.data.slug === slug);
    if (i === -1) return { prev: null, next: null };
    return {
      prev: list[(i - 1 + list.length) % list.length],
      next: list[(i + 1) % list.length],
    };
  });

  // groups a work's images[] into rows. "full" takes the whole viewport
  // width on its own row; "half" pairs up 2-across; "third" runs 3-across.
  // four consecutive halves therefore land as two stacked 2-up rows — the
  // 2x2 that fills a screen with landscape images.
  const PER_ROW = { half: 2, third: 3 };
  eleventyConfig.addFilter("galleryRows", function (images) {
    const rows = [];
    let current = [];
    const flush = () => {
      if (current.length) rows.push(current);
      current = [];
    };
    (images || []).forEach((img) => {
      // "lead" opens a big-left / stacked-right row and swallows the
      // "stack" images that follow it — three images in one row's height,
      // for works that shouldn't get a full screen each
      if (img.layout === "lead") {
        flush();
        current.push(img);
        return;
      }
      if (img.layout === "stack") {
        if (current.length && current[0].layout === "lead") current.push(img);
        return;
      }
      if (current.length && current[0].layout === "lead") flush();
      // "solo" is a single image at a set fraction of the width, left, with
      // the rest of the row left open for text
      if (img.layout === "full" || img.layout === "solo") {
        flush();
        rows.push([img]);
        return;
      }
      if (current.length && current[0].layout !== img.layout) flush();
      current.push(img);
      if (current.length === (PER_ROW[img.layout] || 2)) flush();
    });
    flush();
    return rows;
  });

  // every frame is cropped to a house ratio so rows stay uniform regardless
  // of what the source file happens to be. portrait sources get the portrait
  // standard. set `ratio: natural` on an image to opt out of cropping.
  eleventyConfig.addFilter("isVideo", function (src) {
    return /\.(mp4|webm|mov)$/i.test(String(src || ""));
  });

  eleventyConfig.addFilter("frameRatio", function (img) {
    if (!img) return "3 / 2";
    if (img.ratio === "natural") return "auto";
    if (img.ratio) return String(img.ratio).replace("/", " / ");
    if (img.w && img.h && img.w / img.h < 1) return "2 / 3";
    return "3 / 2";
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      output: "_site",
    },
    templateFormats: ["njk", "html"],
    htmlTemplateEngine: "njk",
  };
};
