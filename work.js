// work.js — load project page from #id

const id = location.hash.replace("#","").trim();
fetch("data/works.json").then(r=>r.json()).then(list=>{

  const project = list.find(p=>p.id === id) || list[0];
  const el = document.getElementById("work-container");

  // PAGE LAYOUT HTML
  el.innerHTML = `
    <div class="work-hero" style="background-image:url(${project.hero})"></div>
    <div class="gallery" id="gallery"></div>

    <section class="work-info">
      <h1>${project.title}</h1>
      <div class="work-meta">${project.year} · ${project.type}</div>
      <p>${project.summary || ""}</p>
      <p style="opacity:.7;margin-top:40px">${project.credits || ""}</p>
    </section>
  `;

  /* GALLERY BUILD */
  const galleryWrap = document.getElementById("gallery");

  if(project.gallery){
    project.gallery.split("|").forEach(src=>{
      const img = document.createElement("img");
      img.src = `assets/works/${src.trim()}`;
      galleryWrap.appendChild(img);
    });
  }

  /* ADD LEFT + RIGHT NAV BUTTONS */
  const prev=document.createElement("div");
  const next=document.createElement("div");
  prev.className="gallery-nav gallery-prev";
  next.className="gallery-nav gallery-next";
  prev.innerHTML="";
  next.innerHTML="";
  document.body.appendChild(prev);
  document.body.appendChild(next);

  prev.onclick=()=> galleryWrap.scrollBy({left:-600, behavior:"smooth"});
  next.onclick=()=> galleryWrap.scrollBy({left:600, behavior:"smooth"});
});
