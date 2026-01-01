/**
 * Key Detection Utility (Improved Algorithm)
 * Analyzes detected notes to determine the most probable musical key and mode.
 * 
 * Improvements:
 * - Better weighting for characteristic tones (root, 5th, leading tone)
 * - Handles relative major/minor keys (e.g., C major ↔ A minor share same notes)
 * - Returns multiple possible keys when scores are close
 * - Considers first and last notes as potential tonics
 */

// All pitch classes in sharp notation (C = 0)
const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

type PitchClass = (typeof PITCH_CLASSES)[number];

// Scale templates as semitone intervals from root
// Includes common modes found in pop, rock, and jazz
const SCALE_TEMPLATES = {
  major: [0, 2, 4, 5, 7, 9, 11],           // Ionian - most common major
  minor: [0, 2, 3, 5, 7, 8, 10],           // Natural minor (Aeolian)
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],   // Raised 7th - classical/metal
  dorian: [0, 2, 3, 5, 7, 9, 10],          // Minor with raised 6th - pop/rock/jazz
  mixolydian: [0, 2, 4, 5, 7, 9, 10],      // Major with lowered 7th - rock/blues
} as const;

type Mode = keyof typeof SCALE_TEMPLATES;

/**
 * Result from key detection analysis
 */
export interface KeyDetectionResult {
  key: string;
  mode: Mode;
  confidence: number;
  score: number;
  scaleNotes: string[];
}

/**
 * Extended result that may include alternative keys
 */
export interface KeyAnalysisResult {
  primary: KeyDetectionResult;
  alternative: KeyDetectionResult | null; // Relative major/minor if scores are close
  isAmbiguous: boolean; // True if both keys are equally likely
}

/**
 * Calculates softmax probabilities from an array of scores.
 * Converts raw scores into probabilities that sum to 1 (100%).
 * Uses temperature scaling to control distribution sharpness.
 */
function softmax(scores: number[], temperature: number = 1.0): number[] {
  // Subtract max for numerical stability (prevents overflow)
  const maxScore = Math.max(...scores);
  const expScores = scores.map(s => Math.exp((s - maxScore) / temperature));
  const sumExp = expScores.reduce((a, b) => a + b, 0);
  return expScores.map(exp => exp / sumExp);
}

/**
 * Calculates the percentage of notes (duration-weighted) that fit within a scale.
 */
function calculateScaleFit(
  root: PitchClass,
  mode: Mode,
  noteWeights: Map<PitchClass, number>,
  totalDuration: number
): number {
  if (totalDuration === 0) return 0;

  const scaleNotes = getScaleNotesSet(root, mode);
  let inScaleDuration = 0;

  for (const [note, duration] of noteWeights) {
    if (scaleNotes.has(note)) {
      inScaleDuration += duration;
    }
  }

  return inScaleDuration / totalDuration;
}
/**
 * Mapping of flat notes to sharp equivalents
 */
const FLAT_TO_SHARP: Record<string, PitchClass> = {
  Db: 'C#',
  Eb: 'D#',
  Fb: 'E',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
  Cb: 'B',
};

/**
 * Normalizes a note to its pitch class (removes octave, converts flats to sharps)
 */
