/**
 * Types for AI-powered music analysis
 */

/**
 * A single note with all the information the AI needs for analysis
 */
export interface NoteData {
  /** Note name with octave (e.g., "C4", "E5") */
  noteName: string;
  /** Just the note without octave (e.g., "C", "E") */
  note: string;
  /** Octave number (e.g., 4, 5) */
  octave: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Position in sequence (0-indexed) */
  order: number;
}

/**
 * Request payload for the AI analysis endpoint
 */
export interface AIAnalysisRequest {
  /** Array of notes with all metadata, in order of detection */
  notes: NoteData[];
  /** Total duration of the recording in milliseconds */
  totalDurationMs: number;
  /** Number of unique notes detected */
  uniqueNotesCount: number;
}

/**
 * A chord progression recommendation from the AI
 */
export interface ChordProgression {
  /** Name of the progression (e.g., "Verse Progression") */
  name: string;
  /** Array of chord names (e.g., ["Am", "F", "C", "G"]) */
  chords: string[];
  /** Explanation of why this progression fits the melody */
  explanation: string;
}

/**
 * Response from the AI analysis endpoint
 */
export interface AIAnalysisResponse {
  /** Detected musical key (e.g., "A minor", "C major") */
  key: string;
  /** Confidence level (0-1) */
  confidence: number;
  /** Recommended chord progressions based on the melody */
  chordProgressions: ChordProgression[];
  /** General analysis/explanation from the AI */
  analysis: string;
  /** Any additional suggestions or tips */
  suggestions?: string[];
}
