export const AudioKit = (() => {
  let audioCtx = null;
  let muted = false;
  let musicTimer = null;
  let musicStep = 0;
  let musicStepMs = 250;
  let musicIntensity = 0; // 0 normal, 1 medium, 2 intense
  let musicTick = null;
  let metroTimer = null;
  let metroStepMs = 250;
  let musicGain = null; // bus for background music only
  let tedAlarmInterval = null;
  function ensureCtx(){
    if(!audioCtx){
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (!musicGain && audioCtx){
      musicGain = audioCtx.createGain();
      musicGain.gain.setValueAtTime(1.0, audioCtx.currentTime);
      musicGain.connect(audioCtx.destination);
    }
  }
  function setMuted(m){ muted = m; }
  function blip(freq=880, dur=0.08, type='sine', gain=0.04){
    if(muted) return;
    ensureCtx();
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.frequency.value = freq;
    osc.type = type;
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(audioCtx.destination);
    osc.start(); osc.stop(t0 + dur);
  }
  function musicBlip(freq=880, dur=0.08, type='square', gain=0.03){
    if(muted) return;
    ensureCtx();
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.frequency.value = freq;
    osc.type = type;
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(musicGain || audioCtx.destination);
    osc.start(); osc.stop(t0 + dur);
  }
  function burst(freqs=[1000,1200,1400], dur=0.08, type='square', startGain=0.12){
    if(muted) return;
    ensureCtx();
    const t0 = audioCtx.currentTime;
    freqs.forEach((f,i)=>{
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.frequency.value = f;
      osc.type = type;
      const t = t0 + i*0.06;
      g.gain.setValueAtTime(startGain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g); g.connect(audioCtx.destination);
      osc.start(t); osc.stop(t + dur);
    })
  }
  function chord(freqs=[440,660], dur=0.25, type='sine', gain=0.03){
    if(muted) return;
    ensureCtx();
    const t0 = audioCtx.currentTime;
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    g.connect(audioCtx.destination);
    freqs.forEach(f=>{ const o = audioCtx.createOscillator(); o.type = type; o.frequency.value = f; o.connect(g); o.start(); o.stop(t0+dur); });
  }
  function startMusic(){
    if(muted) return;
    ensureCtx();
    stopMusic();
    musicStep = 0;
    // reset bus gain in case it was faded out
    if (musicGain){
      const t = audioCtx.currentTime;
      musicGain.gain.cancelScheduledValues(t);
      musicGain.gain.setValueAtTime(1.0, t);
    }
    const scale = [261.63, 311.13, 392.00, 523.25];
    musicTick = ()=>{
      if (muted) return;
      const base = scale[musicStep % scale.length];
      // Base arpeggio
      musicBlip(base, 0.08, 'square', 0.035);
      if (musicStep % 2 === 0) musicBlip(base*2, 0.06, 'square', 0.025);
      // Intensity layering
      if (musicIntensity >= 1) {
        // add a short click/hat
        musicBlip(2000, 0.02, 'square', 0.02);
      }
      if (musicIntensity >= 2) {
        // extra accent and third harmonic
        musicBlip(base*3, 0.05, 'square', 0.02);
      }
      musicStep++;
      musicTimer = setTimeout(musicTick, musicStepMs);
    };
    musicTimer = setTimeout(musicTick, musicStepMs);
    // start metronome click
    const metroTick = ()=>{
      if (muted) return;
      musicBlip(1600, 0.015, 'square', 0.05);
      metroTimer = setTimeout(metroTick, metroStepMs);
    };
    metroTimer = setTimeout(metroTick, metroStepMs);
  }
  function stopMusic(){
    if (musicTimer){ clearTimeout(musicTimer); musicTimer = null; }
    if (metroTimer){ clearTimeout(metroTimer); metroTimer = null; }
    musicTick = null;
  }
  function fadeOutMusic(durationSec=0.4){
    if (!audioCtx || !musicGain) return;
    const t = audioCtx.currentTime;
    const end = t + Math.max(0.05, durationSec);
    musicGain.gain.cancelScheduledValues(t);
    musicGain.gain.setValueAtTime(musicGain.gain.value, t);
    musicGain.gain.exponentialRampToValueAtTime(0.001, end);
    // stop after fade completes
    setTimeout(()=>{ stopMusic(); if (musicGain){ musicGain.gain.setValueAtTime(1.0, audioCtx.currentTime); } }, durationSec*1000 + 20);
  }
  function setMusicPace(remainingPct){
    // remainingPct in [0,1]; moderate acceleration near the end
    const minMs = 80, maxMs = 280;
    const curve = Math.pow(Math.max(0, Math.min(1, remainingPct)), 2.2);
    const nextMs = Math.round(minMs + (maxMs - minMs) * curve);
    if (Math.abs(nextMs - musicStepMs) >= 3){
      musicStepMs = nextMs;
      if (musicTimer && musicTick){
        clearTimeout(musicTimer);
        musicTimer = setTimeout(musicTick, musicStepMs);
      }
    }
    // metronome follows same pace, less aggressive and quieter
    const mMin = 120, mMax = 420;
    const mCurve = Math.pow(Math.max(0, Math.min(1, remainingPct)), 2.0);
    const nextMetro = Math.round(mMin + (mMax - mMin) * mCurve);
    if (Math.abs(nextMetro - metroStepMs) >= 3){
      metroStepMs = nextMetro;
      if (metroTimer){ clearTimeout(metroTimer); metroTimer = setTimeout(()=>{
        if (!muted){ blip(1600, 0.012, 'square', 0.035); }
        metroTimer = setTimeout(arguments.callee, metroStepMs);
      }, metroStepMs); }
    }
    // intensity bands
    if (remainingPct < 0.15) musicIntensity = 2;
    else if (remainingPct < 0.4) musicIntensity = 1;
    else musicIntensity = 0;
  }
  function playTedBurst(){
    if(muted) return; ensureCtx();
    const seq = [1000, 1400, 1000, 1400, 1100, 1500, 1100];
    const t0 = audioCtx.currentTime;
    seq.forEach((f, i)=>{
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.value = f;
      const t = t0 + i*0.09;
      g.gain.setValueAtTime(0.16, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      osc.connect(g); g.connect(audioCtx.destination);
      osc.start(t); osc.stop(t + 0.08);
    });
  }
  function alarmTed(){ playTedBurst(); }
  function startTedAlarm(){
    if(muted) return; ensureCtx();
    stopTedAlarm();
    playTedBurst();
    // Repeat roughly at the end of the scheduled burst (~0.63s)
    tedAlarmInterval = setInterval(()=>{ playTedBurst(); }, 700);
  }
  function stopTedAlarm(){ if (tedAlarmInterval){ clearInterval(tedAlarmInterval); tedAlarmInterval = null; } }
  function sirenCops(){ if(muted) return; ensureCtx(); burst([600, 450, 600, 450, 700], 0.12, 'sawtooth', 0.16); }
  function sadDarcy(){ if(muted) return; ensureCtx(); burst([420, 330, 260], 0.12, 'triangle', 0.14); }
  return { blip, chord, setMuted, startMusic, stopMusic, setMusicPace, fadeOutMusic, alarmTed, startTedAlarm, stopTedAlarm, sirenCops, sadDarcy };
})();


