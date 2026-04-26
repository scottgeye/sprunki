const SOUND_BANK = [
  { id: "kick", name: "Oren", subtitle: "Kick", color: "#ff9e6a", pattern: [1, 0, 0, 0, 1, 0, 0, 0], type: "kick" },
  { id: "snare", name: "Clukr", subtitle: "Snare", color: "#ff6a8f", pattern: [0, 0, 1, 0, 0, 0, 1, 0], type: "snare" },
  { id: "hat", name: "Sky", subtitle: "Hi-Hat", color: "#ffd66a", pattern: [1, 1, 1, 1, 1, 1, 1, 1], type: "hat" },
  { id: "bass", name: "Raddy", subtitle: "Bass", color: "#8bff9a", pattern: [1, 0, 1, 0, 1, 0, 1, 0], type: "bass", notes: [55, 62, 65, 49] },
  { id: "chord", name: "Vineria", subtitle: "Chord", color: "#6af2ff", pattern: [1, 0, 0, 1, 0, 0, 1, 0], type: "chord", notes: [220, 247, 196, 220] },
  { id: "lead", name: "Pinki", subtitle: "Lead", color: "#a16aff", pattern: [0, 1, 0, 1, 0, 1, 0, 1], type: "lead", notes: [440, 494, 523, 494] },
  { id: "vox1", name: "Jevin", subtitle: "Vox A", color: "#f56aff", pattern: [0, 0, 1, 0, 0, 1, 0, 0], type: "vox", notes: [330, 294, 262, 294] },
  { id: "vox2", name: "Mr. Sun", subtitle: "Vox B", color: "#6affc3", pattern: [0, 1, 0, 0, 0, 1, 0, 0], type: "vox", notes: [280, 314, 280, 249] }
];

const COMBOS = [
  { ids: ["kick", "bass", "hat"], label: "Groove Engine" },
  { ids: ["vox1", "vox2", "lead"], label: "Choir Spark" },
  { ids: ["snare", "chord", "lead", "bass"], label: "Night Drive" }
];

const SCENES = {
  neon: { className: "scene-neon", transposition: 1 },
  sunset: { className: "scene-sunset", transposition: 0.94 },
  void: { className: "scene-void", transposition: 0.84 }
};

const palette = document.getElementById("palette");
const stage = document.getElementById("stage");
const playToggle = document.getElementById("playToggle");
const stopBtn = document.getElementById("stop");
const randomizeBtn = document.getElementById("randomize");
const bpmSlider = document.getElementById("bpm");
const bpmValue = document.getElementById("bpmValue");
const sceneSelect = document.getElementById("sceneSelect");
const comboBanner = document.getElementById("comboBanner");
const avatarTemplate = document.getElementById("avatarTemplate");

const slots = [];
let playing = false;
let audio;
let timer;
let step = 0;
let bpm = Number(bpmSlider.value);
let scene = "neon";

function setupPalette() {
  SOUND_BANK.forEach((sound) => {
    const node = avatarTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.soundId = sound.id;
    node.querySelector("h3").textContent = sound.name;
    node.querySelector("small").textContent = sound.subtitle;
    node.querySelector(".avatar-face").style.background = `linear-gradient(140deg, #ffffff, ${sound.color})`;
    node.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", sound.id);
    });
    palette.appendChild(node);
  });
}

function setSlotDisplay(index) {
  const { soundId, el } = slots[index];
  if (!soundId) {
    el.innerHTML = `Drop here (${index + 1}) <small>Click to clear</small>`;
    el.style.borderColor = "#2c3865";
    return;
  }
  const sound = SOUND_BANK.find((entry) => entry.id === soundId);
  if (!sound) return;
  el.innerHTML = `${sound.name} <small>${sound.subtitle}</small>`;
  el.style.borderColor = sound.color;
}

function setupStage() {
  for (let i = 0; i < 8; i += 1) {
    const slot = document.createElement("button");
    slot.className = "slot";
    slot.type = "button";
    slot.dataset.index = String(i);
    slot.addEventListener("dragover", (event) => event.preventDefault());
    slot.addEventListener("drop", (event) => {
      event.preventDefault();
      const soundId = event.dataTransfer.getData("text/plain");
      assignSound(i, soundId);
    });
    slot.addEventListener("click", () => clearSlot(i));
    stage.appendChild(slot);
    slots.push({ el: slot, soundId: null });
    setSlotDisplay(i);
  }
}

function assignSound(index, soundId) {
  const sound = SOUND_BANK.find((entry) => entry.id === soundId);
  if (!sound) return;
  slots[index].soundId = sound.id;
  setSlotDisplay(index);
  updateComboState();
}

function clearSlot(index) {
  slots[index].soundId = null;
  setSlotDisplay(index);
  updateComboState();
}

function ensureAudio() {
  if (audio) return;
  audio = new AudioContext();
}

function applySceneTheme(value) {
  scene = value;
  document.body.classList.remove("scene-neon", "scene-sunset", "scene-void");
  document.body.classList.add(SCENES[value].className);
}

function getPitch(freq) {
  return freq * SCENES[scene].transposition;
}

function voiceEnvelope(destination, startTime, attack = 0.005, decay = 0.22, peak = 0.34) {
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(peak, startTime + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + decay);
  gain.connect(destination);
  return gain;
}

function playKick(now) {
  const gain = voiceEnvelope(audio.destination, now, 0.002, 0.18, 0.95);
  const osc = audio.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(getPitch(160), now);
  osc.frequency.exponentialRampToValueAtTime(getPitch(45), now + 0.12);
  osc.connect(gain);
  osc.start(now);
  osc.stop(now + 0.18);
}

