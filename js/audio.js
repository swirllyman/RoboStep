// audio.js - Synthesized Web Audio Sound Effects
// Completely self-contained: no external MP3/WAV files required!

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('robostep_muted') === 'true';
    // Notes scale for step counting (C4 major pentatonic & beyond)
    this.stepScale = [
      261.63, 293.66, 329.63, 392.00, 440.00, // C4, D4, E4, G4, A4
      523.25, 587.33, 659.25, 783.99, 880.00, // C5, D5, E5, G5, A5
      1046.50, 1174.66, 1318.51, 1567.98, 1760.00 // C6...
    ];
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  isMuted() {
    return this.muted;
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('robostep_muted', this.muted);
    return this.muted;
  }

  // Play a musical step tone that rises with stepIndex so kids count along!
  playStep(stepIndex = 1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const noteIdx = (stepIndex - 1) % this.stepScale.length;
    const freq = this.stepScale[noteIdx];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  // Soft button click / tap
  playClick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.07);
  }

  // Delete / backspace sound
  playDelete() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.07);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.09);
  }

  // Bump against rock or wall: cartoon spring boing
  playBump() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.25);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(now + 0.3);
  }

  // Fall into pit: slide whistle dropping
  playFall() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.45);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(now + 0.5);
  }

  // Gem collected: sparkling chime
  playGem() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const chords = [659.25, 830.61, 987.77, 1318.51]; // E5, G#5, B5, E6
    chords.forEach((freq, idx) => {
      const now = this.ctx.currentTime + idx * 0.07;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    });
  }

  // Level cleared victory fanfare!
  playWin() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [
      { freq: 523.25, delay: 0.0, dur: 0.12 }, // C5
      { freq: 659.25, delay: 0.12, dur: 0.12 }, // E5
      { freq: 783.99, delay: 0.24, dur: 0.12 }, // G5
      { freq: 1046.50, delay: 0.36, dur: 0.4 }  // C6
    ];

    notes.forEach(n => {
      const start = this.ctx.currentTime + n.delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.freq, start);

      gain.gain.setValueAtTime(0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + n.dur);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(start);
      osc.stop(start + n.dur + 0.05);
    });
  }

  // Ingredient picked up: a bright rising plink that climbs with each one
  // collected, so the recipe audibly fills up.
  playPickup(collectedCount = 1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const base = this.stepScale[Math.min(collectedCount + 3, this.stepScale.length - 1)];
    [base, base * 1.5].forEach((freq, idx) => {
      const now = this.ctx.currentTime + idx * 0.06;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    });
  }

  // The blender whirring: filtered noise plus a wobbling motor hum.
  playBlend(duration = 1.0) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Motor: a low sawtooth that wobbles as the blades bite.
    const motor = this.ctx.createOscillator();
    const motorGain = this.ctx.createGain();
    motor.type = 'sawtooth';
    motor.frequency.setValueAtTime(90, now);
    motor.frequency.linearRampToValueAtTime(150, now + duration * 0.6);
    motor.frequency.linearRampToValueAtTime(110, now + duration);

    const wobble = this.ctx.createOscillator();
    const wobbleGain = this.ctx.createGain();
    wobble.type = 'sine';
    wobble.frequency.setValueAtTime(18, now);
    wobbleGain.gain.setValueAtTime(30, now);
    wobble.connect(wobbleGain);
    wobbleGain.connect(motor.frequency);

    motorGain.gain.setValueAtTime(0.0001, now);
    motorGain.gain.exponentialRampToValueAtTime(0.12, now + 0.08);
    motorGain.gain.setValueAtTime(0.12, now + duration - 0.15);
    motorGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(900, now);

    motor.connect(motorGain);
    motorGain.connect(lowpass);
    lowpass.connect(this.ctx.destination);

    motor.start(now);
    wobble.start(now);
    motor.stop(now + duration + 0.05);
    wobble.stop(now + duration + 0.05);
  }

  // Drinking it down: a rising slurp, then a happy little "mmm".
  playSlurp() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    const slurp = this.ctx.createOscillator();
    const slurpGain = this.ctx.createGain();
    slurp.type = 'sawtooth';
    slurp.frequency.setValueAtTime(160, now);
    slurp.frequency.exponentialRampToValueAtTime(680, now + 0.45);

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(700, now);
    bandpass.Q.setValueAtTime(6, now);

    slurpGain.gain.setValueAtTime(0.14, now);
    slurpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    slurp.connect(bandpass);
    bandpass.connect(slurpGain);
    slurpGain.connect(this.ctx.destination);
    slurp.start(now);
    slurp.stop(now + 0.55);

    // "Mmm, yummy!"
    [523.25, 659.25].forEach((freq, idx) => {
      const start = now + 0.5 + idx * 0.14;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  }

  // Hint: a friendly two-note "psst, look here" chime
  playHint() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    [659.25, 987.77].forEach((freq, idx) => {
      const now = this.ctx.currentTime + idx * 0.11;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.32);
    });
  }

  // One star landing in the win modal: a bright chime that climbs with each
  // star, so three stars sound like a little rising fanfare.
  playStarEarned(starIndex = 1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    // C6, E6, G6 - one note per star, so the third lands highest.
    const root = [1046.50, 1318.51, 1567.98][Math.min(starIndex, 3) - 1] || 1046.50;

    // The chime itself, plus a shimmering fifth above it.
    [{ freq: root, gain: 0.22, dur: 0.5 }, { freq: root * 1.5, gain: 0.1, dur: 0.35 }]
      .forEach(({ freq, gain: peak, dur }) => {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(peak, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + dur + 0.05);
      });
  }

  // The sparkle of a star burst: a quick shimmer of high, random plinks.
  playSparkle() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    for (let i = 0; i < 6; i++) {
      const start = this.ctx.currentTime + i * 0.045;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400 + Math.random() * 1400, start);

      gain.gain.setValueAtTime(0.09, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(start);
      osc.stop(start + 0.2);
    }
  }

  // Unlocking new customization fanfare
  playUnlock() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const arpeggio = [440, 554.37, 659.25, 880, 1108.73, 1318.51]; // A major
    arpeggio.forEach((freq, idx) => {
      const start = this.ctx.currentTime + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.22, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(start);
      osc.stop(start + 0.45);
    });
  }
}

// Global audio singleton
const Sound = new SoundEngine();
