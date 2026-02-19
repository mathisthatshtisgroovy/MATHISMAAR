// convert-works.js → CSV → works.json

const fs = require('fs');
const path = require('path');
const parse = require('csv-parse/sync').parse;

const csvPath = path.join(__dirname, 'works.csv');
const jsonPath = path.join(__dirname, 'data/works.json');

let csvData = fs.readFileSync(csvPath,'utf-8').replace(/^\uFEFF/,''); // strip BOM

const records = parse(csvData,{
  columns:true,
  skip_empty_lines:true,
  delimiter:';'
});

const json = records.map(item => ({
  id: item.id,
  title: item.title,
  year: item.year,
  type: item.type || "",
  order: Number(item.order) || 0,
  hero: `assets/works/${item.thumbnail}`,
  summary: item.summary || "",
  description_long: item.description_long || "",
  gallery: item.gallery || "",   // "IMG1.webp|IMG2.webp|IMG3.webp"
  video: item.video || "",       // full URL or empty
  credits: item.credits || ""
}));

fs.writeFileSync(jsonPath, JSON.stringify(json,null,2));
console.log("✔ works.json generated →", jsonPath);
