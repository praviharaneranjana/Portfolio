// Realistic Web Audio API Sound Generator for Military RC Drone & Vault Gate
class RealisticSoundFX {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineSub: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  public enabled = true;

  private init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  public setSoundEnabled(enable: boolean) {
    this.enabled = enable;
    if (!enable && this.engineGain && this.ctx) {
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  /** Realistic brushless electric drone motor hum (dual oscillator + low-pass filter) */
  public updateEngine(speedPct: number) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      if (!this.engineOsc) {
        this.engineOsc = this.ctx.createOscillator();
        this.engineSub = this.ctx.createOscillator();
        this.engineGain = this.ctx.createGain();

        this.engineOsc.type = "triangle";
        this.engineSub.type = "sine";

        this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);
        this.engineSub.frequency.setValueAtTime(90, this.ctx.currentTime);
        this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);

        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(280, this.ctx.currentTime);

        this.engineOsc.connect(filter);
        this.engineSub.connect(filter);
        filter.connect(this.engineGain);
        this.engineGain.connect(this.ctx.destination);

        this.engineOsc.start();
        this.engineSub.start();
      }

      if (!this.engineOsc || !this.engineSub || !this.engineGain) return;
      const now = this.ctx.currentTime;
      const baseFreq = 48 + speedPct * 75;
      const vol = speedPct > 0.05 ? Math.min(0.06, 0.01 + speedPct * 0.05) : 0;

      this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.08);
      this.engineSub.frequency.setTargetAtTime(baseFreq * 2, now, 0.08);
      this.engineGain.gain.setTargetAtTime(vol, now, 0.08);
    } catch {}
  }

  /** Subtle PlayStation UI interaction tone */
  public playPromptAppear() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, now); // E5

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.04, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } catch {}
  }

  /** PlayStation Confirmation chime & heavy hydraulic release sound */
  public playUnlockSequence() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Authentic PS confirmation two-tone chime (F#5 -> B5)
      [739.99, 987.77].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.06, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.45);
      });

      // Heavy industrial hydraulic air release & mechanical clunk
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = "triangle";
      subOsc.frequency.setValueAtTime(80, now + 0.15);
      subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.8);

      subGain.gain.setValueAtTime(0.09, now + 0.15);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(now + 0.15);
      subOsc.stop(now + 0.95);
    } catch {}
  }

  public stopAll() {
    try {
      if (this.engineGain && this.ctx) {
        this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
    } catch {}
  }
}

export const sound = new RealisticSoundFX();
