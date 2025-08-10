import { EMOJIS, EMOJI_TRAITS } from './constants.js';
import { el } from './dom.js';

export function formatMoney(n){
  const s = Math.round(n).toLocaleString('en-AU');
  return `$${s}`;
}

export function totalInvCount(state){ return EMOJIS.reduce((a,e)=>a+state.inv[e],0); }
export function totalInvWeight(state){ return EMOJIS.reduce((a,e)=>a + state.inv[e] * (EMOJI_TRAITS[e]?.weight || 1), 0); }
export function itemWeight(e){ return (EMOJI_TRAITS[e]?.weight || 1); }

export function hasOpenOverlay(){
  return el.eventOverlay.classList.contains('show')
    || el.chooseOverlay.classList.contains('show')
    || el.endOverlay.classList.contains('show');
}

export function showPenalty(text, color='white'){
  const d = document.createElement('div');
  d.className = 'penalty-float';
  d.textContent = text;
  d.style.color = color;
  document.body.appendChild(d);
  setTimeout(()=>d.remove(), 950);
}

// --- Deterministic RNG helpers ---
export function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

export function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

export function seededRandom(seedStr) {
  const seedFn = xmur3(seedStr);
  const r = mulberry32(seedFn());
  return r;
}

export function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }


