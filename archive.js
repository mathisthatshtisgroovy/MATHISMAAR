console.log("Loading archive.json...");

const gridEl = document.getElementById('archive-grid');
const filtersEl = document.getElementById('archive-filters');
const overlayEl = document.getElementById('overlay');
const overlayImg = document.getElementById('overlay-image');
const overlayMeta = document.getElementById('overlay-meta');
const resetBtn = document.getElementById('reset-archive');
const themeButton = document.getElementById('archive-button');

let allItems = [];
let activeFilter = "All";

// preferred display order — only categories that actually have items show up
const CATEGORY_ORDER = ["Sound", "Video", "Object", "Performance", "Publication", "Research"];

function categorize(item) {
  const types = (item.types || []).map(t => t.toLowerCase());
  const tags = (item.tags || []).map(t => t.toLowerCase());
  const has = (list, ...needles) => needles.some(n => list.some(x => x.includes(n)));
  const isInstallation = has(types, "installation", "multimedia installation", "group show");

  if (has(types, "publication")) return "Publication";
  if (types.includes("object") || has(types, "ceramics", "prototype", "instrument", "interactive object", "lamp")) return "Object";
  if (has(types, "performance", "curation")) return "Performance";
  if (!isInstallation && has(types, "process", "material", "research")) return "Research";
  if (!isInstallation && has(types, "moving image", "video", "stil", "still", "shot", "process narration")) return "Video";
  if (has(tags, "sonic", "sound") || isInstallation) return "Sound";
  return "Video";
}

function fetchArchive() {
  fetch("data/archive.json")
    .then(res => res.json())
    .then(data => {
      console.log("Loaded items from JSON:", data.length);
      // newest year first; stable sort keeps each project's images grouped together
      allItems = data.slice()
        .sort((a, b) => (b.year || 0) - (a.year || 0))
        .map(item => ({ ...item, category: categorize(item) }));
      buildFilters();
      renderArchive();
    })
    .catch(err => console.error("Error fetching archive JSON:", err));
}

function buildFilters() {
  if (!filtersEl) return;
  filtersEl.innerHTML = "";

  const present = new Set(allItems.map(i => i.category));
  const categories = CATEGORY_ORDER.filter(c => present.has(c));

  const makeChip = (label, value) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "filter-chip";
    btn.textContent = label;
    btn.setAttribute("aria-pressed", value === activeFilter ? "true" : "false");
    btn.onclick = () => {
      activeFilter = value;
      applyFilter();
      syncChips();
    };
    return btn;
  };

  filtersEl.appendChild(makeChip("All", "All"));
  categories.forEach(cat => filtersEl.appendChild(makeChip(cat, cat)));
  syncChips();
}

function syncChips() {
  if (!filtersEl) return;
  filtersEl.querySelectorAll(".filter-chip").forEach(chip => {
    const isActive = chip.textContent === activeFilter;
    chip.classList.toggle("active", isActive);
    chip.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

// build every item's DOM node exactly once — filtering just toggles visibility
// afterwards, so already-loaded/decoded images never get torn down and
// re-fetched (which was showing as a "reload" every time you switched filters)
function renderArchive() {
  if (!gridEl) return;
  gridEl.innerHTML = "";

  allItems.forEach(item => {
    const fig = document.createElement("figure");
    fig.className = "archive-item";
    fig.dataset.category = item.category;

    const img = document.createElement("img");
    img.src = assetUrl(item.file_main);
    img.loading = "lazy";
    img.decoding = "async";
    img.alt = item.title || item.id || "";
    fig.appendChild(img);

    fig.addEventListener("click", () => openOverlay(item));
    gridEl.appendChild(fig);
  });

  applyFilter();
}

function applyFilter() {
  if (!gridEl) return;
  gridEl.querySelectorAll(".archive-item").forEach(fig => {
    const show = activeFilter === "All" || fig.dataset.category === activeFilter;
    fig.classList.toggle("hidden", !show);
  });
}

function openOverlay(item) {
  if (!overlayEl) return;
  overlayImg.src = assetUrl(item.file_main);

  const typesStr = (item.types || [])
    .filter(t => t !== "visual") // "visual" is too generic, skip it
    .join(" · ");

  const parts = [];

  if (item.title) {
    parts.push(`<p class="overlay-meta-title">${item.title}</p>`);
  }

  const subline = [item.year, typesStr].filter(Boolean).join(" — ");
  if (subline) {
    parts.push(`<p class="overlay-meta-sub">${subline}</p>`);
  }

  if (item.description && item.description.trim()) {
    parts.push(`<p class="overlay-meta-desc">${item.description.trim()}</p>`);
  }

  if (item.credits && item.credits.trim()) {
    parts.push(`<p class="overlay-meta-credits">${item.credits.trim()}</p>`);
  }

  overlayMeta.innerHTML = parts.join("");
  overlayEl.style.display = "flex";
}

function closeOverlay() {
  if (!overlayEl) return;
  overlayEl.style.display = "none";
  overlayImg.src = "";
}

if (overlayEl) {
  // tap anywhere — backdrop or image — to close. No close button needed,
  // and it's the easiest possible exit on a phone.
  overlayEl.addEventListener("click", closeOverlay);
}
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeOverlay();
});

if (themeButton) {
  themeButton.addEventListener("click", () => toggleDarkMode());
}
if (typeof resumeSoundIfNeeded === "function") {
  resumeSoundIfNeeded();
}

if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    activeFilter = "All";
    applyFilter();
    syncChips();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

fetchArchive();
