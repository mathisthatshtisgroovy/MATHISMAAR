document.querySelectorAll('a').forEach(link=>{
  if(link.href.includes('#')) return; // ignore anchor links
  link.addEventListener('click', e=>{
    e.preventDefault();
    document.body.classList.add("fade-out");
    setTimeout(()=>{ window.location = link.href },350);
  });
});

