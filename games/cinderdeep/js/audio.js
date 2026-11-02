'use strict';
// Synthesised sound and music (Web Audio). Nothing is downloaded, and nothing plays until the player
// first touches the screen or presses a key.

const Sound = (() => {
  let ac = null, master, sfx, music, verb, noiseBuf;
  let muted = !!(Store.get('cinderdeep.muted'));
  let mode = 'none', pad = null, schedTimer = 0, nextNote = 0, beat = 0, bellAt = 0;

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ac = new AC(); } catch (e) { ac = null; return; }
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.2;
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.85;
    comp.connect(master); master.connect(ac.destination);
    sfx = ac.createGain(); sfx.gain.value = 0.75; sfx.connect(comp);
    music = ac.createGain(); music.gain.value = 0.32; music.connect(comp);
    // Generated impulse response: a long, dark cave tail.
    verb = ac.createConvolver();
    const len = Math.floor(ac.sampleRate * 2.6);
    const ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    verb.buffer = ir;
    const verbOut = ac.createGain(); verbOut.gain.value = 0.42;
    verb.connect(verbOut); verbOut.connect(comp);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    if (mode !== 'none') { const m = mode; mode = 'none'; setMusic(m); }
  }

  const now = () => ac.currentTime;

  function env(g, t, vol, a, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  function tone(type, f0, f1, dur, vol, opt = {}) {
    if (!ac) return;
    const t = now() + (opt.delay || 0);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    env(g, t, vol, opt.attack || 0.004, dur);
    o.connect(g); g.connect(opt.bus || sfx);
    if (opt.wet) { const w = ac.createGain(); w.gain.value = opt.wet; g.connect(w); w.connect(verb); }
    o.start(t); o.stop(t + dur + 0.05);
  }

  function noise(dur, vol, ftype, f0, f1, q = 1, opt = {}) {
    if (!ac) return;
    const t = now() + (opt.delay || 0);
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    s.playbackRate.value = opt.rate || 1;
    const f = ac.createBiquadFilter(); f.type = ftype; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = ac.createGain(); env(g, t, vol, opt.attack || 0.003, dur);
    s.connect(f); f.connect(g); g.connect(opt.bus || sfx);
    if (opt.wet) { const w = ac.createGain(); w.gain.value = opt.wet; g.connect(w); w.connect(verb); }
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  const lib = {
    jump() { noise(0.12, 0.18, 'bandpass', 700, 2200, 1.1); },
    land() { noise(0.09, 0.22, 'lowpass', 700, 160); tone('sine', 120, 55, 0.09, 0.14); },
    slash() { noise(0.13, 0.3, 'highpass', 2600, 6000, 0.7); noise(0.09, 0.16, 'bandpass', 1300, 500, 2); },
    hit() {
      tone('triangle', 190, 55, 0.14, 0.34); noise(0.08, 0.38, 'bandpass', 2300, 700, 1.4);
      tone('square', 1300, 700, 0.03, 0.035);
    },
    clink() { tone('triangle', 1800, 1500, 0.08, 0.12, { wet: 0.4 }); noise(0.05, 0.2, 'highpass', 3000, 5000); },
    kill() { tone('sine', 320, 40, 0.38, 0.38); noise(0.45, 0.3, 'lowpass', 3200, 180); tone('triangle', 900, 300, 0.2, 0.08, { wet: 0.5 }); },
    hurt() { tone('sawtooth', 170, 45, 0.32, 0.26); noise(0.3, 0.5, 'lowpass', 4500, 250); },
    dash() { noise(0.2, 0.3, 'bandpass', 500, 3200, 0.8); tone('sine', 300, 900, 0.12, 0.05); },
    ember() {
      const f = 1500 + Math.random() * 500;
      tone('sine', f, f * 1.02, 0.12, 0.08, { wet: 0.5 }); tone('triangle', f * 2, f * 2, 0.06, 0.03);
    },
    tallow() { tone('sine', 520, 520, 0.18, 0.05, { wet: 0.6 }); },
    mendStart() { tone('sine', 260, 520, 0.85, 0.07, { attack: 0.3, wet: 0.7 }); },
    mend() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone('sine', f, f, 0.9, 0.07, { delay: i * 0.05, wet: 0.8 }));
    },
    shot() { noise(0.32, 0.42, 'lowpass', 2600, 300); tone('sawtooth', 420, 110, 0.22, 0.13); },
    spit() { noise(0.16, 0.22, 'bandpass', 900, 260, 3); },
    burst() { noise(0.25, 0.32, 'lowpass', 2000, 200); },
    break() {
      noise(0.28, 0.42, 'bandpass', 1600, 380, 0.9);
      tone('triangle', 2200, 1900, 0.07, 0.07, { delay: 0.02, wet: 0.5 });
      tone('triangle', 1700, 1500, 0.07, 0.06, { delay: 0.07, wet: 0.5 });
    },
    crack() { noise(0.12, 0.35, 'bandpass', 1100, 500, 1.2); tone('sine', 140, 80, 0.1, 0.15); },
    gate() {
      tone('square', 85, 62, 0.45, 0.12); noise(0.6, 0.32, 'lowpass', 1300, 220, 1, { wet: 0.6 });
      for (let i = 0; i < 4; i++) tone('triangle', 900 - i * 90, 800 - i * 90, 0.05, 0.05, { delay: i * 0.08 });
    },
    relic() {
      [392, 493.88, 587.33, 739.99, 987.77].forEach((f, i) => tone('sine', f, f, 2.2, 0.06, { delay: i * 0.12, attack: 0.05, wet: 1 }));
      noise(1.6, 0.08, 'bandpass', 3000, 6000, 3, { wet: 1, attack: 0.4 });
    },
    rest() { [261.6, 329.6, 392, 523.25].forEach((f, i) => tone('sine', f, f, 2.4, 0.05, { delay: i * 0.18, attack: 0.2, wet: 1 })); },
    roar() {
      tone('sawtooth', 75, 52, 1.3, 0.3, { attack: 0.08, wet: 0.6 }); tone('sawtooth', 112, 70, 1.2, 0.18, { attack: 0.1 });
      noise(1.2, 0.35, 'lowpass', 900, 140, 1, { attack: 0.15, wet: 0.5 });
    },
    slam() { tone('sine', 95, 28, 0.7, 0.62); noise(0.7, 0.58, 'lowpass', 1600, 90, 1, { wet: 0.6 }); },
    scrape() { noise(0.5, 0.18, 'bandpass', 2500, 1200, 4); },
    swipe() { noise(0.22, 0.32, 'bandpass', 700, 2600, 0.7); },
    drip() { tone('sine', 900, 1500, 0.06, 0.05, { wet: 0.8 }); },
    splash() { noise(0.18, 0.2, 'bandpass', 1400, 500, 1.4); },
    die() { tone('sine', 400, 60, 1.4, 0.25, { wet: 0.8 }); noise(1.4, 0.25, 'lowpass', 1800, 100, 1, { wet: 0.7 }); },
    bossDie() {
      tone('sawtooth', 120, 30, 2.6, 0.32, { wet: 0.8 }); noise(2.8, 0.45, 'lowpass', 2500, 60, 1, { wet: 0.8 });
      [196, 246.9, 293.7, 392].forEach((f, i) => tone('sine', f, f, 3.2, 0.06, { delay: 1 + i * 0.25, attack: 0.3, wet: 1 }));
    },
    ui() { tone('sine', 640, 640, 0.07, 0.07); },
    door() { tone('sine', 55, 45, 3, 0.3, { attack: 0.6, wet: 0.9 }); noise(3, 0.2, 'lowpass', 500, 120, 1, { attack: 0.8, wet: 1 }); },
  };

  // ---- Music ----
  const PROG = { calm: [110, 87.31, 130.81, 98], shrine: [130.81, 98, 110, 87.31] };
  const SCALE = { calm: [440, 523.25, 587.33, 659.25, 783.99, 880], shrine: [523.25, 587.33, 659.25, 783.99, 880, 1046.5] };

  function makePad() {
    const out = ac.createGain(); out.gain.value = 0.0001; out.connect(music);
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 2; f.connect(out);
    const lfo = ac.createOscillator(), lg = ac.createGain();
    lfo.frequency.value = 0.07; lg.gain.value = 180; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    const oscs = [0, 7.02, -12].map((semi, i) => {
      const o = ac.createOscillator(); o.type = i === 2 ? 'triangle' : 'sawtooth';
      o.detune.value = semi * 100 + (i === 1 ? 6 : -4);
      const g = ac.createGain(); g.gain.value = i === 2 ? 0.5 : 0.22;
      o.connect(g); g.connect(f); o.start(); return o;
    });
    const send = ac.createGain(); send.gain.value = 0.6; out.connect(send); send.connect(verb);
    return { out, oscs, lfo, chord: 0 };
  }

  function stopPad() {
    if (!pad) return;
    const p = pad; pad = null;
    const t = now();
    p.out.gain.cancelScheduledValues(t);
    p.out.gain.setValueAtTime(p.out.gain.value, t);
    p.out.gain.linearRampToValueAtTime(0.0001, t + 1.5);
    setTimeout(() => { p.oscs.forEach((o) => o.stop()); p.lfo.stop(); }, 1700);
  }

  function setMusic(m) {
    if (m === mode) return;
    mode = m;
    if (!ac) return;
    stopPad();
    clearInterval(schedTimer); schedTimer = 0;
    if (m === 'calm' || m === 'shrine') {
      pad = makePad();
      const t = now();
      pad.out.gain.linearRampToValueAtTime(m === 'shrine' ? 0.5 : 0.7, t + 3);
      setPadChord(0);
      bellAt = t + 2;
      schedTimer = setInterval(tickAmbient, 250);
    } else if (m === 'boss') {
      nextNote = now() + 0.1; beat = 0;
      schedTimer = setInterval(tickBoss, 40);
    }
  }

  function setPadChord(i) {
    if (!pad) return;
    const root = PROG[mode] ? PROG[mode][i % 4] : 110;
    const t = now();
    pad.oscs.forEach((o) => { o.frequency.setTargetAtTime(root, t, 0.8); });
    pad.chord = i;
    pad.nextChord = t + 9;
  }

  function tickAmbient() {
    if (!ac || !pad) return;
    const t = now();
    if (t > pad.nextChord) setPadChord(pad.chord + 1);
    if (t > bellAt) {
      const sc = SCALE[mode] || SCALE.calm;
      const f = sc[(Math.random() * sc.length) | 0] * (Math.random() < 0.3 ? 0.5 : 1);
      tone('sine', f, f, 2.4, 0.045, { attack: 0.01, wet: 1, bus: music });
      tone('sine', f * 2.01, f * 2.01, 1.2, 0.012, { attack: 0.01, wet: 1, bus: music });
      bellAt = t + 1.4 + Math.random() * 3.2;
    }
  }

  // Boss: a driving low ostinato with a kick and a scraped snare, scheduled slightly ahead.
  const BASS = [55, 55, 65.41, 55, 82.41, 55, 73.42, 61.74];
  function tickBoss() {
    if (!ac) return;
    const spb = 60 / 138 / 2;
    while (nextNote < now() + 0.2) {
      const t = nextNote, step = beat % 16;
      const f = BASS[beat % 8] * (beat % 32 >= 24 ? 1.189 : 1);
      const o = ac.createOscillator(), g = ac.createGain(), fl = ac.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = f;
      fl.type = 'lowpass'; fl.frequency.setValueAtTime(900, t); fl.frequency.exponentialRampToValueAtTime(160, t + spb);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.32, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + spb * 0.95);
      o.connect(fl); fl.connect(g); g.connect(music); o.start(t); o.stop(t + spb);
      if (step % 4 === 0) {
        const k = ac.createOscillator(), kg = ac.createGain();
        k.frequency.setValueAtTime(130, t); k.frequency.exponentialRampToValueAtTime(38, t + 0.18);
        kg.gain.setValueAtTime(0.7, t); kg.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        k.connect(kg); kg.connect(music); k.start(t); k.stop(t + 0.25);
      }
      if (step === 4 || step === 12) {
        const s = ac.createBufferSource(); s.buffer = noiseBuf;
        const sf = ac.createBiquadFilter(); sf.type = 'bandpass'; sf.frequency.value = 1800; sf.Q.value = 0.8;
        const sg = ac.createGain(); sg.gain.setValueAtTime(0.28, t); sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        s.connect(sf); sf.connect(sg); sg.connect(music);
        const w = ac.createGain(); w.gain.value = 0.3; sg.connect(w); w.connect(verb);
        s.start(t, Math.random() * 0.5); s.stop(t + 0.2);
      }
      if (step === 0 && beat % 32 === 0) {
        [220, 261.63, 329.63].forEach((cf) => {
          const c = ac.createOscillator(), cg = ac.createGain(); c.type = 'triangle'; c.frequency.value = cf;
          cg.gain.setValueAtTime(0.0001, t); cg.gain.linearRampToValueAtTime(0.05, t + 0.4); cg.gain.exponentialRampToValueAtTime(0.0001, t + spb * 16);
          c.connect(cg); cg.connect(music); const w = ac.createGain(); w.gain.value = 0.8; cg.connect(w); w.connect(verb);
          c.start(t); c.stop(t + spb * 16 + 0.1);
        });
      }
      nextNote += spb; beat++;
    }
  }

  return {
    init,
    play(name) { if (ac && !muted && lib[name]) lib[name](); },
    music: setMusic,
    get muted() { return muted; },
    setMuted(v) {
      muted = v; Store.set('cinderdeep.muted', v);
      if (ac) master.gain.setTargetAtTime(v ? 0 : 0.85, ac.currentTime, 0.05);
    },
    suspend() { if (ac && ac.state === 'running') ac.suspend(); },
    resume() { if (ac && ac.state === 'suspended') ac.resume(); },
  };
})();
