import { YIN } from 'pitchfinder';

// Note names in chromatic order
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Standard tuning: A4 = 440 Hz
const A4_FREQUENCY = 440;
const A4_MIDI_NUMBER = 69;

// RMS threshold for silence filtering (higher = less sensitive to noise)
const RMS_THRESHOLD = 0.02;

// Number of consecutive detections required for note stability
const STABILITY_THRESHOLD = 3;

// Minimum duration in ms for a note to be considered valid (filters very short notes)
const MIN_NOTE_DURATION_MS = 80;

/**
 * Configuration for the pitch detector
 */
interface PitchDetectorConfig {
  sampleRate: number;
  bufferSize?: number;
}

/**
 * Result from pitch detection (without duration - for real-time)
 */
export interface PitchResult {
  frequency: number;
  note: string;
  octave: number;
  noteName: string; // Full note name like "C4", "G#3"
  cents: number; // Deviation from perfect pitch in cents
}

/**
 * A detected note with duration information
 */
export interface DetectedNote {
  noteName: string;
  note: string;
  octave: number;
  frequency: number;
  cents: number;
  durationMs: number; // Duration in milliseconds
  startTime: number; // performance.now() when note started
  endTime: number; // performance.now() when note ended
}

/**
 * Callback triggered when a note ends and its duration is known
 */
type OnNoteCompleteCallback = (note: DetectedNote) => void;

/**
 * Creates a pitch detector using the YIN algorithm.
 * Suitable for monophonic voice detection.
 * Now includes duration tracking for each detected note.
 */
export function createPitchDetector(config: PitchDetectorConfig) {
  const { sampleRate, bufferSize: _bufferSize = 2048 } = config;

  // Initialize YIN detector - good for voice/monophonic signals
  // Threshold 0.15 reduces octave errors for voice detection
  const detectPitch = YIN({ sampleRate, threshold: 0.15 });

  // State for note stability tracking
  let lastDetectedNote: string | null = null;
  let consecutiveCount = 0;
  let lastStableNote: string | null = null;

  // State for duration tracking
  let currentNoteStartTime: number | null = null;
  let currentNoteData: PitchResult | null = null;

  // Callback for when a note completes
  let onNoteComplete: OnNoteCompleteCallback | null = null;

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
   * Finalizes the current note and triggers the callback with duration info.
   */
  function finalizeCurrentNote(): void {
    if (currentNoteData && currentNoteStartTime !== null && onNoteComplete) {
      const endTime = performance.now();
      const durationMs = endTime - currentNoteStartTime;

      // Only report notes that meet minimum duration threshold
      if (durationMs >= MIN_NOTE_DURATION_MS) {
        const completedNote: DetectedNote = {
          noteName: currentNoteData.noteName,
          note: currentNoteData.note,
          octave: currentNoteData.octave,
          frequency: currentNoteData.frequency,
          cents: currentNoteData.cents,
          durationMs: Math.round(durationMs),
          startTime: currentNoteStartTime,
          endTime,
        };

        onNoteComplete(completedNote);
      }
    }

    // Reset current note tracking
    currentNoteStartTime = null;
    currentNoteData = null;
  }

  /**
   * Processes an audio buffer and returns the detected note if stable.
   * Also tracks note duration and triggers onNoteComplete callback when a note ends.
   * 
   * Returns the newly detected stable note (null if same note continues or no valid note)
   */
  function process(buffer: Float32Array): PitchResult | null {
    // Step 1: Check RMS threshold (silence filtering)
    const rms = calculateRMS(buffer);
    if (rms < RMS_THRESHOLD) {
      // Silence detected - finalize any current note
      if (currentNoteData) {
        finalizeCurrentNote();
      }

      // Reset stability tracking on silence
      lastDetectedNote = null;
      consecutiveCount = 0;
      return null;
    }

    // Step 2: Detect pitch
    const frequency = detectPitch(buffer);

    // No pitch detected
    if (frequency === null || frequency === undefined || frequency <= 0) {
      // Finalize current note if exists
      if (currentNoteData) {
        finalizeCurrentNote();
      }

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

    // Only act when note becomes stable
    if (consecutiveCount >= STABILITY_THRESHOLD) {
      // Check if this is a NEW stable note (different from last stable note)
      if (result.noteName !== lastStableNote) {
        // Finalize previous note first (if any)
        if (currentNoteData) {
          finalizeCurrentNote();
        }

        // Start tracking the new note
        lastStableNote = result.noteName;
        currentNoteStartTime = performance.now();
        currentNoteData = result;

        return result; // Return the newly detected note
      }
      // Same stable note continues - update data (for averaging frequency/cents)
      // but don't return (already reported this note)
    }

    return null;
  }

  /**
   * Sets the callback for when a note completes (with duration).
   */
  function setOnNoteComplete(callback: OnNoteCompleteCallback | null): void {
    onNoteComplete = callback;
  }

  /**
   * Forces finalization of the current note.
   * Call this when stopping capture to get the last note's duration.
   */
  function flush(): void {
    if (currentNoteData) {
      finalizeCurrentNote();
    }
  }

  /**
   * Resets the detector state.
   * Call this when stopping/starting capture.
   */
  function reset(): void {
    // Finalize any ongoing note before resetting
    flush();

    lastDetectedNote = null;
    consecutiveCount = 0;
    lastStableNote = null;
    currentNoteStartTime = null;
    currentNoteData = null;
  }

  return {
    process,
    reset,
    flush,
    setOnNoteComplete,
    calculateRMS,
    frequencyToNote,
  };
}

export type PitchDetector = ReturnType<typeof createPitchDetector>;
