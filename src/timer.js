import { STOP_SECONDS } from './constants.js';
import { state } from './state.js';
import { el } from './dom.js';
import { AudioKit } from './audio.js';
import { bus } from './bus.js';

export function renderTimer(){
  const pct = Math.max(0, Math.min(1, state.timer / STOP_SECONDS));
  el.timerBar.style.width = `${pct*100}%`;
  el.timerText.textContent = `${Math.ceil(state.timer)}s`;
}

export function startTimer(){
  stopTimer();
  state.timerEndAtMs = performance.now() + STOP_SECONDS * 1000;
  state.timer = STOP_SECONDS;
  function tick(){
    const remaining = Math.max(0, (state.timerEndAtMs - performance.now()) / 1000);
    const previous = state.timer;
    state.timer = remaining;
    renderTimer();
    // Update music pace based on remaining percent
    // Keep normal pace until last 3 seconds, then ramp
    const rampWindow = 3;
    const eased = remaining > rampWindow ? 1 : Math.max(0, remaining / rampWindow);
    AudioKit.setMusicPace(eased);
    if (remaining <= 0){
      stopTimer();
      state.canTrade = false;
      bus.dispatchEvent(new Event('timeup'));
      return;
    }
    const prevWhole = Math.ceil(previous);
    const whole = Math.ceil(remaining);
    if (whole !== prevWhole) {
      AudioKit.blip(900, 0.03, 'square', 0.02);
    }
  }
  state.timerInterval = setInterval(tick, 100);
}

export function stopTimer(){ if (state.timerInterval){ clearInterval(state.timerInterval); state.timerInterval = null; } }

export function adjustTimerBy(secondsDelta){
  if (state.timerEndAtMs == null) return;
  state.timerEndAtMs += secondsDelta * 1000;
  // Clamp so we don't extend negative time accidentally in edge cases
  const now = performance.now();
  if (state.timerEndAtMs < now) state.timerEndAtMs = now;
}


