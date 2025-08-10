import { EMOJIS, START_HEALTH } from './constants.js';
import { state } from './state.js';
import { el } from './dom.js';
import { seededRandom, showPenalty } from './utils.js';
import { AudioKit } from './audio.js';
import { adjustTimerBy } from './timer.js';
import { triggerRender } from './bus.js';
import { applyDamage, heal } from './health.js';

// --- New: More random price events ---
// Only use user-supplied messages
const SPIKE_MESSAGE = e => `Cops made a bust, prices for ${e} are spiking!`;
const CRASH_MESSAGE = e => `The streets are flooded with ${e}, prices crashing.`;

const TED_MESSAGES = [
  "Hey man, what's up? Can I borrow some money?",
  "Bro, you got a sec? Need a quick loan.",
  "Yo, can you spot me some cash?",
  "Hey, it's Ted. You around? Need a favour.",
  "Hey, mate. Any chance you can help me out?",
  "Hey, it's Ted. Got a minute?",
  "Hey, can you help me out real quick?",
  "Hey, you busy? Need a little help.",
  "Hey, it's Ted. Can I ask you something?",
  "Hey, mate. Can you lend me a hand?"
];

export function determineEvent(){
  const r = seededRandom(`event:${state.day}|${state.station}`);
  const roll = r();
  let evt = null;
  // --- New: random price spike/crash ---
  if (state.day > 3 && roll < 0.07) { // 7% chance per day
    const which = r() < 0.5 ? 'spike' : 'crash';
    const goods = EMOJIS.filter(e => state.prices[e] != null);
    if (goods.length > 0) {
      const pick = goods[Math.floor(r() * goods.length)];
      let newPrice;
      if (which === 'spike') {
        newPrice = Math.max(1, Math.round(state.prices[pick] * (3 + r()*1)));
        state.eventToday = { type: 'spike', good: pick, msg: SPIKE_MESSAGE(pick) };
      } else {
        newPrice = Math.max(1, Math.round(state.prices[pick] * (0.15 + r()*0.15)));
        state.eventToday = { type: 'crash', good: pick, msg: CRASH_MESSAGE(pick) };
      }
      // Store the event so price persists for the day
      state.priceEvent = { good: pick, price: newPrice };
      state.eventResolved = false;
      return;
    }
  }
  if (state.day <= 3) {
    evt = null; // no popups first 3 days
  } else if (state.day === 15) {
    evt = 'cargo'; // cargo pants offer
  } else if (roll < 0.28 && !state.tedBlocked) evt = 'ted';
  else if (roll < 0.34) evt = 'darcy';
  else if (roll < 0.44 + Math.min(0.2, state.heat/300)) evt = 'cops';
  else if (roll < 0.52) evt = 'rob';
  // Opportunistic loan offer if you have low cash and no active loan
  else if (state.cash < 200 && state.loan.principal === 0 && roll > 0.9) evt = 'loan';
  state.eventToday = evt;
  state.eventResolved = evt ? false : true;
}

