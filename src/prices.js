import { EMOJIS, EMOJI_TRAITS } from './constants.js';
import { state } from './state.js';
import { seededRandom } from './utils.js';
import { el } from './dom.js';

export function generatePriceFor(emoji){
  const idx = EMOJIS.indexOf(emoji);
  const base = 10 + idx*3;
  const r = seededRandom(`price:${state.day}|${state.station}|${emoji}`);
  const roll = r();
  let mult;
  if (roll < 0.08){
    mult = 0.22 + r() * (0.65 - 0.22); // lower lows
  } else if (roll < 0.16){
    mult = 2.2 + r() * (4.2 - 2.2); // higher highs
  } else {
    mult = 0.60 + r() * (1.55 - 0.60); // wider normal range
  }
  // Apply volatility trait
  const vol = (EMOJI_TRAITS[emoji]?.volatility ?? 1.0);
  let price = base * mult * vol;

  return Math.max(1, Math.round(price));
}

export function stationFeaturedMap(){
  const idxByEmoji = Object.fromEntries(EMOJIS.map((e,i)=>[e,i]));
  const sets = {
    'Wollongong': [0,1,2,3],
    'Fairy Meadow': [1,2,4,6],
    'Towradgi': [0,2,3,5],
    'Bellambi': [0,3,6,7],
  };
  return { map: sets, idxByEmoji };
}

export function generateAllPrices(){
  // Clear price event at the start of each day
  if (state.priceEvent) state.priceEvent = null;
  const { map } = stationFeaturedMap();
  const featured = new Set(map[state.station].map(i=>EMOJIS[i]));
  const rand = seededRandom(`avail:${state.day}|${state.station}`);
  const nonFeatured = EMOJIS.filter(e=>!featured.has(e));
  const shuffle = [...nonFeatured].sort(()=>rand()-0.5);
  const numBlock = 1 + Math.floor(rand()*2); // 1–2
  const blockedSet = new Set(shuffle.slice(0, numBlock));
  const spikers = [];
  for(const e of EMOJIS){
    // If priceEvent is set for this emoji, use its price
    if (state.priceEvent && state.priceEvent.good === e) {
      state.prices[e] = state.priceEvent.price;
      continue;
    }
    const p = generatePriceFor(e);
    state.prices[e] = p;
    if (blockedSet.has(e)) state.prices[e] = null;
    // Detect big spike
    const lbp = state.lastBuyPrice[e];
    if (lbp != null && p != null && p >= lbp * 2.5){ spikers.push({ e, p }); }
  }
  // After other events resolve, show a spike popup if any
  if (spikers.length > 0) {
    // Defer popup responsibility to lifecycle after primary event
    state.pendingSpike = spikers[0];
  }
  // --- Guarantee event price is set after all other price generation ---
  if (state.priceEvent) {
    state.prices[state.priceEvent.good] = state.priceEvent.price;
  }
}


