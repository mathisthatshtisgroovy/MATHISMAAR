const id = location.hash.replace("#","").trim();
fetch("data/works.json").then(r=>r.json()).then(list=>{

  const project = list.find(p=>p.id === id) || list[0];
  const el = document.getElementById("work-container");

  // --- HERO ---
  const hero = document.createElement("div");
  hero.className = "work-hero";
  hero.style.backgroundImage = `url(${assetUrl(project.hero)})`;
  el.appendChild(hero);

  // --- GALLERY ---
  const images = (project.gallery || "").split("|").map(s=>s.trim()).filter(Boolean);
  if (images.length) {
    const galleryWrap = document.createElement("div");
    galleryWrap.className = "gallery";
    galleryWrap.id = "gallery";

    images.forEach(src => {
      const img = document.createElement("img");
      img.src = assetUrl(`assets/works/${src}`);
      img.alt = project.title;
      galleryWrap.appendChild(img);
    });
    el.appendChild(galleryWrap);

    // Red circle nav buttons
    const prev = document.createElement("button");
    const next = document.createElement("button");
    prev.className = "gallery-nav gallery-prev";
    next.className = "gallery-nav gallery-next";
    prev.setAttribute("aria-label", "Previous");
    next.setAttribute("aria-label", "Next");
    document.body.appendChild(prev);
    document.body.appendChild(next);

    prev.onclick = () => galleryWrap.scrollBy({left: -window.innerWidth * 0.85, behavior: "smooth"});
    next.onclick = () => galleryWrap.scrollBy({left:  window.innerWidth * 0.85, behavior: "smooth"});

    // Hide arrows at ends
    function updateArrows() {
      prev.style.opacity = galleryWrap.scrollLeft < 10 ? "0.2" : "0.85";
      next.style.opacity = galleryWrap.scrollLeft + galleryWrap.clientWidth >= galleryWrap.scrollWidth - 10 ? "0.2" : "0.85";
    }
    galleryWrap.addEventListener("scroll", updateArrows);
    updateArrows();
  }

  // --- VIDEO (Vimeo) ---
  if (project.video && project.video.trim()) {
    const mediaBlock = document.createElement("div");
    mediaBlock.className = "work-video";
    let embedUrl = project.video;
    if (project.video.includes("vimeo.com/") && !project.video.includes("player.vimeo")) {
      const vid = project.video.split("vimeo.com/")[1].split("?")[0];
      embedUrl = `https://player.vimeo.com/video/${vid}?autoplay=0&title=0&byline=0&portrait=0`;
    }
    const isEmbed = project.video.includes("vimeo.com") || project.video.includes("youtube");
    mediaBlock.innerHTML = isEmbed
      ? `<iframe src="${embedUrl}" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`
      : `<video src="${project.video}" controls preload="metadata"></video>`;
    el.appendChild(mediaBlock);
  }

  // --- INFO ---
  const info = document.createElement("section");
  info.className = "work-info";
  info.innerHTML = `
    <h1>${project.title}</h1>
    <div class="work-meta">${project.year}${project.type ? " · " + project.type : ""}</div>
    ${project.summary ? `<p class="work-summary">${project.summary}</p>` : ""}
  `;

  if (project.description_long && project.description_long.trim()) {
    const desc = document.createElement("div");
    desc.className = "work-description";
    desc.innerHTML = project.description_long
      .split(/\n+/).map(p=>p.trim()).filter(Boolean).map(p=>`<p>${p}</p>`).join("");
    info.appendChild(desc);
  }

  if (project.credits && project.credits.trim()) {
    const credits = document.createElement("p");
    credits.className = "work-credits";
    credits.textContent = project.credits;
    info.appendChild(credits);
  }

  el.appendChild(info);
});