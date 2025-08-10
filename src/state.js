import { STATIONS, EMOJIS, START_CASH, START_HEALTH, INVENTORY_CAP, STOP_SECONDS } from './constants.js';

export const state = {
  day: 1,
  station: STATIONS[0],
  cash: START_CASH,
  health: START_HEALTH,
  inv: Object.fromEntries(EMOJIS.map(e=>[e,0])),
  prices: Object.fromEntries(EMOJIS.map(e=>[e,0])),
  timer: STOP_SECONDS,
  timerEndAtMs: null,
  lastBuyPrice: Object.fromEntries(EMOJIS.map(e=>[e,null])),
  canTrade: true,
  highScore: 0,
  timerInterval: null,
  eventToday: null, // 'ted' | 'darcy' | 'cops' | 'cargo'
  eventResolved: false,
  started: false,
  inventoryCap: INVENTORY_CAP,
  // New systems
  heat: 0,

  consumables: { medkit: 0, bribe: 0, burner: 0 },
  
  loan: { principal: 0, rate: 0.25 },
  contracts: [],
  story: { ted: 0, rob: 0 },
  pendingSpike: null,
  tedBlocked: false,
};

export function resetState(){
  state.day = 1;
  state.station = STATIONS[0];
  state.cash = START_CASH;
  state.health = START_HEALTH;
  Object.keys(state.inv).forEach(k=>{ state.inv[k]=0; });
  Object.keys(state.lastBuyPrice).forEach(k=>{ state.lastBuyPrice[k]=null; });
  state.canTrade = true;
  state.inventoryCap = INVENTORY_CAP;
  state.eventToday = null;
  state.eventResolved = false;
  state.heat = 0;

  state.consumables = { medkit: 0, bribe: 0, burner: 0 };

  state.loan = { principal: 0, rate: 0.25 };
  state.contracts = [];
  state.story = { ted: 0, rob: 0 };
  state.pendingSpike = null;
  state.tedBlocked = false;
  state.timer = STOP_SECONDS;
  state.timerEndAtMs = null;
}


