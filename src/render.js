import { STATIONS, EMOJIS, MAX_DAYS } from './constants.js';
import { state } from './state.js';
import { el } from './dom.js';
import { formatMoney, hasOpenOverlay, totalInvWeight } from './utils.js';
import { generateAllPrices } from './prices.js';
import { renderTimer } from './timer.js';
import { buy, sell, sellAll } from './trading.js';
import { bus } from './bus.js';

export function renderStations(){
  el.stationButtons.innerHTML = '';
  for(const s of STATIONS){
    const b = document.createElement('button');
    b.className = 'station-btn' + (s === state.station ? ' active' : '');
    b.textContent = s;
    b.onclick = ()=>{
      if (hasOpenOverlay()) return;
      if (state.day > MAX_DAYS) return;
      // Dispatch event instead of direct import to avoid circular dependency
      bus.dispatchEvent(new CustomEvent('stationSelected', { detail: s }));
    };
    el.stationButtons.appendChild(b);
  }
}

export function renderHeader(){
  el.dayLabel.textContent = `Day ${state.day} / ${MAX_DAYS}`;
  el.stationName.textContent = state.station;
  el.cashValue.textContent = formatMoney(state.cash);
  el.healthValue.textContent = `♥ ${state.health}`;
  el.marketTitle.textContent = `Market — ${state.station}`;
  const totalW = totalInvWeight(state);
  el.bagValue.textContent = `${totalW} / ${state.inventoryCap}`;

  el.heatValue.textContent = `${state.heat}`;
}

export function renderMarket(){
  el.marketGrid.innerHTML = '';
  
  // Debug trading state
  if (state.canTrade !== undefined && state.timer !== undefined) {
    console.log('Trading state:', { canTrade: state.canTrade, timer: state.timer, tradingDisabled: !(state.canTrade && state.timer > 0) });
  }
  
  for(const e of EMOJIS){
    const card = document.createElement('div');
    card.className = 'good-card';
    const price = state.prices[e];
    const have = state.inv[e];
    const lbp = state.lastBuyPrice[e];

    const row1 = document.createElement('div');
    row1.style.display = 'flex'; row1.style.alignItems = 'center'; row1.style.justifyContent = 'space-between';
    const emojiEl = document.createElement('div'); emojiEl.className = 'good-emoji'; emojiEl.textContent = e;
    const priceEl = document.createElement('div'); priceEl.className = 'good-price'; priceEl.textContent = price==null ? '—' : formatMoney(price);
    row1.append(emojiEl, priceEl);

    const chipRow = document.createElement('div');
    if (have > 0 && lbp != null){
      const chip = document.createElement('div'); chip.className = 'chip'; chip.textContent = `Bought @ ${formatMoney(lbp)}`; chipRow.appendChild(chip);
    } else { chipRow.style.minHeight = '22px'; }

    const haveRow = document.createElement('div'); haveRow.className = 'you-have'; haveRow.textContent = `You have: ${have}`;

    const btns = document.createElement('div'); btns.className = 'btn-row';
    const b1 = document.createElement('button'); b1.className = 'btn buy'; b1.textContent = 'Buy 1'; b1.onclick = ()=>buy(e,1);
    const s1 = document.createElement('button'); s1.className = 'btn sell'; s1.textContent = 'Sell 1'; s1.onclick = ()=>sell(e,1);
    const sa = document.createElement('button'); sa.className = 'btn sell'; sa.textContent = 'Sell All'; sa.onclick = ()=>sellAll(e);

    const tradingDisabled = !(state.canTrade && state.timer > 0);
    const noPrice = price == null;
    b1.disabled = tradingDisabled || noPrice;
    s1.disabled = sa.disabled = tradingDisabled || have<=0 || noPrice;
    
    // Add visual feedback for disabled state
    if (tradingDisabled) {
      card.classList.add('trading-disabled');
    } else {
      card.classList.remove('trading-disabled');
    }
    if (noPrice) card.classList.add('unavail');

    btns.append(b1,s1,sa);
    card.append(row1, chipRow, haveRow, btns);
    el.marketGrid.appendChild(card);
  }
}

function updateDebugOverlay() {
  const dbg = document.getElementById('debugState');
  if (!dbg) return;
  const overlays = {
    event: el.eventOverlay.classList.contains('show'),
    choose: el.chooseOverlay.classList.contains('show'),
    end: el.endOverlay.classList.contains('show')
  };
  dbg.innerText = `canTrade: ${state.canTrade}\ntimer: ${state.timer}\ntimerInterval: ${!!state.timerInterval}\nday: ${state.day}\noverlays: event=${overlays.event}, choose=${overlays.choose}, end=${overlays.end}`;
  // Add a badge for overlays
  let badge = document.getElementById('overlayBadge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'overlayBadge';
    badge.style.marginTop = '4px';
    badge.style.fontWeight = 'bold';
    badge.style.fontSize = '13px';
    badge.style.color = '#ff0';
    dbg.parentElement.appendChild(badge);
  }
  badge.textContent = (overlays.event||overlays.choose||overlays.end) ? `Overlay open: ${Object.entries(overlays).filter(([k,v])=>v).map(([k])=>k).join(', ')}` : 'No overlays open';
}

function renderLastDayWarning() {
  let banner = document.getElementById('lastDayBanner');
  if (state.day === MAX_DAYS) {
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'lastDayBanner';
      banner.style.position = 'fixed';
      banner.style.top = '0';
      banner.style.left = '0';
      banner.style.right = '0';
      banner.style.zIndex = '9998';
      banner.style.background = '#ff2d55';
      banner.style.color = '#fff';
      banner.style.fontWeight = 'bold';
      banner.style.fontSize = '20px';
      banner.style.textAlign = 'center';
      banner.style.padding = '10px 0';
      banner.textContent = '⚠️ LAST DAY! Sell everything now! ⚠️';
      document.body.appendChild(banner);
    }
  } else {
    if (banner) banner.remove();
  }
}

// Failsafe: forcibly close overlays if trading should be allowed
function closeAllOverlaysIfShouldBeOpen() {
  if (state.canTrade && state.timer > 0) {
    let closed = false;
    if (el.eventOverlay.classList.contains('show')) { el.eventOverlay.classList.remove('show'); closed = true; console.log('[Failsafe] Closed eventOverlay'); }
    if (el.chooseOverlay.classList.contains('show')) { el.chooseOverlay.classList.remove('show'); closed = true; console.log('[Failsafe] Closed chooseOverlay'); }
    if (el.endOverlay.classList.contains('show')) { el.endOverlay.classList.remove('show'); closed = true; console.log('[Failsafe] Closed endOverlay'); }
    if (closed) console.log('[Failsafe] Overlays forcibly closed in renderAll');
  }
}

// Patch overlay show/hide for logging
['eventOverlay','chooseOverlay','endOverlay'].forEach(id => {
  const elRef = el[id];
  if (!elRef) return;
  const origAdd = elRef.classList.add;
  const origRemove = elRef.classList.remove;
  elRef.classList.add = function(...args) {
    if (args.includes('show')) console.log(`[Overlay] ${id} shown`);
    return origAdd.apply(this, args);
  };
  elRef.classList.remove = function(...args) {
    if (args.includes('show')) console.log(`[Overlay] ${id} hidden`);
    return origRemove.apply(this, args);
  };
});

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const panicBtn = document.getElementById('panicBtn');
    if (panicBtn) {
      panicBtn.onclick = () => {
        try { el.eventOverlay.classList.remove('show'); } catch {}
        try { el.chooseOverlay.classList.remove('show'); } catch {}
        try { el.endOverlay.classList.remove('show'); } catch {}
        state.canTrade = true;
        state.timer = 10;
        if (!state.timerInterval) {
          import('./timer.js').then(m => m.startTimer());
        }
        renderAll();
        alert('PANIC RESET: All overlays closed, canTrade=true, timer=10, forced re-render.');
      };
    }
    // Global click logger
    document.body.addEventListener('click', e => {
      console.log('[GlobalClick]', e.target, e.target && e.target.outerHTML);
    }, true);
  });
}

export function renderAll(){
  closeAllOverlaysIfShouldBeOpen();
  renderStations();
  renderHeader();
  renderTimer();
  generateAllPrices();
  renderMarket();
  renderConsumables();
  updateDebugOverlay();
  renderLastDayWarning();
}

function renderConsumables(){
  const row = el.consumablesRow;
  if (!row) return;
  row.innerHTML = '';
  
  const pill = (label, count, onclick)=>{
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = `${label} (${count})`;
    b.onclick = onclick;
    return b;
  };
  const buyMed = pill('Buy Medkit $100', '', ()=>{ if (state.cash>=100){ state.cash-=100; state.consumables.medkit++; renderHeader(); renderConsumables(); }});
  const useMed = pill('Use Medkit', state.consumables.medkit, ()=>{ if (state.consumables.medkit>0){ state.consumables.medkit--; state.health = Math.min(100, state.health+25); renderHeader(); renderConsumables(); }});
  const buyBribe = pill('Buy Bribe $150', '', ()=>{ if (state.cash>=150){ state.cash-=150; state.consumables.bribe++; renderHeader(); renderConsumables(); }});
  const buyBurner = pill('Buy Burner $120', '', ()=>{ if (state.cash>=120){ state.cash-=120; state.consumables.burner++; renderHeader(); renderConsumables(); }});
  row.append(buyMed, useMed, buyBribe, buyBurner);
}


