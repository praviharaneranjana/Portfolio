// Cinema-Grade Procedural Web Audio API Sound Generator for RC Car & Vault Gate
class RealisticSoundFX {
  private ctx: AudioContext | null = null;
  public enabled = true;

  // Car engine (electric brushless motor)
  private engineOsc: OscillatorNode | null = null;
  private engineSub: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;

  // Rubber tire rolling friction & floor contact
  private tireNoiseSource: AudioBufferSourceNode | null = null;
  private tireFilter: BiquadFilterNode | null = null;
  private tireGain: GainNode | null = null;
  private tireRumbleOsc: OscillatorNode | null = null;
  private tireRumbleGain: GainNode | null = null;

  // Rubber tire cornering scrub / squeak
  private tireScrubSource: AudioBufferSourceNode | null = null;
  private tireScrubFilter: BiquadFilterNode | null = null;
  private tireScrubGain: GainNode | null = null;

  // Active timers / intervals to clear on stopAll
  private activeTimeouts: number[] = [];

  private init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  /** Create looped noise buffer for physical friction synthesis */
  private createNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      // Pink / brownian weighted noise for realistic material texture
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.025 * white) / 1.025;
      lastOut = data[i];
      data[i] *= 3.5; // Gain compensation
    }
    return buffer;
  }

  public setSoundEnabled(enable: boolean) {
    this.enabled = enable;
    if (!enable) {
      this.stopAll();
    }
  }

  /**
   * Realistic vehicle audio:
   * 1. Brushless electric RC motor whine + sub-bass torque
   * 2. Heavy rubber tires rolling against the concrete floor (speed-dependent rumble + friction)
   * 3. Tire scrub/squeak on lateral turns and drift slides
   */
  public updateDriveSounds(speedPct: number, turnPct: number = 0, isAccelerating: boolean = false) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // 1. Electric Motor Setup & Update
      if (!this.engineOsc) {
        this.engineOsc = this.ctx.createOscillator();
        this.engineSub = this.ctx.createOscillator();
        this.engineGain = this.ctx.createGain();

        this.engineOsc.type = "triangle";
        this.engineSub.type = "sine";

        this.engineOsc.frequency.setValueAtTime(45, now);
        this.engineSub.frequency.setValueAtTime(90, now);
        this.engineGain.gain.setValueAtTime(0, now);

        const motorFilter = this.ctx.createBiquadFilter();
        motorFilter.type = "lowpass";
        motorFilter.frequency.setValueAtTime(320, now);

        this.engineOsc.connect(motorFilter);
        this.engineSub.connect(motorFilter);
        motorFilter.connect(this.engineGain);
        this.engineGain.connect(this.ctx.destination);

        this.engineOsc.start();
        this.engineSub.start();
      }

      // 2. Rubber Tire on Floor Rolling Sound Setup
      if (!this.tireNoiseSource) {
        const noiseBuf = this.createNoiseBuffer();
        if (noiseBuf) {
          this.tireNoiseSource = this.ctx.createBufferSource();
          this.tireNoiseSource.buffer = noiseBuf;
          this.tireNoiseSource.loop = true;

          this.tireFilter = this.ctx.createBiquadFilter();
          this.tireFilter.type = "bandpass";
          this.tireFilter.Q.setValueAtTime(1.2, now);
          this.tireFilter.frequency.setValueAtTime(180, now);

          this.tireGain = this.ctx.createGain();
          this.tireGain.gain.setValueAtTime(0, now);

          this.tireNoiseSource.connect(this.tireFilter);
          this.tireFilter.connect(this.tireGain);
          this.tireGain.connect(this.ctx.destination);
          this.tireNoiseSource.start();
        }

        // Low frequency tire tread rumble oscillator
        this.tireRumbleOsc = this.ctx.createOscillator();
        this.tireRumbleGain = this.ctx.createGain();
        this.tireRumbleOsc.type = "sine";
        this.tireRumbleOsc.frequency.setValueAtTime(45, now);
        this.tireRumbleGain.gain.setValueAtTime(0, now);

        this.tireRumbleOsc.connect(this.tireRumbleGain);
        this.tireRumbleGain.connect(this.ctx.destination);
        this.tireRumbleOsc.start();
      }

      // 3. Rubber Tire Scrub / Squeak on Turns
      if (!this.tireScrubSource) {
        const scrubBuf = this.createNoiseBuffer();
        if (scrubBuf) {
          this.tireScrubSource = this.ctx.createBufferSource();
          this.tireScrubSource.buffer = scrubBuf;
          this.tireScrubSource.loop = true;

          this.tireScrubFilter = this.ctx.createBiquadFilter();
          this.tireScrubFilter.type = "bandpass";
          this.tireScrubFilter.Q.setValueAtTime(3.8, now);
          this.tireScrubFilter.frequency.setValueAtTime(1400, now);

          this.tireScrubGain = this.ctx.createGain();
          this.tireScrubGain.gain.setValueAtTime(0, now);

          this.tireScrubSource.connect(this.tireScrubFilter);
          this.tireScrubFilter.connect(this.tireScrubGain);
          this.tireScrubGain.connect(this.ctx.destination);
          this.tireScrubSource.start();
        }
      }

      // MOTOR UPDATES
      if (this.engineOsc && this.engineSub && this.engineGain) {
        const motorBaseFreq = 50 + speedPct * 95 + (isAccelerating ? 25 : 0);
        const motorVol = speedPct > 0.03 ? Math.min(0.065, 0.015 + speedPct * 0.05) : 0;
        this.engineOsc.frequency.setTargetAtTime(motorBaseFreq, now, 0.08);
        this.engineSub.frequency.setTargetAtTime(motorBaseFreq * 2, now, 0.08);
        this.engineGain.gain.setTargetAtTime(motorVol, now, 0.08);
      }

      // RUBBER TIRE TREAD CONTACT UPDATES
      if (this.tireFilter && this.tireGain && this.tireRumbleOsc && this.tireRumbleGain) {
        // As car speeds up, tire tread frequency and volume increase
        const tireFreq = 160 + speedPct * 320;
        const tireVol = speedPct > 0.03 ? Math.min(0.085, 0.01 + speedPct * 0.075) : 0;
        const rumbleFreq = 38 + speedPct * 70;
        const rumbleVol = speedPct > 0.03 ? Math.min(0.05, 0.008 + speedPct * 0.04) : 0;

        this.tireFilter.frequency.setTargetAtTime(tireFreq, now, 0.08);
        this.tireGain.gain.setTargetAtTime(tireVol, now, 0.08);

        this.tireRumbleOsc.frequency.setTargetAtTime(rumbleFreq, now, 0.08);
        this.tireRumbleGain.gain.setTargetAtTime(rumbleVol, now, 0.08);
      }

      // RUBBER TIRE LATERAL SCRUB / SQUEAK ON SHARP TURNS
      if (this.tireScrubFilter && this.tireScrubGain) {
        const turnIntensity = Math.abs(turnPct);
        const scrubActive = turnIntensity > 0.12 && speedPct > 0.18;
        const scrubVol = scrubActive ? Math.min(0.055, (turnIntensity - 0.12) * speedPct * 0.1) : 0;
        const scrubFreq = 1200 + turnIntensity * 400 + Math.random() * 100;

        this.tireScrubFilter.frequency.setTargetAtTime(scrubFreq, now, 0.05);
        this.tireScrubGain.gain.setTargetAtTime(scrubVol, now, 0.06);
      }
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
      gain.gain.linearRampToValueAtTime(0.045, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.17);
    } catch {}
  }

  /** Single mechanical vault tumbler click with metallic ping */
  private playTumblerClick(time: number, pitch = 1800, volume = 0.04) {
    if (!this.ctx || !this.enabled) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = "square";
      osc.frequency.setValueAtTime(pitch, time);
      osc.frequency.exponentialRampToValueAtTime(pitch * 0.4, time + 0.025);

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(pitch * 0.9, time);
      filter.Q.setValueAtTime(4.0, time);

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(volume, time + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.025);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(time);
      osc.stop(time + 0.03);
    } catch {}
  }

  /** Heavy steel sliding clunk (locking pins & sliding cross-bolts) */
  private playMetalSlidingClunk(time: number, duration: number) {
    if (!this.ctx || !this.enabled) return;
    try {
      // Sliding metallic friction
      const noise = this.createNoiseBuffer();
      if (noise) {
        const src = this.ctx.createBufferSource();
        src.buffer = noise;
        const filter = this.ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(850, time);
        filter.frequency.linearRampToValueAtTime(550, time + duration);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.06, time + 0.05);
        gain.gain.linearRampToValueAtTime(0.04, time + duration - 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        src.start(time);
        src.stop(time + duration);
      }

      // End locking clunk
      const clunkTime = time + duration;
      const clunkOsc = this.ctx.createOscillator();
      const clunkGain = this.ctx.createGain();
      clunkOsc.type = "triangle";
      clunkOsc.frequency.setValueAtTime(110, clunkTime);
      clunkOsc.frequency.exponentialRampToValueAtTime(35, clunkTime + 0.18);

      clunkGain.gain.setValueAtTime(0.08, clunkTime);
      clunkGain.gain.exponentialRampToValueAtTime(0.0001, clunkTime + 0.22);

      clunkOsc.connect(clunkGain);
      clunkGain.connect(this.ctx.destination);
      clunkOsc.start(clunkTime);
      clunkOsc.stop(clunkTime + 0.23);
    } catch {}
  }

  /**
   * AUTHENTIC SAFE VAULT UNLOCK & OPENING SYMPHONY:
   * 1. PlayStation confirmation chime (F#5 -> B5)
   * 2. Vault Wheel Rotation: precision ratcheting tumbler clicks & internal gear teeth meshing
   * 3. Heavy steel locking pins & cross-bolts sliding back with metallic clanks
   * 4. High-pressure pneumatic unseal hiss
   * 5. Massive steel vault doors rolling open along heavy floor tracks
   * 6. RC Car turbo motor surge into the dark void
   * 7. Deep ethereal Door to Eternity portal resonance
   */
  public playUnlockSequence() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // 1. Authentic PS confirmation two-tone chime (F#5 -> B5)
      [739.99, 987.77].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.06, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.42);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.45);
      });

      // 2. Vault Combination Dial Rotation: Sequence of 28 precision safe tumbler clicks
      const clickStart = now + 0.22;
      const totalClicks = 28;
      const clickDuration = 1.35; // spans dial rotation from t=0.2s to 1.6s
      for (let i = 0; i < totalClicks; i++) {
        // Accelerating then decelerating safe wheel rotation cadence
        const progress = i / totalClicks;
        const timing = clickStart + Math.pow(progress, 1.25) * clickDuration;
        const pitch = 1750 + Math.sin(i * 0.8) * 350;
        const vol = 0.035 + (i % 4 === 0 ? 0.025 : 0); // accented quadrant ticks
        this.playTumblerClick(timing, pitch, vol);
      }

      // Internal gear train whir during wheel rotation
      const gearOsc = this.ctx.createOscillator();
      const gearGain = this.ctx.createGain();
      const gearFilter = this.ctx.createBiquadFilter();
      gearOsc.type = "sawtooth";
      gearOsc.frequency.setValueAtTime(92, clickStart);
      gearOsc.frequency.linearRampToValueAtTime(145, clickStart + 0.6);
      gearOsc.frequency.linearRampToValueAtTime(80, clickStart + clickDuration);

      gearFilter.type = "lowpass";
      gearFilter.frequency.setValueAtTime(260, clickStart);

      gearGain.gain.setValueAtTime(0, clickStart);
      gearGain.gain.linearRampToValueAtTime(0.03, clickStart + 0.1);
      gearGain.gain.exponentialRampToValueAtTime(0.0001, clickStart + clickDuration + 0.1);

      gearOsc.connect(gearFilter);
      gearFilter.connect(gearGain);
      gearGain.connect(this.ctx.destination);
      gearOsc.start(clickStart);
      gearOsc.stop(clickStart + clickDuration + 0.12);

      // 3. Locking Pins Retracting (t = 0.35s to 0.85s)
      this.playMetalSlidingClunk(now + 0.35, 0.45);

      // 4. Heavy Steel Cross-Bolts Sliding Back (t = 0.45s to 1.05s)
      this.playMetalSlidingClunk(now + 0.45, 0.6);

      // 5. High-Pressure Pneumatic Vacuum Unseal Hiss (t = 0.75s to 1.35s)
      const unsealTime = now + 0.75;
      const unsealBuf = this.createNoiseBuffer();
      if (unsealBuf) {
        const unsealSrc = this.ctx.createBufferSource();
        unsealSrc.buffer = unsealBuf;

        const unsealFilter = this.ctx.createBiquadFilter();
        unsealFilter.type = "bandpass";
        unsealFilter.frequency.setValueAtTime(1800, unsealTime);
        unsealFilter.frequency.exponentialRampToValueAtTime(420, unsealTime + 0.65);
        unsealFilter.Q.setValueAtTime(2.2, unsealTime);

        const unsealGain = this.ctx.createGain();
        unsealGain.gain.setValueAtTime(0, unsealTime);
        unsealGain.gain.linearRampToValueAtTime(0.075, unsealTime + 0.04);
        unsealGain.gain.exponentialRampToValueAtTime(0.0001, unsealTime + 0.65);

        unsealSrc.connect(unsealFilter);
        unsealFilter.connect(unsealGain);
        unsealGain.connect(this.ctx.destination);
        unsealSrc.start(unsealTime);
        unsealSrc.stop(unsealTime + 0.68);
      }

      // 6. Massive Steel Vault Doors Rolling Open along Heavy Tracks (t = 1.0s to 2.8s)
      const doorOpenTime = now + 1.0;
      const doorOpenDuration = 1.8;
      const doorBuf = this.createNoiseBuffer();
      if (doorBuf) {
        const doorSrc = this.ctx.createBufferSource();
        doorSrc.buffer = doorBuf;

        // Grinding metallic rail friction
        const doorFilter = this.ctx.createBiquadFilter();
        doorFilter.type = "bandpass";
        doorFilter.frequency.setValueAtTime(320, doorOpenTime);
        doorFilter.Q.setValueAtTime(1.8, doorOpenTime);

        const doorGain = this.ctx.createGain();
        doorGain.gain.setValueAtTime(0, doorOpenTime);
        doorGain.gain.linearRampToValueAtTime(0.07, doorOpenTime + 0.3);
        doorGain.gain.linearRampToValueAtTime(0.065, doorOpenTime + doorOpenDuration - 0.4);
        doorGain.gain.exponentialRampToValueAtTime(0.0001, doorOpenTime + doorOpenDuration);

        doorSrc.connect(doorFilter);
        doorFilter.connect(doorGain);
        doorGain.connect(this.ctx.destination);
        doorSrc.start(doorOpenTime);
        doorSrc.stop(doorOpenTime + doorOpenDuration + 0.05);

        // Low heavy door mass rumble
        const doorSub = this.ctx.createOscillator();
        const doorSubGain = this.ctx.createGain();
        doorSub.type = "triangle";
        doorSub.frequency.setValueAtTime(62, doorOpenTime);
        doorSub.frequency.linearRampToValueAtTime(54, doorOpenTime + doorOpenDuration);

        doorSubGain.gain.setValueAtTime(0, doorOpenTime);
        doorSubGain.gain.linearRampToValueAtTime(0.08, doorOpenTime + 0.2);
        doorSubGain.gain.exponentialRampToValueAtTime(0.0001, doorOpenTime + doorOpenDuration);

        doorSub.connect(doorSubGain);
        doorSubGain.connect(this.ctx.destination);
        doorSub.start(doorOpenTime);
        doorSub.stop(doorOpenTime + doorOpenDuration + 0.05);
      }

      // 7. Door to Eternity Portal Cosmic Resonance (t = 3.0s to 4.2s)
      const portalTime = now + 3.0;
      const portalSub = this.ctx.createOscillator();
      const portalSubGain = this.ctx.createGain();
      portalSub.type = "sine";
      portalSub.frequency.setValueAtTime(42, portalTime);
      portalSub.frequency.exponentialRampToValueAtTime(70, portalTime + 1.1);

      portalSubGain.gain.setValueAtTime(0, portalTime);
      portalSubGain.gain.linearRampToValueAtTime(0.09, portalTime + 0.3);
      portalSubGain.gain.exponentialRampToValueAtTime(0.0001, portalTime + 1.2);

      portalSub.connect(portalSubGain);
      portalSubGain.connect(this.ctx.destination);
      portalSub.start(portalTime);
      portalSub.stop(portalTime + 1.25);

      // Ethereal portal shimmer tone
      const portalTone = this.ctx.createOscillator();
      const portalToneGain = this.ctx.createGain();
      portalTone.type = "sine";
      portalTone.frequency.setValueAtTime(528, portalTime); // Solfeggio 528Hz Transformation Tone
      portalTone.frequency.linearRampToValueAtTime(660, portalTime + 0.9);

      portalToneGain.gain.setValueAtTime(0, portalTime);
      portalToneGain.gain.linearRampToValueAtTime(0.04, portalTime + 0.2);
      portalToneGain.gain.exponentialRampToValueAtTime(0.0001, portalTime + 1.2);

      portalTone.connect(portalToneGain);
      portalToneGain.connect(this.ctx.destination);
      portalTone.start(portalTime);
      portalTone.stop(portalTime + 1.25);
    } catch {}
  }

  public stopAll() {
    this.activeTimeouts.forEach((id) => window.clearTimeout(id));
    this.activeTimeouts = [];

    try {
      if (this.ctx) {
        const now = this.ctx.currentTime;
        if (this.engineGain) this.engineGain.gain.setValueAtTime(0, now);
        if (this.tireGain) this.tireGain.gain.setValueAtTime(0, now);
        if (this.tireRumbleGain) this.tireRumbleGain.gain.setValueAtTime(0, now);
        if (this.tireScrubGain) this.tireScrubGain.gain.setValueAtTime(0, now);
      }
    } catch {}
  }
}

export const sound = new RealisticSoundFX();
