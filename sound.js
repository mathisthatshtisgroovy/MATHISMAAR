console.log("🔊 Ambient Engine Loaded");

const SOUND_FILE = "data/sound_archive.json";
const FADE = 5.0;
const TARGET_VOL = 0.5;
const DARK_MODE_KEY = "mm-dark-mode";
const RADIO_PLAYING_KEY = "mm-radio-playing";


let audioCtx, masterGain, sounds = [];
let isPlaying = false;
let engineReady = false;
let currentSource = null;
let nextTimeout = null;
let buffers = new Map();
let playExtract = false;  // full by default, randomized per start/skip

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

async function fetchBuffer(pathIn){
  let url = pathIn.replace(/\\/g,"/");
  if(!url.includes("/")) url = "assets/sound/"+url;
  url = assetUrl(url);

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

async function playRandomTrack(){
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

playExtract = Math.random() < 0.35;   // 35% extract, 65% full  (adjustable)


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

const label = document.getElementById("now-playing");
if(label){
  label.textContent = playExtract ?
  `Now Playing: ${sound.title} [extract]` :
  `Now Playing: ${sound.title} `;

}

if(playExtract){
    // extract auto-fades at end of slice
    const slice = buffer.duration * 0.15;
    const fadeStart = now + slice - FADE;
    const stopTime = fadeStart + FADE;

    masterGain.gain.setValueAtTime(TARGET_VOL, fadeStart);
    masterGain.gain.linearRampToValueAtTime(0, stopTime);

    src.stop(stopTime + 0.1);

} else {
    src.onended = ()=> {
        isPlaying && (masterGain.gain.value = 0); // reset gain when done
    };
}
}   

async function skipTrack(){
  if(!isPlaying) return;
  console.log("⏭ next sound");

const notice = document.getElementById("skip-notice");
if(notice){
   notice.classList.add("show-skip");
   setTimeout(()=> notice.classList.remove("show-skip"), 4000);
}

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

window.skipTrack = skipTrack;

async function startEngine(){
  if(!engineReady) await initEngine();
  if(audioCtx.state==="suspended") await audioCtx.resume();
  if(isPlaying) return;

  console.log("🌑 Engine ON");
  isPlaying = true;
  localStorage.setItem(RADIO_PLAYING_KEY, "1");
  playRandomTrack();
}

function stopEngine(){
  if(!isPlaying) return;

  console.log("🌑 Engine OFF");
  isPlaying = false;
  localStorage.setItem(RADIO_PLAYING_KEY, "0");

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

window.handleSoundState = function(){
  if(document.body.classList.contains("dark-mode")){
    startEngine();
  }else{
    stopEngine();
  }
};

// dark mode + radio state persist across page navigation via localStorage.
// the class itself is restored earlier (inline, before this script loads)
// to avoid a flash of the wrong theme — this just wires up the toggle
// button and resumes audio if it was playing when the user left.
window.toggleDarkMode = function(){
  document.body.classList.toggle("dark-mode");
  localStorage.setItem(DARK_MODE_KEY, document.body.classList.contains("dark-mode") ? "1" : "0");
  handleSoundState();
};

window.resumeSoundIfNeeded = function(){
  const wasPlaying = localStorage.getItem(RADIO_PLAYING_KEY) === "1";
  if(document.body.classList.contains("dark-mode") && wasPlaying){
    // browsers may block this without a fresh user gesture — that's expected,
    // the dot still reflects the right (dark) state either way
    startEngine();
  }
};
