import { START_HEALTH } from './constants.js';
import { state } from './state.js';

export function applyDamage(amount){
  state.health = Math.max(0, state.health - Math.max(0, amount));
  if (state.health <= 0) {
    // Death flash
    const big = document.createElement('div');
    big.className = 'death-flash';
    big.innerHTML = `<div class="text">YOU DIED</div>`;
    document.body.appendChild(big);
    setTimeout(()=>big.remove(), 1000);
    const evtGo = new Event('gameover');
    window.dispatchEvent(evtGo);
  }
}

export function heal(amount){
  state.health = Math.min(START_HEALTH, state.health + Math.max(0, amount));
}


