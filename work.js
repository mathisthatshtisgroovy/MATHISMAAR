const id = location.hash.replace("#","").trim();

fetch("/data/works.json", { cache: "no-store" }).then(r=>r.json()).then(list=>{

  const project = list.find(p=>p.id === id) || list[0];
  const el = document.getElementById("work-container");

  // --- COVER — full-bleed hero with title/meta on the left, description on the right ---
  const cover = document.createElement("section");
  cover.className = "work-cover";
  if (project.hero) {
    cover.style.backgroundImage = `url(${assetUrl(project.hero)})`;
  }

  const bodyParas = [project.summary, project.description_long]
    .filter(t => t && t.trim())
    .flatMap(t => t.split(/\n+/).map(p => p.trim()).filter(Boolean));

  cover.innerHTML = `
    <div class="work-cover-left">
      <h1>${project.title}</h1>
      <div class="work-cover-meta">${project.year}${project.type ? " · " + project.type : ""}</div>
    </div>
    <div class="work-cover-right">
      ${bodyParas.map(p => `<p>${p}</p>`).join("")}
    </div>
  `;
  el.appendChild(cover);

  // --- GALLERY (gallery images only — hero already shown in the cover) ---
  // assets/works/ = the selected-work main/hero image only.
  // assets/work/  = the rest of the gallery images. Different folders on purpose.
  const images = (project.gallery || "")
    .split("|")
    .map(s => s.trim())
    .filter(Boolean)
    .map(src => `assets/work/${src}`);

  if (images.length > 0) {
    const galleryWrap = document.createElement("div");
    galleryWrap.className = "gallery";

    const track = document.createElement("div");
    track.className = "gallery-track";

    images.forEach((src, i) => {
      const slide = document.createElement("div");
      slide.className = "gallery-slide" + (i === 0 ? " active" : "");
      const img = document.createElement("img");
      img.src = assetUrl(src);
      img.alt = project.title;
      slide.appendChild(img);
      track.appendChild(slide);
    });

    galleryWrap.appendChild(track);
    el.appendChild(galleryWrap);

    // counter (only show if multiple images)
    if (images.length > 1) {
      const counter = document.createElement("div");
      counter.className = "gallery-counter";
      counter.textContent = `1 / ${images.length}`;
      galleryWrap.appendChild(counter);

      let current = 0;

      function goTo(n) {
        track.querySelectorAll(".gallery-slide").forEach(s => s.classList.remove("active"));
        current = (n + images.length) % images.length;
        track.querySelectorAll(".gallery-slide")[current].classList.add("active");
        counter.textContent = `${current + 1} / ${images.length}`;
      }

      // no visible nav buttons — click the left/right half of the image
      // to step back/forward, plus arrow keys
      galleryWrap.classList.add("clickable");
      galleryWrap.addEventListener("click", e => {
        const half = e.clientX < galleryWrap.getBoundingClientRect().left + galleryWrap.clientWidth / 2;
        goTo(half ? current - 1 : current + 1);
      });

      document.addEventListener("keydown", e => {
        if (e.key === "ArrowLeft")  goTo(current - 1);
        if (e.key === "ArrowRight") goTo(current + 1);
      });
    }
  }

  // --- VIDEO ---
  if (project.video && project.video.trim()) {
    const mediaBlock = document.createElement("div");
    mediaBlock.className = "work-video";

    const isEmbed = project.video.includes("vimeo.com") || project.video.includes("youtube.com") || project.video.includes("youtu.be");

    if (isEmbed) {
      let embedUrl = project.video;
      if (project.video.includes("vimeo.com/") && !project.video.includes("player.vimeo.com")) {
        const vimeoId = project.video.split("vimeo.com/")[1].split("?")[0];
        embedUrl = `https://player.vimeo.com/video/${vimeoId}?autoplay=0&title=0&byline=0&portrait=0`;
      }
      mediaBlock.innerHTML = `<iframe src="${embedUrl}" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
    } else {
      mediaBlock.innerHTML = `<video src="${project.video}" controls preload="metadata"></video>`;
    }

    el.appendChild(mediaBlock);
  }

  // --- CREDITS ---
  if (project.credits && project.credits.trim()) {
    const credits = document.createElement("p");
    credits.className = "work-credits";
    credits.textContent = project.credits;
    el.appendChild(credits);
  }
});
