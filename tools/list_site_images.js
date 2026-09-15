// © Mathis Dabbarh Marsepoil. All rights reserved. See LICENSE.
// prints, as JSON, every CDN image path the site uses: work images, text-spread
// images, archive images and the home hero rotation. used by stamp_copyright.py.
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const root = path.join(__dirname, "..");
const found = new Set();

for (const f of fs.readdirSync(path.join(root, "content/works"))) {
  const d = matter(fs.readFileSync(path.join(root, "content/works", f), "utf8")).data;
  for (const img of d.images || []) {
    if (!/\.(mp4|webm|mov)$/i.test(img.src)) found.add((img.folder || "assets/img/") + img.src);
  }
  if (d.textImage && !d.textImage.startsWith("/")) found.add("assets/img/" + d.textImage);
}
for (const item of require(path.join(root, "data/archive.json"))) {
  found.add(String(item.file_main).replace(/^\//, ""));
}
for (const hero of ["hero1.webp", "hero2.webp", "hero3.webp"]) found.add("assets/home/" + hero);

process.stdout.write(JSON.stringify([...found]));
