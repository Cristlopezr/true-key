import type { AIAnalysisResponse, LyricLine } from '@/types/aiAnalysis';
import { cn } from '@/lib/utils';
import { HoverableChord } from './HoverableChord';

/**
 * Renders a lyric line with chords positioned above the correct words
 */
function LyricLineWithChords({ line }: { line: LyricLine }) {
  // Find the position of each word in the text and map chords to positions
  const chordPositions: Array<{ chord: string; position: number }> = [];
  
  for (const chordInfo of line.chords) {
    // Find the word in the text (case-insensitive search for robustness)
    const wordIndex = line.text.toLowerCase().indexOf(chordInfo.word.toLowerCase());
    if (wordIndex !== -1) {
      chordPositions.push({ chord: chordInfo.chord, position: wordIndex });
    }
  }
  
  // Sort by position
  chordPositions.sort((a, b) => a.position - b.position);
  
  // Build the chord line with proper spacing
  const chordElements: React.ReactNode[] = [];
  let lastEnd = 0;
  
  chordPositions.forEach((cp, idx) => {
    // Add spaces before this chord
    const spacesNeeded = cp.position - lastEnd;
    if (spacesNeeded > 0) {
      chordElements.push(<span key={`space-${idx}`}>{' '.repeat(spacesNeeded)}</span>);
    }
    // Add the chord
    chordElements.push(<HoverableChord key={`chord-${idx}`} chord={cp.chord} />);
    lastEnd = cp.position + cp.chord.length;
  });
  
  return (
    <div>
      {chordPositions.length > 0 && (
        <div className="text-violet-400 font-bold whitespace-pre">
          {chordElements}
        </div>
      )}
      <div className="text-neutral-200">{line.text}</div>
    </div>
  );
}

