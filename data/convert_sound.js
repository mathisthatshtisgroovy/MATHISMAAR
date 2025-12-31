// convert_sound.js
// Run inside SOURCE/data with:
//   node convert_sound.js

const fs = require("fs");
const path = require("path");

// Because script is inside /data, don't add "data/" in paths
const INPUT = path.join(__dirname, "sound_archive.csv");
const OUTPUT = path.join(__dirname, "sound_archive.json");

// Convert mm:ss → seconds
function durationToSeconds(str) {
  if (!str) return null;
  const p = str.split(":");
  if (p.length === 2) return (+p[0] * 60) + (+p[1]);
  return Number(str) || null;
}

function parseCSV() {
  const raw = fs.readFileSync(INPUT, "utf8").replace(/\r/g, "").trim();
  const lines = raw.split("\n");

  if (lines.length < 2) return [];

  // Detect delimiter automatically (TAB, comma, semicolon)
  const delimiter = lines[0].includes("\t") ? "\t" :
                    lines[0].includes(",") ? "," : ";";

  const header = lines[0].split(delimiter).map(h => h.trim());

  return lines.slice(1).map(line => {
    const cols = line.split(delimiter).map(v => v.trim());

    const row = {};
    header.forEach((key, i) => {
      row[key] = cols[i] || "";
    });

    // random weight from CSV (1–5 typically)
    let randomVal = 1;
    if (row.random !== undefined && row.random !== "") {
      const n = Number(row.random);
      randomVal = Number.isNaN(n) ? 1 : n;
    }

    return {
      id: row.id,
      file_main: row.file_main,
      title: row.title,
      year: Number(row.year) || null,
      location: row.location,
      tags: (row.tags || "")
        .split(/[,;]+/)
        .map(t => t.trim())
        .filter(Boolean),
      duration: durationToSeconds(row.duration),

      // NEW: random weighting field used by sound.js
      random: randomVal,

      notes: row.notes
    };
  });
}

function run() {
  const result = parseCSV();
  fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2), "utf8");
  console.log("✔ sound_archive.json created");
  if (result[0]) {
    console.log("Example →", result[0]);
  } else {
    console.log("No rows parsed – check CSV.");
  }
}

run();
