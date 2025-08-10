import { STATIONS, MAX_DAYS, LS_KEY } from './constants.js';
import { state, resetState } from './state.js';
import { el } from './dom.js';
import { renderAll } from './render.js';
import { determineEvent, showEventPopup, hideEventPopup } from './events.js';
import { startTimer, stopTimer } from './timer.js';
import { AudioKit } from './audio.js';
import { bus } from './bus.js';

export function showChooseOverlay(){
  el.stationChoices.innerHTML = '';
  for(const s of STATIONS){
    const b = document.createElement('button');
    b.className = 'btn'; b.textContent = s;
    b.onclick = ()=>{ advanceDayTo(s); };
    el.stationChoices.appendChild(b);
  }
  el.chooseOverlay.classList.add('show');
}
export function hideChooseOverlay(){ el.chooseOverlay.classList.remove('show'); }

export function startDay(){
  // Defensive: always close overlays
  try { el.eventOverlay.classList.remove('show'); } catch {}
  try { el.chooseOverlay.classList.remove('show'); } catch {}
  try { el.endOverlay.classList.remove('show'); } catch {}

  // Defensive: always generate prices first
  import('./render.js').then(m => m.generateAllPrices());

  // Set state
  state.canTrade = true;
  state.heat = Math.max(0, state.heat - 5);
  if (state.day === 1) {
    state.eventToday = null;
    state.eventResolved = true;
  } else {
    determineEvent();
  }
  // Debug log
  console.log('[startDay] canTrade:', state.canTrade, 'timer:', state.timer, 'overlays:', {
    event: el.eventOverlay.classList.contains('show'),
    choose: el.chooseOverlay.classList.contains('show'),
    end: el.endOverlay.classList.contains('show')
  });
  renderAll();
  startTimer();
  // Defensive: ensure timer is running
  if (!state.timerInterval) {
    console.warn('[startDay] Timer was not running, forcing startTimer()');
    startTimer();
  }
  if (state.eventToday) {
    showEventPopup();
  } else if (state.pendingSpike) {
    // Show spike popup if no primary event
    const top = state.pendingSpike;
    state.pendingSpike = null;
    el.eventTitle.textContent = 'MARKET SHOCK';
    el.eventBody.textContent = `Cops made a bust. Prices for ${top.e} are spiking!`;
    el.eventActions.innerHTML = '';
    const ok = document.createElement('button'); ok.className='btn'; ok.textContent = 'OK';
    ok.onclick = ()=>{ el.eventOverlay.classList.remove('show'); };
    el.eventActions.append(ok);
    el.eventOverlay.classList.add('show');
  }
  AudioKit.chord([420, 560, 720], 0.25, 'sine', 0.04);
}

export function fadeBetweenDays(cb){
  el.fadeOverlay.classList.add('show');
  setTimeout(()=>{ cb(); el.fadeOverlay.classList.remove('show'); }, 220);
}

export function advanceDayTo(newStation){
  hideChooseOverlay(); hideEventPopup();
  // End current day immediately
  state.canTrade = false;
  stopTimer();
  fadeBetweenDays(()=>{
    state.day += 1;
    state.station = newStation;
    if (state.day > MAX_DAYS){
      endGame();
      return;
    }
    startDay();
  });
}

function autoSellAll() {
  let total = 0;
  for (const e of Object.keys(state.inv)) {
    const qty = state.inv[e];
    const price = state.prices[e];
    if (qty > 0 && price != null) {
      total += qty * price;
      state.inv[e] = 0;
    }
  }
  state.cash += total;
  return total;
}

export function endGame(){
  stopTimer();
  state.canTrade = false;
  hideChooseOverlay(); hideEventPopup();
  // Auto-sell all inventory on last day
  autoSellAll();
  const totalCash = state.cash;
  let hs = 0;
  try { hs = Number(localStorage.getItem(LS_KEY) || '0'); } catch { hs = 0; }
  let updated = hs;
  if (totalCash > hs){ updated = totalCash; try { localStorage.setItem(LS_KEY, String(updated)); } catch { /* ignore */ } }
  el.endSummary.textContent = `Final cash: $${Math.round(totalCash).toLocaleString('en-AU')}  •  High score: $${Math.round(updated).toLocaleString('en-AU')}`;
  el.endOverlay.classList.add('show');
}

export function resetGame(){
  stopTimer();
  resetState();
  hideChooseOverlay(); hideEventPopup(); el.endOverlay.classList.remove('show');
  startDay();
}

export function init(){
  try{ state.highScore = Number(localStorage.getItem(LS_KEY) || '0'); }catch{ state.highScore = 0; }

  el.muteBtn.addEventListener('click', ()=>{
    const pressed = el.muteBtn.getAttribute('aria-pressed') === 'true';
    const next = !pressed;
    el.muteBtn.setAttribute('aria-pressed', String(next));
    el.muteBtn.textContent = next ? '🔇 Muted' : '🔊 Sound';
    AudioKit.setMuted(next);
    if (!next) { AudioKit.startMusic(); } else { AudioKit.stopMusic(); }
  });
  el.restartBtn.addEventListener('click', resetGame);

  const onceStartMusic = ()=>{ AudioKit.startMusic(); window.removeEventListener('pointerdown', onceStartMusic); };
  window.addEventListener('pointerdown', onceStartMusic, { once: true });

  el.startOverlay.classList.add('show');
  el.startBtn.addEventListener('click', ()=>{
    el.startOverlay.classList.remove('show');
    state.started = true;
    renderAll();
    startDay();
  }, { once: true });

  bus.addEventListener('timeup', ()=>{
    if (el.eventOverlay.classList.contains('show')) hideEventPopup();
    // fade out background music and play a chime
    AudioKit.fadeOutMusic(0.5);
    AudioKit.chord([660, 880, 1320], 0.4, 'sine', 0.05);
    showChooseOverlay();
  });

  window.addEventListener('gameover', ()=>{
    endGame();
  });
}


