// convert.js — FIXED for semicolons + BOM strip

const fs = require('fs');
const path = require('path');
const parse = require('csv-parse/sync').parse;

const csvPath = path.join(__dirname, 'Archive_metadata.csv');
const jsonPath = path.join(__dirname, 'archive.json');

// Read CSV + remove BOM if present
let csvData = fs.readFileSync(csvPath, 'utf-8').replace(/^\uFEFF/, '');

// Parse CSV using semicolon as delimiter
const records = parse(csvData, {
  columns: true,
  skip_empty_lines: true,
  delimiter: ';'
});

// Convert to JSON structure
const jsonData = records.map(item => ({
  id: item.id,
  title: item.title,
  year: item.year ? parseInt(item.year) : null,
  types: item.type ? item.type.split('/').map(s => s.trim()) : [],
  file_main: `/assets/img/${item.file_main}`, // prefix auto
  tags: item.tags ? item.tags.split(',').concat(item.tags.split(';')).map(s => s.trim()).filter(Boolean) : [],
  description: item.description || "",
  credits: item.credits || "",
  scale: item.scale ? Number(item.scale) : null
}));

// Write output file
fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));

console.log(`✔ archive.json generated successfully with ${jsonData.length} items.`);