function playSnare(now) {
  const noiseBuffer = audio.createBuffer(1, audio.sampleRate * 0.08, audio.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  const noise = audio.createBufferSource();
  noise.buffer = noiseBuffer;
  const hp = audio.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 1300;
  const gain = voiceEnvelope(audio.destination, now, 0.001, 0.11, 0.42);
  noise.connect(hp);
  hp.connect(gain);
  noise.start(now);

  const snap = audio.createOscillator();
  const snapGain = voiceEnvelope(audio.destination, now, 0.001, 0.08, 0.25);
  snap.type = "triangle";
  snap.frequency.setValueAtTime(getPitch(200), now);
  snap.connect(snapGain);
  snap.start(now);
  snap.stop(now + 0.09);
}

function playHat(now) {
  const gain = voiceEnvelope(audio.destination, now, 0.001, 0.045, 0.08);
  const osc = audio.createOscillator();
  osc.type = "square";
  osc.frequency.value = getPitch(7600);
  const hp = audio.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = getPitch(4500);
  osc.connect(hp);
  hp.connect(gain);
  osc.start(now);
  osc.stop(now + 0.045);
}

function playTonal(type, freq, now) {
  const osc = audio.createOscillator();
  osc.type = type === "bass" ? "sawtooth" : type === "chord" ? "triangle" : "square";
  const peak = type === "bass" ? 0.28 : 0.2;
  const decay = type === "bass" ? 0.26 : 0.19;
  const gain = voiceEnvelope(audio.destination, now, 0.006, decay, peak);
  const pitch = getPitch(freq);
  osc.frequency.setValueAtTime(pitch, now);
  if (type === "vox") {
    osc.frequency.linearRampToValueAtTime(pitch * 1.08, now + 0.04);
    osc.frequency.linearRampToValueAtTime(pitch * 0.96, now + 0.1);
  }
  osc.connect(gain);
  osc.start(now);
  osc.stop(now + 0.24);
}

function triggerSound(sound, slotIndex) {
  const now = audio.currentTime;
  if (sound.type === "kick") playKick(now);
  else if (sound.type === "snare") playSnare(now);
  else if (sound.type === "hat") playHat(now);
  else {
    const melodyIndex = Math.floor(step / 2) % sound.notes.length;
    playTonal(sound.type, sound.notes[melodyIndex], now);
  }
  slots[slotIndex].el.classList.add("active");
}

function playStep() {
  if (!audio) return;
  slots.forEach((slot) => slot.el.classList.remove("active"));
  slots.forEach((slot, slotIndex) => {
    if (!slot.soundId) return;
    const sound = SOUND_BANK.find((entry) => entry.id === slot.soundId);
    if (!sound || !sound.pattern[step % sound.pattern.length]) return;
    triggerSound(sound, slotIndex);
  });
  step += 1;
}

function getIntervalMs() {
  return (60_000 / bpm) / 2;
}

function startPlayback() {
  ensureAudio();
  if (audio.state === "suspended") audio.resume();
  if (playing) return;
  timer = setInterval(playStep, getIntervalMs());
  playing = true;
  playToggle.textContent = "Pause";
}

function stopPlayback({ resetStep = false } = {}) {
  if (!playing && !timer) return;
  clearInterval(timer);
  timer = null;
  playing = false;
  playToggle.textContent = "Play";
  slots.forEach((slot) => slot.el.classList.remove("active"));
  if (resetStep) step = 0;
}

function refreshTransportTempo() {
  if (!playing) return;
  clearInterval(timer);
  timer = setInterval(playStep, getIntervalMs());
}

function updateComboState() {
  const activeIds = new Set(slots.filter((slot) => slot.soundId).map((slot) => slot.soundId));
  const hit = COMBOS.find((combo) => combo.ids.every((id) => activeIds.has(id)));
  slots.forEach((slot) => slot.el.classList.remove("combo-hit"));

  if (!hit) {
    comboBanner.textContent = "No combo active";
    comboBanner.classList.remove("live");
    return;
  }

  comboBanner.textContent = `Combo active: ${hit.label}`;
  comboBanner.classList.add("live");
  slots.forEach((slot) => {
    if (slot.soundId && hit.ids.includes(slot.soundId)) slot.el.classList.add("combo-hit");
  });
}

function randomizeMix() {
  slots.forEach((_, index) => {
    if (Math.random() > 0.3) {
      const pick = SOUND_BANK[Math.floor(Math.random() * SOUND_BANK.length)];
      assignSound(index, pick.id);
    } else {
      clearSlot(index);
    }
  });
  updateComboState();
}

playToggle.addEventListener("click", () => {
  if (playing) stopPlayback();
  else startPlayback();
});

stopBtn.addEventListener("click", () => stopPlayback({ resetStep: true }));
randomizeBtn.addEventListener("click", randomizeMix);

bpmSlider.addEventListener("input", () => {
  bpm = Number(bpmSlider.value);
  bpmValue.textContent = String(bpm);
  refreshTransportTempo();
});

sceneSelect.addEventListener("change", () => applySceneTheme(sceneSelect.value));

document.addEventListener("keydown", (event) => {
  if (event.code !== "Space") return;
  event.preventDefault();
  if (playing) stopPlayback();
  else startPlayback();
});

setupPalette();
setupStage();
applySceneTheme(scene);
randomizeMix();
