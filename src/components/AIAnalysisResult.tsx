import type { AIAnalysisResponse } from '@/types/aiAnalysis';
import { cn } from '@/lib/utils';

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
        {result.confidence > 0 && (
          <div className="text-right">
            <span className="text-3xl font-bold text-emerald-400">{Math.round(result.confidence * 100)}%</span>
            <p className="text-xs text-emerald-400/70 uppercase">Match</p>
          </div>
        )}
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
                  {progression.chords.map((chord, chordIndex) => (
                    <div
                      key={chordIndex}
                      className={cn(
                        'px-3 py-1.5 rounded text-sm font-bold border',
                        index === 0
                          ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/30'
                          : 'bg-white/10 text-neutral-200 border-white/10'
                      )}
                    >
                      {chord}
                    </div>
                  ))}
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
