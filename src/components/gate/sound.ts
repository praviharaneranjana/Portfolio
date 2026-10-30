// Procedural Web Audio for the vault gate: wheel ratchet ticks and the unlock sequence. No audio files.
class VaultSound {
  private ctx: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  public enabled = true;

  private init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx?.state === "suspended") this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  /** Two seconds of brown-ish noise, reused for every friction/hiss sound. */
  private noiseBuffer(ctx: AudioContext) {
    if (this.noise) return this.noise;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      last = (last + 0.025 * (Math.random() * 2 - 1)) / 1.025;
      data[i] = last * 3.5;
    }
    return (this.noise = buffer);
  }

  setEnabled(enable: boolean) {
    this.enabled = enable;
  }

  /** One ratchet click of the handwheel. Call it every few degrees while the wheel turns. */
  tick(volume = 0.035) {
    if (!this.enabled) return;
    const ctx = this.init();
    if (!ctx) return;
    this.click(ctx, ctx.currentTime, 1500 + Math.random() * 500, volume);
  }

  private click(ctx: AudioContext, time: number, pitch: number, volume: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(pitch, time);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.4, time + 0.025);
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(pitch * 0.9, time);
    filter.Q.setValueAtTime(4, time);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.025);
    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.03);
  }

  /** Band-passed noise with an envelope: sliding steel, pneumatic hiss, door rumble. */
  private friction(ctx: AudioContext, time: number, duration: number, freq: [number, number], volume: number, q = 1.8) {
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx);
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.setValueAtTime(q, time);
    filter.frequency.setValueAtTime(freq[0], time);
    filter.frequency.exponentialRampToValueAtTime(freq[1], time + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + Math.min(0.08, duration / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(time);
    src.stop(time + duration + 0.02);
  }

  private thud(ctx: AudioContext, time: number, from: number, to: number, volume: number, duration = 0.22) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(from, time);
    osc.frequency.exponentialRampToValueAtTime(to, time + duration * 0.8);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(time);
    osc.stop(time + duration + 0.01);
  }

  /** Timed to GateCanvas's unlock timeline: pins, bolts, unseal hiss, doors rolling into their pockets. */
  unlock() {
    if (!this.enabled) return;
    const ctx = this.init();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.thud(ctx, now, 140, 50, 0.09); // tumblers drop
    this.friction(ctx, now + 0.1, 0.45, [900, 600], 0.05); // pins retract
    this.thud(ctx, now + 0.55, 110, 35, 0.08);
    this.friction(ctx, now + 0.3, 0.7, [850, 520], 0.06); // cross-bolts slide
    this.thud(ctx, now + 1.0, 100, 32, 0.1, 0.3);
    this.friction(ctx, now + 1.05, 0.6, [1800, 420], 0.07, 2.2); // pressure seal releases
    this.friction(ctx, now + 1.4, 1.6, [320, 260], 0.07); // doors roll on their tracks
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = "triangle";
    sub.frequency.setValueAtTime(62, now + 1.4);
    sub.frequency.linearRampToValueAtTime(52, now + 3);
    subGain.gain.setValueAtTime(0, now + 1.4);
    subGain.gain.linearRampToValueAtTime(0.08, now + 1.6);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 3);
    sub.connect(subGain).connect(ctx.destination);
    sub.start(now + 1.4);
    sub.stop(now + 3.05);
  }
}

export const sound = new VaultSound();
