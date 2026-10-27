/**
 * Sonar Acoustic Sound Generator using Web Audio API (AudioContext)
 * 
 * Synthesizes an authentic, subtle submarine sonar acoustic ping
 * when a 'Mine' (metallic target) is detected during live classification.
 */

export interface SonarPingOptions {
  frequency?: number;       // Fundamental carrier frequency (Hz)
  harmonicFreq?: number;    // Secondary metallic overtone frequency (Hz)
  volume?: number;          // Master volume scale (0.0 to 1.0, subtle default 0.18)
  duration?: number;        // Envelope duration in seconds
  echoTail?: boolean;       // Include subtle secondary underwater echo return
}

let audioContextInstance: AudioContext | null = null;

/**
 * Lazily retrieves or instantiates the browser AudioContext.
 * Reuses a single shared AudioContext across user interactions.
 */
export function getSonarAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) {
      console.warn('Web Audio API is not supported in this browser.');
      return null;
    }

    if (!audioContextInstance || audioContextInstance.state === 'closed') {
      audioContextInstance = new AudioCtxClass();
    }

    return audioContextInstance;
  } catch (err) {
    console.warn('Unable to initialize Web Audio AudioContext:', err);
    return null;
  }
}

/**
 * Plays an authentic, polite submarine sonar ping sound using AudioContext.
 * Designed to provide clear acoustic feedback for naval mine detection
 * without being harsh, loud, or jarring.
 */
export async function playSonarMinePing(options: SonarPingOptions = {}): Promise<boolean> {
  const ctx = getSonarAudioContext();
  if (!ctx) return false;

  try {
    // Resume context if suspended by browser autoplay policy
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const now = ctx.currentTime;
    const baseFreq = options.frequency || 1046.5; // C6 note (~1.05 kHz sonar resonance)
    const overtoneFreq = options.harmonicFreq || 2093.0; // C7 harmonic overtone
    const masterVol = Math.max(0.01, Math.min(1.0, options.volume ?? 0.18));
    const duration = options.duration || 0.65;
    const echoTail = options.echoTail ?? true;

    // Master Gain for this ping
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.connect(ctx.destination);

    // Underwater Acoustic Bandpass Filter (Simulates ocean sound channel reverberation)
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(baseFreq, now);
    bandpass.Q.setValueAtTime(3.8, now);
    bandpass.connect(masterGain);

    // Primary Carrier Oscillator (Pure naval sonar sine pulse)
    const primaryOsc = ctx.createOscillator();
    primaryOsc.type = 'sine';
    // Subtle initial frequency drop: 1100 Hz down to 1046 Hz within 35ms (authentic sonar chirp onset)
    primaryOsc.frequency.setValueAtTime(baseFreq * 1.05, now);
    primaryOsc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.035);

    // Primary Gain Envelope (Fast attack, smooth exponential decay)
    const primaryGain = ctx.createGain();
    primaryGain.gain.setValueAtTime(0, now);
    primaryGain.gain.linearRampToValueAtTime(masterVol, now + 0.008); // 8ms crisp attack
    primaryGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    primaryOsc.connect(primaryGain);
    primaryGain.connect(bandpass);

    // Secondary Harmonic Oscillator (High metallic sheen indicative of metallic cylinder body)
    const overtoneOsc = ctx.createOscillator();
    overtoneOsc.type = 'sine';
    overtoneOsc.frequency.setValueAtTime(overtoneFreq, now);

    const overtoneGain = ctx.createGain();
    overtoneGain.gain.setValueAtTime(0, now);
    overtoneGain.gain.linearRampToValueAtTime(masterVol * 0.32, now + 0.006); // Softer metallic ping
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22); // Fast shimmer decay

    overtoneOsc.connect(overtoneGain);
    overtoneGain.connect(bandpass);

    // Start oscillators
    primaryOsc.start(now);
    overtoneOsc.start(now);

    primaryOsc.stop(now + duration + 0.05);
    overtoneOsc.stop(now + 0.25);

    // Optional Secondary Underwater Echo Return (Deep reverberation pulse ~140ms later)
    if (echoTail) {
      const echoTime = now + 0.16;
      const echoOsc = ctx.createOscillator();
      echoOsc.type = 'sine';
      echoOsc.frequency.setValueAtTime(baseFreq * 0.98, echoTime); // Slight doppler/frequency shift in reflection

      const echoGain = ctx.createGain();
      echoGain.gain.setValueAtTime(0, echoTime);
      echoGain.gain.linearRampToValueAtTime(masterVol * 0.22, echoTime + 0.01);
      echoGain.gain.exponentialRampToValueAtTime(0.0001, echoTime + 0.45);

      echoOsc.connect(echoGain);
      echoGain.connect(bandpass);

      echoOsc.start(echoTime);
      echoOsc.stop(echoTime + 0.5);
    }

    // Clean up master node after playback finishes
    setTimeout(() => {
      try {
        masterGain.disconnect();
      } catch {
        // Ignore disconnect errors
      }
    }, (duration + 0.7) * 1000);

    return true;
  } catch (err) {
    console.warn('Playback of sonar mine ping failed:', err);
    return false;
  }
}