interface AIAnalysisResultProps {
  result: AIAnalysisResponse | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Displays AI-powered music analysis results including detected key,
 * chord progression recommendations, and analysis insights.
 */
export function AIAnalysisResult({ result, isLoading, error }: AIAnalysisResultProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-indigo-400"
            >
              <path d="M12 8V4H8" />
              <rect width="16" height="12" x="4" y="8" rx="2" />
              <path d="M2 14h2" />
              <path d="M20 14h2" />
              <path d="M15 13v2" />
              <path d="M9 13v2" />
            </svg>
          </div>
        </div>
        <p className="text-neutral-300 mt-4 font-medium text-lg">Analyzing with AI...</p>
        <p className="text-neutral-500 text-base mt-1">This may take a few seconds</p>
      </div>
    );
  }

  // Error state
  if (error) {
    // Check if it's a rate limit error
    const isRateLimitError = error.toLowerCase().includes('rate limit') || 
                              error.toLowerCase().includes('24 hours')
    
    if (isRateLimitError) {
      return (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-amber-400"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <p className="text-amber-300 font-semibold text-lg">Rate Limit Reached</p>
          <p className="text-amber-200/80 text-base mt-2 max-w-md mx-auto">{error}</p>
          <p className="text-amber-400/60 text-sm mt-4">
            AI analysis is limited to help manage costs. Thank you for understanding!
          </p>
        </div>
      );
    }

    // Generic error
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-red-400"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
        </div>
        <p className="text-red-300 font-medium text-lg">Analysis Failed</p>
        <p className="text-red-400/80 text-base mt-2">{error}</p>
      </div>
    );
  }

  // No result state
  if (!result) {
    return (
      <div className="h-32 flex flex-col items-center justify-center text-center text-neutral-600 p-4 border border-dashed border-white/10 rounded-xl">
        <div className="w-10 h-10 mb-3 rounded-full bg-white/5 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-50"
          >
            <path d="M12 8V4H8" />
            <rect width="16" height="12" x="4" y="8" rx="2" />
            <path d="M2 14h2" />
            <path d="M20 14h2" />
            <path d="M15 13v2" />
            <path d="M9 13v2" />
          </svg>
        </div>
        <p className="font-medium text-neutral-400">No AI Analysis Yet</p>
        <p className="text-sm mt-1 text-neutral-500">
          Click "Analyze with AI" to get recommendations
        </p>
      </div>
    );
  }

  // Result display
  return (
    <div className="flex flex-col gap-5 animate-in slide-in-from-bottom-4 duration-500">
      {/* Top Row: Key + Confidence */}
      <div className="flex items-center justify-between gap-4 p-5 rounded-xl bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border border-emerald-500/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-emerald-400"
            >
              <path d="M12 8V4H8" />
              <rect width="16" height="12" x="4" y="8" rx="2" />
              <path d="M2 14h2" />
              <path d="M20 14h2" />
              <path d="M15 13v2" />
              <path d="M9 13v2" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">AI Detected Key</p>
            <span className="text-3xl font-black text-white tracking-tight">{result.key}</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {result.tempo && (
            <div className="text-right border-r border-white/10 pr-6">
              <span className="text-2xl font-bold text-amber-400">{result.tempo.bpm}</span>
              <span className="text-lg text-amber-400/70 ml-1">BPM</span>
              <p className="text-xs text-amber-400/70 uppercase">{result.tempo.timeSignature}</p>
            </div>
          )}
          {result.confidence > 0 && (
            <div className="text-right">
              <span className="text-3xl font-bold text-emerald-400">{Math.round(result.confidence * 100)}%</span>
              <p className="text-xs text-emerald-400/70 uppercase">Match</p>
            </div>
          )}
        </div>
      </div>

      {/* Analysis - Collapsible */}
      {result.analysis && (
        <details className="group bg-white/5 rounded-xl border border-white/5" open>
          <summary className="p-4 cursor-pointer flex items-center justify-between hover:bg-white/5 rounded-xl transition-colors">
            <span className="text-sm font-bold text-neutral-300 uppercase tracking-widest">Analysis</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-neutral-500 group-open:rotate-180 transition-transform"
            >
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </summary>
          <div className="px-4 pb-4">
            <p className="text-neutral-300 text-base leading-relaxed">{result.analysis}</p>
          </div>
        </details>
      )}

      {/* Chord Progressions - Grid Layout */}
      {result.chordProgressions && result.chordProgressions.length > 0 && (
        <div className="bg-white/5 rounded-xl border border-white/5 p-5">
          <p className="text-sm font-bold text-neutral-300 uppercase tracking-widest mb-4">
            Chord Progressions
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {result.chordProgressions.map((progression, index) => (
              <div
                key={index}
                className={cn(
                  'p-4 rounded-lg border',
                  index === 0
                    ? 'bg-indigo-500/10 border-indigo-500/20 lg:col-span-2'
                    : 'bg-white/5 border-white/10'
                )}
              >
                <div className="flex items-center justify-between mb-3 gap-2">
                  <p className="text-base font-semibold text-white">{progression.name}</p>
                  {index === 0 && (
                    <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded border border-indigo-500/30 whitespace-nowrap flex-shrink-0">
                      Top Pick
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {progression.chords.map((chord, chordIndex) => {
                    // Normalize: AI may return chord as object {chord, beat, measure} or as string
                    const chordName = typeof chord === 'string' ? chord : (chord as any).chord ?? String(chord);
                    return (
                      <div
                        key={chordIndex}
                        className={cn(
                          'px-3 py-1.5 rounded text-sm font-bold border',
                          index === 0
                            ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/30'
                            : 'bg-white/10 text-neutral-200 border-white/10'
                        )}
                      >
                        <HoverableChord chord={chordName} />
                      </div>
                    );
                  })}
                </div>
                {progression.explanation && (
                  <details className="group/exp">
                    <summary className="text-sm text-neutral-400 cursor-pointer hover:text-neutral-300 transition-colors font-medium">
                      Why this progression? <span className="group-open/exp:hidden">▸</span><span className="hidden group-open/exp:inline">▾</span>
                    </summary>
                    <p className="text-sm text-neutral-400 leading-relaxed mt-2">{progression.explanation}</p>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lyrics with Chords */}
      {result.lyrics && result.lyrics.length > 0 && (
        <div className="bg-gradient-to-r from-violet-900/20 to-purple-900/20 rounded-xl border border-violet-500/20 p-5">
          <p className="text-sm font-bold text-violet-300 uppercase tracking-widest mb-4 flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
            Lyrics with Chords
          </p>
          <div className="font-mono text-sm leading-relaxed space-y-3 bg-black/20 rounded-lg p-4">
            {result.lyrics.map((line, lineIndex) => (
              <LyricLineWithChords key={lineIndex} line={line} />
            ))}
          </div>
        </div>
      )}

      {/* Tips - Collapsible */}
      {result.suggestions && result.suggestions.length > 0 && (
        <details className="group bg-amber-500/5 rounded-xl border border-amber-500/10">
          <summary className="p-4 cursor-pointer flex items-center justify-between hover:bg-amber-500/5 rounded-xl transition-colors">
            <span className="text-sm font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                <path d="M9 18h6" />
                <path d="M10 22h4" />
              </svg>
              Tips ({result.suggestions.length})
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-amber-500 group-open:rotate-180 transition-transform"
            >
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </summary>
          <ul className="px-4 pb-4 space-y-2">
            {result.suggestions.map((suggestion, index) => (
              <li key={index} className="text-amber-200/80 text-sm flex items-start gap-2 leading-relaxed">
                <span className="text-amber-400 mt-0.5">•</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
