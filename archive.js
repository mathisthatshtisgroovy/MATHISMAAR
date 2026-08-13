console.log("Loading archive.json...");

const gridEl = document.getElementById('archive-grid');
const filtersEl = document.getElementById('archive-filters');
const overlayEl = document.getElementById('overlay');
const overlayImg = document.getElementById('overlay-image');
const overlayMeta = document.getElementById('overlay-meta');
const overlayClose = document.getElementById('overlay-close');
const resetBtn = document.getElementById('reset-archive');
const themeButton = document.getElementById('archive-button');

let allItems = [];
let projectTitles = [];
let activeFilter = "All";

function fetchArchive() {
  fetch("data/archive.json")
    .then(res => res.json())
    .then(data => {
      console.log("Loaded items from JSON:", data.length);
      // newest year first; stable sort keeps each project's images grouped together
      allItems = data.slice().sort((a, b) => (b.year || 0) - (a.year || 0));
      projectTitles = [...new Set(allItems.map(i => i.title).filter(Boolean))];
      buildFilters();
      renderArchive();
    })
    .catch(err => console.error("Error fetching archive JSON:", err));
}

function buildFilters() {
  if (!filtersEl) return;
  filtersEl.innerHTML = "";

  const makeChip = (label, value) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "filter-chip";
    btn.textContent = label;
    btn.setAttribute("aria-pressed", value === activeFilter ? "true" : "false");
    btn.onclick = () => {
      activeFilter = value;
      renderArchive();
      syncChips();
    };
    return btn;
  };

  filtersEl.appendChild(makeChip("All", "All"));
  projectTitles.forEach(title => filtersEl.appendChild(makeChip(title, title)));
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

function renderArchive() {
  if (!gridEl) return;
  gridEl.innerHTML = "";

  const items = activeFilter === "All"
    ? allItems
    : allItems.filter(item => item.title === activeFilter);

  items.forEach(item => {
    const fig = document.createElement("figure");
    fig.className = "archive-item";

    const img = document.createElement("img");
    img.src = assetUrl(item.file_main);
    img.loading = "lazy";
    img.decoding = "async";
    img.alt = item.title || item.id || "";
    fig.appendChild(img);

    fig.addEventListener("click", () => openOverlay(item));
    gridEl.appendChild(fig);
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

if (overlayClose) {
  overlayClose.addEventListener("click", closeOverlay);
}
if (overlayEl) {
  overlayEl.addEventListener("click", e => {
    if (e.target === overlayEl) closeOverlay();
  });
}
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeOverlay();
});

if (themeButton) {
  themeButton.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    if (typeof handleSoundState === "function") {
      handleSoundState();
    }
  });
}

if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    activeFilter = "All";
    renderArchive();
    syncChips();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

fetchArchive();
