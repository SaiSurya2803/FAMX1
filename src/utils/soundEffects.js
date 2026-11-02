// Web Audio API Synthesized Audio Engine for Kinsutra AI
// Zero external assets, ultra-low latency, pure mathematical synthesis

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = typeof window !== 'undefined' ? localStorage.getItem('kinsutra_muted') === 'true' : false;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('kinsutra_muted', this.isMuted ? 'true' : 'false');
    }
    return this.isMuted;
  }

  // Soft crystalline click / pop
  playPop() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(150, t + 0.05);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.05);
    } catch (_) {}
  }

  // High-frequency bell chime when selecting a relative
  playSelect() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      [880, 1320].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + i * 0.02);

        gain.gain.setValueAtTime(0.06 / (i + 1), t + i * 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25 + i * 0.02);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t + i * 0.02);
        osc.stop(t + 0.28);
      });
    } catch (_) {}
  }

  // Cinematic swoosh for recentering / camera movement
  playSwoosh() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(540, t + 0.14);

      gain.gain.setValueAtTime(0.04, t);
      gain.gain.linearRampToValueAtTime(0.08, t + 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.18);
    } catch (_) {}
  }

  // Celebratory ascending chime for AI completion & demo load
  playSuccess() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.07);

        gain.gain.setValueAtTime(0.09, t + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.07 + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t + idx * 0.07);
        osc.stop(t + idx * 0.07 + 0.36);
      });
    } catch (_) {}
  }
}

export const soundFX = new SoundEngine();
