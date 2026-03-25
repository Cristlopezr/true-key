/**
 * API service for backend communication
 */

import type { AIAnalysisRequest, AIAnalysisResponse } from '@/types/aiAnalysis';

/**
 * Gets the backend base URL from environment variables
 */
function getBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_BACKEND_BASE_URL;
  if (!baseUrl) {
    throw new Error('VITE_BACKEND_BASE_URL is not defined in environment variables');
  }
  // Remove trailing slash if present
  return baseUrl.replace(/\/$/, '');
}

/**
 * Custom error class for rate limit errors
 */
export class RateLimitError extends Error {
  retryAfterMs: number;
  
  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Sends note data to the backend for AI-powered key detection and chord progression recommendations.
 * Optionally includes audio for lyrics transcription.
 * 
 * @param data - The analysis request containing notes with durations and order
 * @param audio - Optional audio blob for lyrics transcription
 * @returns The AI analysis response with key detection, chord recommendations, and optionally lyrics
 * @throws Error if the request fails or backend returns an error
 * @throws RateLimitError if rate limit is exceeded (429)
 */
export async function analyzeKeyWithAI(
  data: AIAnalysisRequest,
  audio?: Blob
): Promise<AIAnalysisResponse> {
  const baseUrl = getBaseUrl();
  const endpoint = `${baseUrl}/analyze-key`;

  let response: Response;

  if (audio) {
    // Send as FormData when audio is included
    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    formData.append('audio', audio, 'recording.webm');

    response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });
  } else {
    // Send as JSON when no audio (backwards compatible)
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  if (!response.ok) {
    // Try to parse as JSON first for structured error responses
    let errorData: { error?: string; message?: string; retryAfterMs?: number } | null = null;
    
    try {
      errorData = await response.json();
    } catch {
      // Not JSON, will fall back to text
    }

    // Handle rate limit error (429)
    if (response.status === 429 && errorData) {
      console.warn('[TrueKey API] Rate limit exceeded:', errorData.message);
      throw new RateLimitError(
        errorData.message || 'Rate limit exceeded. Please try again later.',
        errorData.retryAfterMs || 24 * 60 * 60 * 1000 // Default to 24 hours
      );
    }

    // Handle other errors
    const errorMessage = errorData?.message || errorData?.error || 'Unknown error';
    console.error('[TrueKey API] Error response:', response.status, errorMessage);
    throw new Error(`AI analysis failed: ${errorMessage}`);
  }

  const result = await response.json();
  return sanitizeResponse(result);
}

/**
 * Sanitizes the AI response on the frontend as a safety net.
 * Ensures no unexpected types reach React components (prevents Error #31).
 */
function sanitizeResponse(raw: Record<string, unknown>): AIAnalysisResponse {
  const key = typeof raw.key === 'string' ? raw.key : 'Unknown';

  let confidence = typeof raw.confidence === 'number' ? raw.confidence : 0;
  if (confidence < 0) confidence = 0;
  if (confidence > 1) confidence = 1;

  const analysis = typeof raw.analysis === 'string' ? raw.analysis : '';

  // Tempo
  let tempo: AIAnalysisResponse['tempo'] = undefined;
  if (raw.tempo && typeof raw.tempo === 'object') {
    const t = raw.tempo as Record<string, unknown>;
    const bpm = typeof t.bpm === 'number' ? t.bpm : 0;
    const timeSignature = typeof t.timeSignature === 'string' ? t.timeSignature : '4/4';
    if (bpm > 0) tempo = { bpm, timeSignature };
  }

  // Chord progressions — normalize chords to plain strings
  const chordProgressions: AIAnalysisResponse['chordProgressions'] = [];
  if (Array.isArray(raw.chordProgressions)) {
    for (const prog of raw.chordProgressions) {
      if (!prog || typeof prog !== 'object') continue;
      const p = prog as Record<string, unknown>;
      const name = typeof p.name === 'string' ? p.name : 'Progression';
      const explanation = typeof p.explanation === 'string' ? p.explanation : '';
      let chords: string[] = [];
      if (Array.isArray(p.chords)) {
        chords = p.chords
          .map((c: unknown) => {
            if (typeof c === 'string') return c;
            if (c && typeof c === 'object' && 'chord' in c) {
              const val = (c as Record<string, unknown>).chord;
              return typeof val === 'string' ? val : null;
            }
            return null;
          })
          .filter((c): c is string => c !== null);
      }
      if (chords.length > 0) chordProgressions.push({ name, chords, explanation });
    }
  }

  // Suggestions — filter to strings only
  let suggestions: string[] | undefined = undefined;
  if (Array.isArray(raw.suggestions)) {
    const filtered = raw.suggestions.filter((s: unknown): s is string => typeof s === 'string');
    if (filtered.length > 0) suggestions = filtered;
  }

  // Lyrics — validate each line has text and proper chord objects
  let lyrics: AIAnalysisResponse['lyrics'] = undefined;
  if (Array.isArray(raw.lyrics) && raw.lyrics.length > 0) {
    const sanitized: NonNullable<AIAnalysisResponse['lyrics']> = [];
    for (const line of raw.lyrics) {
      if (!line || typeof line !== 'object') continue;
      const l = line as Record<string, unknown>;
      const text = typeof l.text === 'string' ? l.text : '';
      if (!text) continue;
      const lineChords: Array<{ chord: string; word: string; beat?: number }> = [];
      if (Array.isArray(l.chords)) {
        for (const c of l.chords) {
          if (!c || typeof c !== 'object') continue;
          const obj = c as Record<string, unknown>;
          const chord = typeof obj.chord === 'string' ? obj.chord : '';
          const word = typeof obj.word === 'string' ? obj.word : '';
          if (chord && word) {
            const entry: { chord: string; word: string; beat?: number } = { chord, word };
            if (typeof obj.beat === 'number') entry.beat = obj.beat;
            lineChords.push(entry);
          }
        }
      }
      sanitized.push({ text, chords: lineChords });
    }
    if (sanitized.length > 0) lyrics = sanitized;
  }

  return {
    key,
    confidence,
    analysis,
    ...(tempo && { tempo }),
    chordProgressions,
    ...(suggestions && { suggestions }),
    ...(lyrics && { lyrics }),
  };
}
