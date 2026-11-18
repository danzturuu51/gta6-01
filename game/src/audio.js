// All sound is synthesized with WebAudio — no audio files anywhere. A tiny
// helper builds short tones and noise bursts; the game calls the named
// effects, and the engine hum follows the player's speed.

export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let enabled = true;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!enabled) return;
    const ac = ensure();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), ac.currentTime + dur);
    gain.gain.setValueAtTime(vol || 0.12, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + dur + 0.02);
  }

  function noise(dur, vol, lowpass) {
    if (!enabled) return;
    const ac = ensure();
    if (!ac) return;
    const len = Math.floor(ac.sampleRate * dur);
    const buffer = ac.createBuffer(1, len, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass || 1200;
    const gain = ac.createGain();
    gain.gain.value = vol || 0.2;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    src.start();
  }

  return {
    unlock() {
      const ac = ensure();
      if (ac && ac.state === 'suspended') ac.resume();
    },
    setEnabled(on) {
      enabled = on;
    },
    blip() { tone(880, 0.08, 'sine', 0.1, 1320); },
    pickup() { tone(660, 0.1, 'sine', 0.14, 990); tone(990, 0.14, 'sine', 0.12, 1320); },
    cash() { tone(523, 0.09, 'triangle', 0.16); setTimeout(() => tone(784, 0.12, 'triangle', 0.16), 90); setTimeout(() => tone(1046, 0.18, 'triangle', 0.16), 180); },
    punch() { noise(0.09, 0.25, 900); },
    gunshot() { noise(0.16, 0.4, 2600); tone(160, 0.12, 'sawtooth', 0.18, 50); },
    crash() { noise(0.3, 0.35, 700); tone(90, 0.25, 'sawtooth', 0.2, 40); },
    siren() { tone(700, 0.5, 'sine', 0.06, 950); },
    busted() { tone(392, 0.25, 'square', 0.14); setTimeout(() => tone(311, 0.4, 'square', 0.14), 240); },
    mission() { tone(440, 0.12, 'triangle', 0.15, 660); setTimeout(() => tone(660, 0.2, 'triangle', 0.15), 120); },
    engineStart() { tone(60, 0.4, 'sawtooth', 0.16, 140); },
    setEngine(speed01, on) {
      if (!enabled) return;
      const ac = ensure();
      if (!ac) return;
      if (!on || speed01 <= 0.02) {
        if (engineOsc) { try { engineOsc.stop(); } catch { /* already stopped */ } engineOsc = null; }
        return;
      }
      if (!engineOsc) {
        engineOsc = ac.createOscillator();
        engineGain = ac.createGain();
        engineOsc.type = 'sawtooth';
        engineGain.gain.value = 0.03;
        const filter = ac.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 420;
        engineOsc.connect(filter);
        filter.connect(engineGain);
        engineGain.connect(ac.destination);
        engineOsc.start();
      }
      engineOsc.frequency.setTargetAtTime(55 + speed01 * 130, ac.currentTime, 0.1);
      engineGain.gain.setTargetAtTime(0.02 + speed01 * 0.05, ac.currentTime, 0.1);
    },
  };
}
