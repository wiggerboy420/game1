import { EMOJIS } from './constants.js';
import { state } from './state.js';
import { AudioKit } from './audio.js';
import { hasOpenOverlay, totalInvWeight, itemWeight } from './utils.js';
import { triggerRender } from './bus.js';

function guardTrade(){ return state.canTrade && state.timer > 0 && !hasOpenOverlay(); }

export function buy(emoji, qty){
  if (!guardTrade()) return;
  const price = state.prices[emoji];
  const usePrice = price;
  const affordable = Math.floor(state.cash / usePrice);
  // compute how many we can fit given weight
  const remainingCap = Math.max(0, state.inventoryCap - totalInvWeight(state));
  const perUnit = itemWeight(emoji);
  const fitQty = Math.floor(remainingCap / perUnit);
  const actual = Math.min(qty, affordable, fitQty);
  if (actual <= 0) return;
  state.cash -= usePrice * actual;
  const wasZero = state.inv[emoji] === 0;
  state.inv[emoji] += actual;
  if (wasZero) state.lastBuyPrice[emoji] = usePrice;

  AudioKit.blip(900, 0.07, 'sine', 0.04);
  triggerRender();
}

export function sell(emoji, qty){
  if (!guardTrade()) return;
  const have = state.inv[emoji];
  if (have <= 0) return;
  const actual = Math.min(qty, have);
  const price = state.prices[emoji];
  state.inv[emoji] -= actual;
  state.cash += price * actual;
  if (state.inv[emoji] === 0) state.lastBuyPrice[emoji] = null;

  AudioKit.blip(500, 0.07, 'sine', 0.04);
  triggerRender();
}

export function sellAll(emoji){ sell(emoji, state.inv[emoji]); }


