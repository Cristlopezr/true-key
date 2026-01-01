import { type KeyAnalysisResult } from '@/utils/keyDetection';
import { cn } from '@/lib/utils';

interface KeyResultProps {
  result: KeyAnalysisResult | null;
}

function formatMode(mode: string): string {
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

export function KeyResult({ result }: KeyResultProps) {
  if (!result) {
    return (
        <div className="h-64 flex flex-col items-center justify-center text-center text-neutral-600 p-8 border border-dashed border-white/10 rounded-xl">
            <div className="w-12 h-12 mb-4 rounded-full bg-white/5 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            </div>
            <p className="font-medium text-neutral-400">No Analysis Yet</p>
            <p className="text-xs mt-2 max-w-[200px] text-neutral-400">Sing to generate a key analysis.</p>
        </div>
    );
  }

  const { primary, alternative, isAmbiguous } = result;
  const confidencePercent = Math.round(primary.confidence * 100);

  return (
    <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-500">
      {/* Primary Key - Hero Section */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/20 p-6">
         <div className="flex justify-between items-start mb-2">
            <div>
                 <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Primary Match</p>
                 <div className="flex items-baseline gap-3">
                    <span className="text-5xl font-black text-white tracking-tighter shadow-indigo-500/50 drop-shadow-sm">
                        {primary.key}
                    </span>
                    <span className="text-xl font-medium text-indigo-200 opacity-80">
                        {formatMode(primary.mode)}
                    </span>
                 </div>
            </div>
            <div className="text-right">
                <div className="inline-flex items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1">
                    <span className="text-sm font-bold text-emerald-400">{confidencePercent}% Match</span>
                </div>
            </div>
         </div>
         
         <div className="mt-6">
             <p className="text-xs text-neutral-400 mb-3 font-medium">SCALE INTEL</p>
             <div className="flex flex-wrap gap-2">
                {primary.scaleNotes.map((note, index) => (
                    <div key={note} className={cn(
                        "w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold border",
                        index === 0 ? "bg-indigo-500 text-white border-indigo-400" : "bg-white/5 text-neutral-300 border-white/10"
                    )}>
                        {note}
                    </div>
                ))}
            </div>
         </div>
      </div>

      {/* Alternative Key */}
      {alternative && (
        <div className="bg-white/5 rounded-xl border border-white/5 p-5">
           <div className="flex items-center gap-2 mb-3">
             <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest flex-1">
                {isAmbiguous ? 'Could also be' : 'Relative Key'}
             </p>
             {isAmbiguous && (
                <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">Ambiguous</span>
             )}
           </div>
           
           <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white opacity-90">{alternative.key}</span>
                    <span className="text-sm text-neutral-400">{formatMode(alternative.mode)}</span>
                </div>
                <span className="text-xs text-neutral-500 font-mono">
                  {Math.round(alternative.confidence * 100)}% Prob.
                </span>
           </div>
        </div>
      )}
    </div>
  );
}
