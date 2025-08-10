export const STATIONS = ["Wollongong","Fairy Meadow","Towradgi","Bellambi"];
export const EMOJIS = ["💊","🍄","🔵","💉","🌀","💨","❄️","🐎"];
export const MAX_DAYS = 30;
export const STOP_SECONDS = 15;
export const START_CASH = 500;
export const INVENTORY_CAP = 50;
export const START_HEALTH = 100;
export const DEBUG_FORCE_GRAB = false; // Quick Grab debug disabled
export const LS_KEY = 'gong_line_highscore_v1';



// Emoji traits: affects volatility and capacity weight
// perishable: may degrade each day in future
// fragile: higher loss in some events (future hook)
// bulky: takes 2 capacity per unit
export const EMOJI_TRAITS = {
  '💊': { perishable: false, fragile: false, bulky: false, volatility: 1.0, weight: 1 },
  '🍄': { perishable: true,  fragile: false, bulky: false, volatility: 1.2, weight: 1 },
  '🔵': { perishable: false, fragile: false, bulky: false, volatility: 0.95, weight: 1 },
  '💉': { perishable: false, fragile: true,  bulky: false, volatility: 1.15, weight: 1 },
  '🌀': { perishable: false, fragile: false, bulky: false, volatility: 1.3, weight: 1 },
  '💨': { perishable: false, fragile: false, bulky: false, volatility: 1.1, weight: 1 },
  '❄️': { perishable: false, fragile: false, bulky: false, volatility: 1.0, weight: 1 },
  '🐎': { perishable: false, fragile: false, bulky: false, volatility: 1.25, weight: 1 },
};