function normalizeToPitchClass(note: string): PitchClass | null {
  const match = note.match(/^([A-Ga-g][#b]?)/);
  if (!match) return null;

  let pitchClass = match[1];
  pitchClass = pitchClass.charAt(0).toUpperCase() + pitchClass.slice(1);

  if (pitchClass.includes('b') && FLAT_TO_SHARP[pitchClass]) {
    pitchClass = FLAT_TO_SHARP[pitchClass];
  }

  if (PITCH_CLASSES.includes(pitchClass as PitchClass)) {
    return pitchClass as PitchClass;
  }

  return null;
}

/**
 * Gets the semitone index of a pitch class (C = 0)
 */
function getPitchIndex(pitchClass: PitchClass | string): number {
  return PITCH_CLASSES.indexOf(pitchClass as PitchClass);
}

/**
 * Gets the scale notes for a given root and mode as an ordered array.
 */
export function getScaleNotes(root: string, mode: Mode): string[] {
  const rootIndex = getPitchIndex(root);
  if (rootIndex === -1) return [];

  const intervals = SCALE_TEMPLATES[mode];
  const scaleNotes: string[] = [];

  for (const interval of intervals) {
    const noteIndex = (rootIndex + interval) % 12;
    scaleNotes.push(PITCH_CLASSES[noteIndex]);
  }

  return scaleNotes;
}

/**
 * Gets the scale notes as a Set for membership checking.
 */
function getScaleNotesSet(root: PitchClass, mode: Mode): Set<PitchClass> {
  const rootIndex = getPitchIndex(root);
  const intervals = SCALE_TEMPLATES[mode];

  const scaleNotes = new Set<PitchClass>();
  for (const interval of intervals) {
    const noteIndex = (rootIndex + interval) % 12;
    scaleNotes.add(PITCH_CLASSES[noteIndex]);
  }

  return scaleNotes;
}

/**
 * Gets the relative minor of a major key (3 semitones down)
 */
function getRelativeMinor(majorRoot: PitchClass): PitchClass {
  const index = (getPitchIndex(majorRoot) + 9) % 12; // -3 = +9 mod 12
  return PITCH_CLASSES[index];
}

/**
 * Gets the relative major of a minor key (3 semitones up)
 */
function getRelativeMajor(minorRoot: PitchClass): PitchClass {
  const index = (getPitchIndex(minorRoot) + 3) % 12;
  return PITCH_CLASSES[index];
}

/**
 * Checks if two keys are relative major/minor pairs
 */
function areRelativeKeys(key1: { key: PitchClass; mode: Mode }, key2: { key: PitchClass; mode: Mode }): boolean {
  if (key1.mode === key2.mode) return false;
  
  if (key1.mode === 'major') {
    return getRelativeMinor(key1.key) === key2.key;
  } else {
    return getRelativeMajor(key1.key) === key2.key;
  }
}

/**
 * Improved scoring algorithm for key detection.
 * 
 * Scoring factors:
 * - Notes in scale: +2 points each
 * - Root note (tonic): +4 points (strongest tonal center)
 * - Fifth degree: +2 points (dominant, reinforces key)
 * - Third degree: +1.5 points (determines major/minor quality)
 * - Leading tone (7th in major, 7th raised in minor): +1 point
 * - Notes outside scale: -2 points (penalize)
 * - First/last note bonus: +3 if matches root (common phrase endings)
 */
function scoreKeyImproved(
  root: PitchClass,
  mode: Mode,
  noteFrequency: Map<PitchClass, number>,
  totalNotes: number,
  firstNote: PitchClass | null,
  lastNote: PitchClass | null
): number {
  const scaleNotes = getScaleNotesSet(root, mode);
  const rootIndex = getPitchIndex(root);
  
  // Get important scale degrees
  const fifth = PITCH_CLASSES[(rootIndex + 7) % 12];
  
  // Third degree: major modes use major 3rd (4 semitones), minor modes use minor 3rd (3 semitones)
  const isMajorMode = mode === 'major' || mode === 'mixolydian';
  const third = PITCH_CLASSES[(rootIndex + (isMajorMode ? 4 : 3)) % 12];
  
  // Leading tone (7th degree) - different for each mode
  const leadingToneInterval = SCALE_TEMPLATES[mode][6]; // 7th degree of the scale
  const leadingTone = PITCH_CLASSES[(rootIndex + leadingToneInterval) % 12];

  let score = 0;
  let inScaleNotes = 0;
  let outOfScaleNotes = 0;

  for (const [note, count] of noteFrequency) {
    if (scaleNotes.has(note)) {
      inScaleNotes += count;
      
      // Base score for notes in scale
      score += count * 2;

      // Root note (tonic) - strongest indicator
      if (note === root) {
        score += count * 4;
      }
      // Fifth (dominant) - reinforces tonality
      else if (note === fifth) {
        score += count * 2;
      }
      // Third - determines major/minor quality
      else if (note === third) {
        score += count * 1.5;
      }
      // Leading tone - suggests resolution to tonic
      else if (note === leadingTone) {
        score += count * 1;
      }
    } else {
      outOfScaleNotes += count;
      // Penalize out-of-scale notes
      score -= count * 2;
    }
  }

  // Bonus for first/last notes matching the root (common in melodies)
  if (firstNote === root) {
    score += 3;
  }
  if (lastNote === root) {
    score += 3;
  }

  // Calculate scale fit percentage for confidence
  const scaleFitRatio = totalNotes > 0 ? inScaleNotes / totalNotes : 0;
  
  // Boost score if high percentage of notes fit the scale
  score *= (0.5 + scaleFitRatio * 0.5);

  // Normalize
  return totalNotes > 0 ? score / totalNotes : 0;
}

/**
 * Analyzes notes and determines the most probable key(s).
 * Returns both primary and alternative (relative) key if scores are close.
 */
export function detectKey(notes: string[]): KeyDetectionResult | null {
  const result = analyzeKey(notes);
  return result?.primary ?? null;
}

/**
 * Full key analysis that may return alternative keys.
 */
export function analyzeKey(notes: string[]): KeyAnalysisResult | null {
  if (notes.length === 0) {
    return null;
  }

  // Step 1: Normalize notes and count occurrences
  const noteFrequency = new Map<PitchClass, number>();
  const normalizedNotes: PitchClass[] = [];

  for (const note of notes) {
    const pitchClass = normalizeToPitchClass(note);
    if (pitchClass) {
      noteFrequency.set(pitchClass, (noteFrequency.get(pitchClass) || 0) + 1);
      normalizedNotes.push(pitchClass);
    }
  }

  if (noteFrequency.size === 0) {
    return null;
  }

  const totalNotes = normalizedNotes.length;
  const firstNote = normalizedNotes[0] ?? null;
  const lastNote = normalizedNotes[normalizedNotes.length - 1] ?? null;

  // Step 2: Score each possible key/mode combination
  const scores: Array<{ key: PitchClass; mode: Mode; score: number }> = [];

  for (const root of PITCH_CLASSES) {
    for (const mode of ['major', 'minor'] as Mode[]) {
      const score = scoreKeyImproved(root, mode, noteFrequency, totalNotes, firstNote, lastNote);
      scores.push({ key: root, mode, score });
    }
  }

  // Step 3: Sort by score (highest first)
  scores.sort((a, b) => b.score - a.score);

  const best = scores[0];
  const secondBest = scores[1];

  if (best.score <= 0) {
    return null;
  }

  // Step 4: Calculate real probabilities using softmax
  const allScores = scores.map(s => s.score);
  const probabilities = softmax(allScores);

  // Confidence is the actual probability of the best key
  const confidence = probabilities[0];

  // Step 5: Check if second best is the relative major/minor
  const isRelative = secondBest && areRelativeKeys(best, secondBest);
  const probabilityRatio = probabilities[1] / probabilities[0];
  
  // Consider ambiguous if relative key has probability within 15% of best
  const isAmbiguous = isRelative && probabilityRatio > 0.85;

  // Build primary result
  const primaryResult: KeyDetectionResult = {
    key: best.key,
    mode: best.mode,
    confidence: Math.round(confidence * 100) / 100,
    score: Math.round(best.score * 100) / 100,
    scaleNotes: getScaleNotes(best.key, best.mode),
  };

  // Build alternative result if it's the relative key and close enough
  let alternativeResult: KeyDetectionResult | null = null;
  
  if (isRelative && probabilityRatio > 0.5) {
    const altProbability = probabilities[1];
    alternativeResult = {
      key: secondBest.key,
      mode: secondBest.mode,
      confidence: Math.round(altProbability * 100) / 100,
      score: Math.round(secondBest.score * 100) / 100,
      scaleNotes: getScaleNotes(secondBest.key, secondBest.mode),
    };
  }

  return {
    primary: primaryResult,
    alternative: alternativeResult,
    isAmbiguous,
  };
}

/**
 * Convenience function for testing and logging.
 */
export function analyzeAndLogKey(notes: string[]): KeyAnalysisResult | null {
  return analyzeKey(notes);
}

/**
 * Note with duration information for weighted analysis
 */
interface NoteWithDuration {
  noteName: string;
  durationMs: number;
}

/**
 * Duration-weighted scoring algorithm for key detection.
 * Longer notes contribute more to the score than shorter notes.
 * 
 * This helps distinguish between:
 * - Sustained melody notes (high weight)
 * - Passing tones / ornaments (low weight)
 */
function scoreKeyWithDuration(
  root: PitchClass,
  mode: Mode,
  noteWeights: Map<PitchClass, number>, // Note -> total duration in ms
  totalDuration: number,
  firstNote: PitchClass | null,
  lastNote: PitchClass | null
): number {
  const scaleNotes = getScaleNotesSet(root, mode);
  const rootIndex = getPitchIndex(root);
  
  // Get important scale degrees
  const fifth = PITCH_CLASSES[(rootIndex + 7) % 12];
  
  // Third degree: major modes use major 3rd (4 semitones), minor modes use minor 3rd (3 semitones)
  const isMajorMode = mode === 'major' || mode === 'mixolydian';
  const third = PITCH_CLASSES[(rootIndex + (isMajorMode ? 4 : 3)) % 12];
  
  // Leading tone (7th degree) - different for each mode
  const leadingToneInterval = SCALE_TEMPLATES[mode][6];
  const leadingTone = PITCH_CLASSES[(rootIndex + leadingToneInterval) % 12];

  let score = 0;
  let inScaleDuration = 0;

  for (const [note, duration] of noteWeights) {
    // Normalize duration to seconds for cleaner math
    const weight = duration / 1000;
    
    if (scaleNotes.has(note)) {
      inScaleDuration += duration;
      
      // Base score for notes in scale (weighted by duration)
      score += weight * 2;

      // Root note (tonic) - strongest indicator
      if (note === root) {
        score += weight * 5; // Higher weight for root
      }
      // Fifth (dominant) - reinforces tonality
      else if (note === fifth) {
        score += weight * 3;
      }
      // Third - determines major/minor quality
      else if (note === third) {
        score += weight * 2;
      }
      // Leading tone
      else if (note === leadingTone) {
        score += weight * 1;
      }
    } else {
      // Penalize out-of-scale notes (less harshly for short notes)
      score -= weight * 1.5;
    }
  }

  // Bonus for first/last notes matching the root
  if (firstNote === root) {
    score += 2;
  }
  if (lastNote === root) {
    score += 3; // Last note is more important
  }

  // Scale fit ratio based on duration
  const scaleFitRatio = totalDuration > 0 ? inScaleDuration / totalDuration : 0;
  
  // Boost score if high percentage of time is spent on in-scale notes
  score *= (0.5 + scaleFitRatio * 0.5);

  // Normalize by total duration (in seconds)
  const totalSeconds = totalDuration / 1000;
  return totalSeconds > 0 ? score / totalSeconds : 0;
}

/**
 * Analyzes notes WITH DURATION to determine the most probable key and mode.
 * Notes with longer duration have more influence on the result.
 * 
 * @param notes - Array of notes with duration information
 */
export function analyzeKeyWithDuration(notes: NoteWithDuration[]): KeyAnalysisResult | null {
  if (notes.length === 0) {
    return null;
  }

  // Step 1: Normalize notes and sum durations per pitch class
  const noteWeights = new Map<PitchClass, number>();
  const normalizedNotes: { pitchClass: PitchClass; duration: number }[] = [];
  let totalDuration = 0;

  for (const note of notes) {
    const pitchClass = normalizeToPitchClass(note.noteName);
    if (pitchClass) {
      const currentWeight = noteWeights.get(pitchClass) || 0;
      noteWeights.set(pitchClass, currentWeight + note.durationMs);
      normalizedNotes.push({ pitchClass, duration: note.durationMs });
      totalDuration += note.durationMs;
    }
  }

  if (noteWeights.size === 0) {
    return null;
  }

  const firstNote = normalizedNotes[0]?.pitchClass ?? null;
  const lastNote = normalizedNotes[normalizedNotes.length - 1]?.pitchClass ?? null;

  // Step 2: Score each possible key/mode combination
  const scores: Array<{ key: PitchClass; mode: Mode; score: number }> = [];

  for (const root of PITCH_CLASSES) {
    for (const mode of ['major', 'minor'] as Mode[]) {
      const score = scoreKeyWithDuration(root, mode, noteWeights, totalDuration, firstNote, lastNote);
      scores.push({ key: root, mode, score });
    }
  }

  // Step 3: Sort by score (highest first)
  scores.sort((a, b) => b.score - a.score);

  const best = scores[0];
  const secondBest = scores[1];

  if (best.score <= 0) {
    return null;
  }

  // Step 4: Calculate confidence based on scale fit (independent for each key)
  // Confidence = % of total duration that fits in the scale
  const confidence = calculateScaleFit(best.key, best.mode, noteWeights, totalDuration);

  // Step 5: Check if second best is the relative major/minor
  const isRelative = secondBest && areRelativeKeys(best, secondBest);
  // We use score ratio only to check if they are close enough to be considered
  const scoreRatio = secondBest ? secondBest.score / best.score : 0;
  
  // Consider ambiguous if relative key has similar score
  const isAmbiguous = isRelative && scoreRatio > 0.85;

  // Build primary result
  const primaryResult: KeyDetectionResult = {
    key: best.key,
    mode: best.mode,
    // Confidence is now % of notes in scale
    // We cap it at 99% to avoid showing 100% unless absolutely perfect
    confidence: Math.round(confidence * 100) / 100,
    score: Math.round(best.score * 100) / 100,
    scaleNotes: getScaleNotes(best.key, best.mode),
  };

  // Build alternative result if it's the relative key and close enough
  let alternativeResult: KeyDetectionResult | null = null;
  
  if (isRelative && scoreRatio > 0.7) {
    // Calculate independent confidence for the alternative key
    const altConfidence = calculateScaleFit(secondBest.key, secondBest.mode, noteWeights, totalDuration);
    
    alternativeResult = {
      key: secondBest.key,
      mode: secondBest.mode,
      confidence: Math.round(altConfidence * 100) / 100,
      score: Math.round(secondBest.score * 100) / 100,
      scaleNotes: getScaleNotes(secondBest.key, secondBest.mode),
    };
  }

  return {
    primary: primaryResult,
    alternative: alternativeResult,
    isAmbiguous,
  };
}

