import { YIN } from 'pitchfinder';

// Note names in chromatic order
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Standard tuning: A4 = 440 Hz
const A4_FREQUENCY = 440;
const A4_MIDI_NUMBER = 69;

// RMS threshold for silence filtering (adjust as needed for sensitivity)
const RMS_THRESHOLD = 0.01;

// Number of consecutive detections required for note stability
const STABILITY_THRESHOLD = 3;

/**
 * Configuration for the pitch detector
 */
interface PitchDetectorConfig {
  sampleRate: number;
  bufferSize?: number;
}

/**
 * Result from pitch detection
 */
interface PitchResult {
  frequency: number;
  note: string;
  octave: number;
  noteName: string; // Full note name like "C4", "G#3"
  cents: number; // Deviation from perfect pitch in cents
}

/**
 * Creates a pitch detector using the YIN algorithm.
 * Suitable for monophonic voice detection.
 */
export function createPitchDetector(config: PitchDetectorConfig) {
  const { sampleRate, bufferSize: _bufferSize = 2048 } = config;

  // Initialize YIN detector - good for voice/monophonic signals
  const detectPitch = YIN({ sampleRate, threshold: 0.1 });

  // State for note stability tracking
  let lastDetectedNote: string | null = null;
  let consecutiveCount = 0;
  let lastStableNote: string | null = null;

  /**
   * Calculates the RMS (Root Mean Square) of the audio buffer.
   * Used to filter out silence and noise.
   */
  function calculateRMS(buffer: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  }

  /**
   * Converts a frequency in Hz to a musical note.
   * Uses A4 = 440 Hz as reference.
   */
  function frequencyToNote(frequency: number): PitchResult {
    // Calculate MIDI note number (A4 = 69)
    const midiNumber = 12 * Math.log2(frequency / A4_FREQUENCY) + A4_MIDI_NUMBER;
    const roundedMidi = Math.round(midiNumber);

    // Calculate cents deviation from perfect pitch
    const cents = Math.round((midiNumber - roundedMidi) * 100);

    // Get note name and octave
    const noteIndex = ((roundedMidi % 12) + 12) % 12; // Handle negative modulo
    const octave = Math.floor(roundedMidi / 12) - 1;
    const note = NOTE_NAMES[noteIndex];
    const noteName = `${note}${octave}`;

    return {
      frequency,
      note,
      octave,
      noteName,
      cents,
    };
  }

  /**
   * Processes an audio buffer and returns the detected note if stable.
   * Returns null if:
   * - Buffer is below RMS threshold (silence)
   * - No pitch detected
   * - Note is not yet stable (hasn't appeared consecutively enough times)
   */
  function process(buffer: Float32Array): PitchResult | null {
    // Step 1: Check RMS threshold (silence filtering)
    const rms = calculateRMS(buffer);
    if (rms < RMS_THRESHOLD) {
      // Reset stability tracking on silence
      lastDetectedNote = null;
      consecutiveCount = 0;
      return null;
    }

    // Step 2: Detect pitch
    const frequency = detectPitch(buffer);

    // No pitch detected
    if (frequency === null || frequency === undefined || frequency <= 0) {
      lastDetectedNote = null;
      consecutiveCount = 0;
      return null;
    }

    // Filter out unrealistic frequencies for human voice (roughly 80Hz - 1100Hz)
    if (frequency < 80 || frequency > 1100) {
      return null;
    }

    // Step 3: Convert to note
    const result = frequencyToNote(frequency);

    // Step 4: Note stability check
    if (result.noteName === lastDetectedNote) {
      consecutiveCount++;
    } else {
      lastDetectedNote = result.noteName;
      consecutiveCount = 1;
    }

    // Only return if note is stable and different from last stable note
    if (consecutiveCount >= STABILITY_THRESHOLD) {
      if (result.noteName !== lastStableNote) {
        lastStableNote = result.noteName;
        return result;
      }
    }

    return null;
  }

  /**
   * Resets the detector state.
   * Call this when stopping/starting capture.
   */
  function reset(): void {
    lastDetectedNote = null;
    consecutiveCount = 0;
    lastStableNote = null;
  }

  return {
    process,
    reset,
    calculateRMS,
    frequencyToNote,
  };
}

export type PitchDetector = ReturnType<typeof createPitchDetector>;
