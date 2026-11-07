// The voice of the bonshō, synthesised: a struck log thud, then a cluster of inharmonic
// partials in slowly beating pairs (the "unari", the wavering hum a temple bell is
// prized for), decaying over half a minute in a generated stone-hall reverb.
export class BellVoice {
  constructor() { this.ctx = null; this.enabled = true; }

  ensure() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.55;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 3;
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(5.5);
    const wet = ctx.createGain(); wet.gain.value = 0.45;
    const dry = ctx.createGain(); dry.gain.value = 0.8;
    this.bus = ctx.createGain();
    this.bus.connect(dry); this.bus.connect(this.reverb); this.reverb.connect(wet);
    dry.connect(comp); wet.connect(comp); comp.connect(this.master); this.master.connect(ctx.destination);
    return ctx;
  }

  impulse(sec) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3.2) * (t < 0.002 ? t / 0.002 : 1);
      }
    }
    return buf;
  }

  strike(power = 1) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime + 0.02;
    const f0 = 98;
    // [ratio, gain, decay seconds, beat Hz]
    const partials = [
      [0.5, 0.55, 26, 0.0], [1.0, 0.75, 22, 0.45], [1.19, 0.35, 15, 0.7], [1.52, 0.3, 12, 0.9],
      [2.0, 0.42, 14, 1.3], [2.68, 0.25, 8, 1.7], [3.02, 0.2, 7, 2.1], [4.08, 0.14, 4.5, 2.6],
      [5.39, 0.09, 3, 3.1], [6.8, 0.06, 2, 3.5],
    ];
    const out = ctx.createGain();
    out.gain.value = 0.32 * power;
    out.connect(this.bus);
    for (const [r, g, decay, beat] of partials) {
      for (const detune of beat ? [-beat / 2, beat / 2] : [0]) {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f0 * r + detune;
        const e = ctx.createGain();
        e.gain.setValueAtTime(0, now);
        e.gain.linearRampToValueAtTime(g / (beat ? 2 : 1), now + 0.012 + r * 0.002);
        e.gain.exponentialRampToValueAtTime(0.0008, now + decay);
        o.connect(e); e.connect(out);
        o.start(now); o.stop(now + decay + 0.1);
      }
    }
    // the log hitting bronze: a short filtered noise thump
    const n = ctx.createBufferSource();
    const nb = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
    const d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 6);
    n.buffer = nb;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 0.9;
    const ng = ctx.createGain(); ng.gain.value = 0.9 * power;
    n.connect(bp); bp.connect(ng); ng.connect(out);
    n.start(now);
  }

  // a tiny bronze tinkle for the wind bells, when the camera passes close
  chime() {
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx, now = ctx.currentTime + 0.01;
    for (const f of [1870, 2950, 4210]) {
      const o = ctx.createOscillator(); o.frequency.value = f * (0.98 + Math.random() * 0.04);
      const e = ctx.createGain();
      e.gain.setValueAtTime(0, now); e.gain.linearRampToValueAtTime(0.02, now + 0.005); e.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
      o.connect(e); e.connect(this.bus); o.start(now); o.stop(now + 1.7);
    }
  }
}
