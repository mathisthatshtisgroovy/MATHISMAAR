console.log("🔊 Ambient Engine Loaded");

const SOUND_FILE = "data/sound_archive.json";
const FADE = 5.0;
const TARGET_VOL = 0.5;

let audioCtx, masterGain, sounds = [];
let isPlaying = false;
let engineReady = false;
let currentSource = null;
let nextTimeout = null;
let buffers = new Map();
let playExtract = false;  // full by default, randomized per start/skip


// -------------------- INIT --------------------
async function initEngine(){
  if(engineReady) return;

  audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(audioCtx.destination);

  const res = await fetch(SOUND_FILE);
  sounds = await res.json();
  console.log("Loaded", sounds.length, "sound files");

  engineReady = true;
}

// -------------------- LOAD BUFFER --------------------
async function fetchBuffer(pathIn){
  let url = pathIn.replace(/\\/g,"/");
  if(!url.includes("/")) url = "assets/sound/"+url;

  try{
    const res = await fetch(url);
    if(!res.ok) throw("missing");
    const array = await res.arrayBuffer();
    return await audioCtx.decodeAudioData(array);
  }catch(e){
    if(url.endsWith(".mp3")){
      const wav = url.replace(".mp3",".wav");
      try{
        const res = await fetch(wav);
        if(res.ok){
          console.warn("✨ using wav fallback",wav);
          return await audioCtx.decodeAudioData(await res.arrayBuffer());
        }
      }catch{}
    }
    console.error("❌ audio load failed:",url);
    throw e;
  }
}

async function loadBuffer(sound){
  if(buffers.has(sound.id)) return buffers.get(sound.id);
  const buffer = await fetchBuffer(sound.file_main);
  buffers.set(sound.id,buffer);
  return buffer;
}

// -------------------- CORE PLAYBACK --------------------
async function playRandomTrack(){
  // ------------ Weighted selection by sound.random (1–5) ------------
const weighted = [];
sounds.forEach(s => {
  const w = s.random ? Number(s.random) : 1;
  for(let i=0;i<w;i++) weighted.push(s);
});
const sound = weighted[Math.floor(Math.random()*weighted.length)];

  const buffer = await loadBuffer(sound);

  if(currentSource){ try{currentSource.stop();}catch{} }

  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  src.connect(masterGain);
  currentSource = src;

  // --- Decide mode on each track load ---
// Correct logic: full by default, extract is the variation
playExtract = Math.random() < 0.35;   // 35% extract, 65% full  (adjustable)


// ---- Extract logic ----
let offset, playDuration;
if(playExtract){
  const slice = buffer.duration * 0.15;           // 15% extract
  offset = Math.random() * (buffer.duration - slice);
  src.start(0, offset, slice);
} else {
  offset = 0;  // full track start cleanly unless user wants random offsets
  src.start(0); // FULL TRACK playback
}



  const now = audioCtx.currentTime;
  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.setValueAtTime(0,now);
  masterGain.gain.linearRampToValueAtTime(TARGET_VOL,now+FADE);

  console.log("▶",sound.title,"@",offset.toFixed(1)+"s");

// ---- Update Now Playing UI text ----
const label = document.getElementById("now-playing");
if(label){
  label.textContent = playExtract ?
  `Now Playing: ${sound.title} [extract]` :
  `Now Playing: ${sound.title} `;

}


  // ---------- Playback Length Control ----------
if(playExtract){
    // extract auto-fades at end of slice
    const slice = buffer.duration * 0.15;
    const fadeStart = now + slice - FADE;
    const stopTime = fadeStart + FADE;

    masterGain.gain.setValueAtTime(TARGET_VOL, fadeStart);
    masterGain.gain.linearRampToValueAtTime(0, stopTime);

    src.stop(stopTime + 0.1);

} else {
    // full track is played until natural end — no auto skip
    src.onended = ()=> {
        isPlaying && (masterGain.gain.value = 0); // reset gain when done
        // do nothing – user must press skip manually
    };
}
}   


// -------------------- SKIP / NEXT TRACK --------------------
async function skipTrack(){
  if(!isPlaying) return;
  console.log("⏭ next sound");

// --- skipped feedback UI ---
const notice = document.getElementById("skip-notice");
if(notice){
   notice.classList.add("show-skip");
   setTimeout(()=> notice.classList.remove("show-skip"), 4000);
}


  // fade current track out, then trigger new one
  const now = audioCtx.currentTime;
  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.setValueAtTime(masterGain.gain.value, now);
  masterGain.gain.linearRampToValueAtTime(0, now + FADE);

  if(currentSource){
    try { currentSource.stop(now + FADE + 0.05); } catch{}
    currentSource = null;
  }

  if(nextTimeout) clearTimeout(nextTimeout);

  setTimeout(()=>{ if(isPlaying) playRandomTrack(); }, FADE * 1000);
}

// expose for UI
window.skipTrack = skipTrack;


// -------------------- ON/OFF CONTROL --------------------
async function startEngine(){
  if(!engineReady) await initEngine();
  if(audioCtx.state==="suspended") await audioCtx.resume();
  if(isPlaying) return;

  console.log("🌑 Engine ON");
  isPlaying = true;
  playRandomTrack();
}

function stopEngine(){
  if(!isPlaying) return;

  console.log("🌑 Engine OFF");
  isPlaying = false;

  if(nextTimeout) clearTimeout(nextTimeout);

  const now = audioCtx.currentTime;
  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.setValueAtTime(masterGain.gain.value,now);
  masterGain.gain.linearRampToValueAtTime(0,now+FADE);

  const label = document.getElementById("now-playing");
  if(label) label.textContent = "Now Playing: —";

  if(currentSource){
    try{currentSource.stop(now+FADE+0.1);}catch{}
    currentSource = null;
  }
}

// -------------------- PUBLIC INTERFACE --------------------
window.handleSoundState = function(){
  if(document.body.classList.contains("theme-warm")){
    startEngine();
  }else{
    stopEngine();
  }
};
