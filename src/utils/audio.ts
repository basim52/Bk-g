// Spatial Web Audio Synthesizer for Cosmic Flow Interactive Game

let audioCtx: AudioContext | null = null;
let spaceDrone: OscillatorNode | null = null;
let spaceDroneGain: GainNode | null = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playAmbientDrone() {
  try {
    const ctx = getAudioContext();
    if (spaceDrone) return;

    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const gainNode = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(55, ctx.currentTime); // Low A hum

    // LFO for sweet space modulation
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.15, ctx.currentTime); // very slow
    lfoGain.gain.setValueAtTime(10, ctx.currentTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(120, ctx.currentTime);
    filter.Q.setValueAtTime(4, ctx.currentTime);

    gainNode.gain.setValueAtTime(0.02, ctx.currentTime); // gentle volume

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    lfo.start();

    spaceDrone = osc;
    spaceDroneGain = gainNode;
  } catch (e) {
    console.warn('Audio drone failed to start', e);
  }
}

export function stopAmbientDrone() {
  if (spaceDrone) {
    try {
      spaceDrone.stop();
      spaceDrone = null;
    } catch {}
  }
}

export function playSpawnSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(660, now);
    osc2.frequency.exponentialRampToValueAtTime(1320, now + 0.3);

    gainNode.gain.setValueAtTime(0.04, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.35);
    osc2.stop(now + 0.35);
  } catch {}
}

export function playChargeTick(isSelf: boolean = true) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    const baseFreq = isSelf ? 500 : 300;
    osc.frequency.setValueAtTime(baseFreq + Math.random() * 50, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.08);

    gainNode.gain.setValueAtTime(isSelf ? 0.012 : 0.004, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  } catch {}
}

export function playHarvestSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Play a shiny pentatonic arpeggio/chord!
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25]; // C major chord arpeggio
    
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + index * 0.05);
      
      gainNode.gain.setValueAtTime(0.0, now);
      gainNode.gain.linearRampToValueAtTime(0.04, now + index * 0.05 + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.05 + 0.6);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(now + index * 0.05);
      osc.stop(now + index * 0.05 + 0.65);
    });
  } catch {}
}

export function playUpgradeSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const notes = [440, 554.37, 659.25, 880]; // A major upward arpeggio
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.06);
      
      gainNode.gain.setValueAtTime(0.0, now);
      gainNode.gain.linearRampToValueAtTime(0.03, now + index * 0.06 + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.06 + 0.4);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(now + index * 0.06);
      osc.stop(now + index * 0.06 + 0.45);
    });
  } catch {}
}