export function showEventPopup(){
  if (!state.eventToday) return;
  if (state.eventResolved) return;
  const evt = state.eventToday;
  el.eventActions.innerHTML = '';
  el.eventActions.classList.remove('single','triple');
  el.fadeOverlay.classList.add('show');
  setTimeout(()=>{ el.fadeOverlay.classList.remove('show'); }, 300);

  if (typeof evt === 'object' && (evt.type === 'spike' || evt.type === 'crash')) {
    el.eventTitle.textContent = evt.type === 'spike' ? 'PRICE SPIKE!' : 'PRICE CRASH!';
    el.eventBody.textContent = evt.msg;
    const ok = document.createElement('button');
    ok.className = 'btn'; ok.textContent = 'OK';
    ok.onclick = ()=>{ state.eventResolved = true; hideEventPopup(); triggerRender(); };
    el.eventActions.classList.add('single');
    el.eventActions.append(ok);
    el.eventOverlay.classList.add('show');
    return;
  }
  if (evt === 'ted'){
    el.eventTitle.textContent = 'TED IS CALLING — Answer?';
    // Pick a random Ted message
    const r = seededRandom(`tedmsg:${state.day}|${state.station}`);
    el.eventBody.textContent = TED_MESSAGES[Math.floor(r()*TED_MESSAGES.length)];
    // Start continuous alarm while popup is open
    AudioKit.startTedAlarm();
    const yes = document.createElement('button');
    yes.className = 'btn'; yes.textContent = 'Yes';
    yes.onclick = ()=>{
      const r = seededRandom(`ted:${state.day}|${state.station}`);
      const dmg = Math.floor(50 + r()*51); // 50..100
      state.cash = state.cash - dmg; // allow negative cash
      const big = document.createElement('div');
      big.className = 'big-penalty';
      big.innerHTML = `<div class="text">–$${dmg}</div>`;
      document.body.appendChild(big);
      setTimeout(()=>big.remove(), 900);
      AudioKit.blip(300, 0.14, 'sawtooth', 0.06);
      state.eventResolved = true; hideEventPopup(); AudioKit.stopTedAlarm(); triggerRender();
    };
    const no = document.createElement('button');
    no.className = 'btn'; no.textContent = 'No';
    no.onclick = ()=>{
      adjustTimerBy(-3);
      state.eventResolved = true; hideEventPopup(); AudioKit.stopTedAlarm(); triggerRender();
    };
    // Burner phone: consume to block Ted once
    if (!state.tedBlocked){
      const useBurner = document.createElement('button'); useBurner.className='btn'; useBurner.textContent='Use Burner (Block Ted)';
      useBurner.disabled = state.consumables.burner<=0;
      useBurner.onclick = ()=>{
        if (state.consumables.burner>0){ state.consumables.burner--; state.tedBlocked = true; state.eventResolved = true; hideEventPopup(); AudioKit.stopTedAlarm(); triggerRender(); }
      };
      el.eventActions.append(yes, no, useBurner);
    } else {
      el.eventActions.append(yes, no);
    }
  } else if (evt === 'darcy'){
    el.eventTitle.textContent = 'DARCY TIPPED HALF YOUR STASH DOWN THE SINK!';
    el.eventBody.textContent = 'wtf has gone on';
    AudioKit.sadDarcy();
    const ok = document.createElement('button');
    ok.className = 'btn'; ok.textContent = 'OK';
    ok.onclick = ()=>{
      let removed = 0;
      for(const e of EMOJIS){
        const drop = Math.floor(state.inv[e] * 0.5);
        state.inv[e] -= drop; removed += drop;
        if (state.inv[e] === 0) state.lastBuyPrice[e] = null;
      }
      if (removed>0) showPenalty(`–${removed} items`, '#fca5a5');
      AudioKit.blip(220, 0.18, 'triangle', 0.06);
      state.eventResolved = true; hideEventPopup(); triggerRender();
    };
    el.eventActions.classList.add('single');
    el.eventActions.append(ok);
  } else if (evt === 'cops'){
    el.eventTitle.textContent = 'COPS CHECK YOUR BAG — Run or Fight?';
    el.eventBody.textContent = 'Two officers flag you down.';
    AudioKit.sirenCops();
    const run = document.createElement('button');
    run.className = 'btn'; run.textContent = 'Run';
    run.onclick = ()=>{
      const r = seededRandom(`cops:run:${state.day}|${state.station}`);
      let removed = 0;
      // 50% chance to lose items
      if (r() < 0.5) {
        // lose 1–2 individual items total, chosen randomly from owned
        const toLose = 1 + Math.floor(r() * 2);
        for (let i = 0; i < toLose; i++) {
          const owned = EMOJIS.filter(e => state.inv[e] > 0);
          if (owned.length === 0) break;
          const pick = owned[Math.floor(r() * owned.length)];
          state.inv[pick] -= 1; removed += 1;
          if (state.inv[pick] === 0) state.lastBuyPrice[pick] = null;
        }
      }
      if (removed>0) showPenalty(`–${removed} items`, '#fca5a5');
      AudioKit.blip(500, 0.1, 'square', 0.05);
      state.eventResolved = true; hideEventPopup(); triggerRender();
    };
    const fight = document.createElement('button');
    fight.className = 'btn'; fight.textContent = 'Fight';
    fight.onclick = ()=>{
      const r = seededRandom(`cops:fight:${state.day}|${state.station}`);
      const dmg = Math.floor(70 + r() * (100 - 70));
      applyDamage(dmg);
      showPenalty(`–${dmg} ♥`, '#fca5a5');
      AudioKit.blip(160, 0.12, 'square', 0.05);
      state.eventResolved = true; hideEventPopup(); triggerRender();
    };
    // Bribe option
    const br = document.createElement('button'); br.className='btn'; br.textContent = 'Bribe (Use)';
    br.disabled = state.consumables.bribe<=0;
    br.onclick = ()=>{ if (state.consumables.bribe>0){ state.consumables.bribe--; state.eventResolved=true; hideEventPopup(); triggerRender(); } };
    el.eventActions.append(run, fight, br);
  } else if (evt === 'cargo'){
    el.eventTitle.textContent = 'A MAN OFFERS CARGO PANTS';
    el.eventBody.textContent = 'Extra pockets for your goods. Buy for $200? (+50 capacity)';
    const yes = document.createElement('button'); yes.className='btn'; yes.textContent = 'Buy $200';
    yes.onclick = ()=>{
      if (state.cash >= 200) {
        state.cash -= 200;
        state.inventoryCap += 50;
        showPenalty('+50 bag', '#00ff88');
        state.eventResolved = true; hideEventPopup(); triggerRender();
      } else {
        const r = seededRandom(`cargo:punch:${state.day}|${state.station}`);
        const dmg = Math.floor(50 + r() * (80 - 50));
        applyDamage(dmg);
        el.eventTitle.textContent = 'You don\'t have enough money, bozo.';
        el.eventBody.textContent = `He punches you (–${dmg} health).`;
        AudioKit.blip(160, 0.12, 'square', 0.07);
        el.eventActions.innerHTML = '';
        const ok = document.createElement('button'); ok.className='btn'; ok.textContent = 'OK';
        ok.onclick = ()=>{ state.eventResolved = true; hideEventPopup(); triggerRender(); };
        el.eventActions.append(ok);
      }
    };
    const no = document.createElement('button'); no.className='btn'; no.textContent = 'No thanks';
    no.onclick = ()=>{ state.eventResolved = true; hideEventPopup(); triggerRender(); };
    el.eventActions.append(yes, no);
  } else if (evt === 'rob'){
    el.eventTitle.textContent = 'ROB WANTS A TENNA';
    el.eventBody.textContent = 'Say yes to heal, but you\'ll lose one random item.';
    const yes = document.createElement('button'); yes.className='btn'; yes.textContent = 'Yes';
    yes.onclick = ()=>{
      // find any emoji with quantity
      const owned = EMOJIS.filter(e => state.inv[e] > 0);
      if (owned.length === 0){
        el.eventTitle.textContent = 'You\'ve got nothing to spare.';
        el.eventBody.textContent = 'Rob shrugs and walks off.';
        el.eventActions.innerHTML = '';
        const ok = document.createElement('button'); ok.className='btn'; ok.textContent = 'OK';
        ok.onclick = ()=>{ state.eventResolved = true; hideEventPopup(); triggerRender(); };
        el.eventActions.append(ok);
        return;
      }
      const r = seededRandom(`rob:${state.day}|${state.station}`);
      const pick = owned[Math.floor(r()*owned.length)];
      state.inv[pick] -= 1;
      if (state.inv[pick] === 0) state.lastBuyPrice[pick] = null;
      const healAmt = Math.floor(18 + r() * (28 - 18));
      heal(healAmt);
      showPenalty(`+${healAmt} ♥`, '#00ff88');
      AudioKit.blip(700, 0.1, 'sine', 0.05);
      state.eventResolved = true; hideEventPopup(); triggerRender();
    };
    const no = document.createElement('button'); no.className='btn'; no.textContent = 'No';
    no.onclick = ()=>{ state.eventResolved = true; hideEventPopup(); triggerRender(); };
    el.eventActions.append(yes, no);
  } else if (evt === 'loan'){
    el.eventTitle.textContent = 'LOANSHARK';
    el.eventBody.textContent = 'Need cash? Borrow $300 (25% daily interest).';
    const yes = document.createElement('button'); yes.className='btn'; yes.textContent = 'Borrow $300';
    yes.onclick = ()=>{
      state.cash += 300; state.loan.principal += 300; state.eventResolved = true; hideEventPopup(); triggerRender();
    };
    const no = document.createElement('button'); no.className='btn'; no.textContent = 'No';
    no.onclick = ()=>{ state.eventResolved = true; hideEventPopup(); triggerRender(); };
    el.eventActions.append(yes, no);
  }
  el.eventOverlay.classList.add('show');
}

export function hideEventPopup(){ el.eventOverlay.classList.remove('show'); }


