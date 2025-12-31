console.log("Loading archive.json...");

const gridEl = document.getElementById('archive-grid');
const overlayEl = document.getElementById('overlay');
const overlayImg = document.getElementById('overlay-image');
const overlayMeta = document.getElementById('overlay-meta');
const overlayClose = document.getElementById('overlay-close');
const resetBtn = document.getElementById('reset-archive');
const themeButton = document.getElementById('archive-button');

let archiveItems = [];

// ------- helpers -------

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

function weightedScale(original) {
  const r = Math.random();
  if (original === 1) { if (r < 0.80) return 1; if (r < 0.95) return 2; return 3; }
  if (original === 2) { if (r < 0.70) return 2; if (r < 0.90) return 1; return 3; }
  if (original === 3) { if (r < 0.75) return 3; if (r < 0.90) return 2; return 1; }
  return original || 2;
}

// ------- data loading -------

function fetchArchive() {
  fetch("data/archive.json")
    .then(res => {
      console.log("Fetch status:", res.status);
      return res.json();
    })
    .then(data => {
      console.log("Loaded items from JSON:", data.length);
      renderArchive(data);
    })
    .catch(err => console.error("Error fetching JSON:", err));
}

// ----- Smart preload for images near viewport -----

const preloadMargin = 2400; // px above/below viewport to preload & keep decoded
let observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const img = entry.target.querySelector("img");
    if (entry.isIntersecting) {
      // image enters preload zone → ensure it's loaded & stays decoded
      if (img.dataset.src) {
        img.src = img.dataset.src;
        delete img.dataset.src;
      }
    }
  });
}, { rootMargin: `${preloadMargin}px 0px ${preloadMargin}px 0px` });

function observeItems() {
  archiveItems.forEach(i => observer.observe(i.el));
}

// ------- render items -------

function renderArchive(items) {
  if (!gridEl) return;
  gridEl.innerHTML = "";
  archiveItems = [];

  const shuffled = shuffle(items);

  // apply weighted scale
  let processed = shuffled.map(item => ({
    ...item,
    scale: weightedScale(item.scale ?? 2)
  }));

  // enforce at most 4 scale=1 backgrounds
  let bgCount = 0;
  processed = processed.map(item => {
    if (item.scale === 1) {
      if (bgCount < 4) {
        bgCount++;
        return item;
      }
      return { ...item, scale: 2 };
    }
    return item;
  });

  // build DOM
  processed.forEach(item => {
    const div = document.createElement("div");
    div.classList.add("archive-item");
    div.dataset.scale = item.scale;

    const img = document.createElement("img");
    img.dataset.src = item.file_main;
    img.decoding = "async"; 
    img.alt = item.title || item.id || "";
    div.appendChild(img);

    div.addEventListener("click", () => openOverlay(item));
    gridEl.appendChild(div);

    archiveItems.push({
      el: div,
      scale: item.scale,
      baseTop: 0,
      dir: Math.random() < 0.5 ? -1 : 1
    });
  });

  positionItems();
 observeItems(); 
}


// ------- layout / parallax -------

function positionItems() {
  if (!archiveItems.length) return;
  const viewportHeight = window.innerHeight || 800;
  const totalHeight = viewportHeight * 10;

  gridEl.style.minHeight = totalHeight + "px";

  const bgSlots = [
    totalHeight * 0.10,
    totalHeight * 0.30,
    totalHeight * 0.55,
    totalHeight * 0.80
  ];
  let bgIndex = 0;

  archiveItems.forEach(item => {
    const { el, scale } = item;
    let leftVW = randomInRange(-10, 95);         // more spread horizontally
let topPX = randomInRange(0, totalHeight);   // much taller vertical canvas


    if (scale === 1) {
      if (bgIndex < bgSlots.length) {
        topPX = bgSlots[bgIndex] + randomInRange(-200, 150);
        bgIndex++;
      }
      if (Math.random() < 0.85) {
        leftVW = 50;
      } else {
        leftVW = randomInRange(-10, 110);
      }
    }

    if (Math.random() < 0.15) {
      leftVW = Math.random() < 0.5 ? -5 : 105;
    }

    el.style.left = leftVW + "vw";
    item.baseTop = topPX;
    el.style.top = topPX + "px";
  });

  onScroll();
}

function onScroll() {
  const scrollY = window.scrollY || 0;

  archiveItems.forEach(item => {
    const { el, scale, baseTop } = item;

    // item visibility skip based on known baseTop instead of layout query
// (prevents browser reflow + keeps memory, no reload feeling)
const itemScreenPos = baseTop - scrollY;    // no DOM read, just math
if (itemScreenPos < -500 || itemScreenPos > window.innerHeight + 500) return;
 


    // much slower + smoother movement
    const factor = scale === 1 ? 0.02 : scale === 2 ? 0.2 : 0.3;
    const offset = scrollY * factor;



    el.style.transform = `translate3d(0, ${offset}px, 0)`; // better GPU acceleration
  });
}


let ticking = false;
window.addEventListener("scroll", () => {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(() => {
      onScroll();
      ticking = false;
    });
  }
});
window.addEventListener("resize", positionItems);

// ------- overlay -------

function openOverlay(item) {
  if (!overlayEl) return;
  overlayImg.src = item.file_main;
  overlayMeta.textContent = [item.title, item.year, (item.types || []).join(" / ")]
    .filter(Boolean)
    .join(" · ");
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


// --- Slow down scroll speed ---
let scrollTarget = 0;
let currentScroll = 0;

window.addEventListener("wheel", (e) => {
  e.preventDefault(); // stop default wheel scroll
  scrollTarget += e.deltaY * 0.35; // 👉 0.35 = 65% slower (tweak to taste)
}, { passive:false });

function smoothScrollStep() {
  currentScroll += (scrollTarget - currentScroll) * 0.18; 
  window.scrollTo(0, currentScroll);
  requestAnimationFrame(smoothScrollStep);
}
smoothScrollStep();


// ------- buttons -------

if (themeButton) {
  themeButton.addEventListener("click", () => {
    document.body.classList.toggle("theme-warm");
    if (typeof handleSoundState === "function") {
      handleSoundState();
    }
  });
}

if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    fetchArchive();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// initial load
fetchArchive();



