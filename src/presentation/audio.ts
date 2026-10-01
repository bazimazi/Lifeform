export class AudioFeedback {
  private ctx: AudioContext | null = null;
  play(kind: 'food' | 'mutation' | 'birth' | 'death') {
    try {
      this.ctx ??= new AudioContext();
      void this.ctx.resume();
      const tones =
        kind === 'mutation'
          ? [261.63, 329.63, 392, 523.25]
          : kind === 'birth'
            ? [392, 493.88, 587.33]
            : kind === 'death'
              ? [164.81, 130.81]
              : [440, 660];
      for (let i = 0; i < tones.length; i++) {
        const oscillator = this.ctx.createOscillator(),
          gain = this.ctx.createGain();
        const at = this.ctx.currentTime + i * 0.09;
        oscillator.type = 'sine';
        oscillator.frequency.value = tones[i];
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(0.045, at + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, at + 0.35);
        oscillator.connect(gain);
        gain.connect(this.ctx.destination);
        oscillator.start(at);
        oscillator.stop(at + 0.4);
      }
    } catch {
      /* Gameplay continues when Web Audio is unavailable. */
    }
  }
}
