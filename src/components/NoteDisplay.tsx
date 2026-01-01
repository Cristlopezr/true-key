import { type PitchResult } from '@/utils/pitchDetection';
import { cn } from '@/lib/utils';

interface NoteDisplayProps {
  currentNote: PitchResult | null;
  isCapturing: boolean;
}

/**
 * Displays the current note being sung in a prominent, animated display.
 */
export function NoteDisplay({ currentNote, isCapturing }: NoteDisplayProps) {
    /**
     * Helper to get color based on pitch tuning
     */
    const getTuningColor = (cents: number) => {
        if (Math.abs(cents) <= 5) return "text-emerald-400";
        if (Math.abs(cents) <= 15) return "text-teal-300";
        return "text-rose-400";
    };

    /**
     * Helper to get position for the tuner needle (-50 to 50 scale)
     */
    const getNeedleRotation = (cents: number) => {
        // Clamp between -50 and 50 visually
        const clamped = Math.max(-50, Math.min(50, cents));
        // Map -50..50 to -45deg..45deg
        return (clamped / 50) * 45;
    };

    if (!isCapturing) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-neutral-400 animate-in fade-in duration-700">
                <div className="w-24 h-24 mb-6 rounded-full border-2 border-white/10 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M2 12h20"/><path d="m19 5 3-3"/><path d="m2 2 3 3"/><path d="m19 19 3 3"/><path d="m2 22 3-3"/></svg>
                </div>
                <p className="text-xl font-medium tracking-tight text-neutral-200">Discover your singing key</p>
                <p className="text-sm text-neutral-400 mt-2">Press Start to begin analyzing</p>
            </div>
        );
    }

    if (!currentNote) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-indigo-400/50 animate-pulse">
                 <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full" />
                    <div className="w-32 h-32 rounded-full border-4 border-indigo-500/20 flex items-center justify-center relative z-10">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6v12"/><path d="M6 12h12"/></svg>
                    </div>
                </div>
                <p className="text-lg font-medium mt-8 tracking-wide">Listening for audio...</p>
            </div>
        );
    }

    const cents = currentNote.cents;
    const tuningColor = getTuningColor(cents);
    const needleRotation = getNeedleRotation(cents);

    return (
        <div className="flex flex-col items-center justify-center w-full max-w-lg mx-auto relative z-10">
            {/* Main Note Display */}
            <div className="relative mb-8">
                 {/* Glow effect behind the note */}
                 <div className={cn("absolute inset-0 blur-3xl rounded-full opacity-20 transition-colors duration-200", 
                    Math.abs(cents) <= 10 ? "bg-emerald-500" : "bg-indigo-500"
                 )} />
                 
                 <div className="flex items-baseline justify-center relative z-10">
                    <span className={cn("text-[120px] font-black tracking-tighter leading-none transition-colors duration-100", tuningColor)}>
                        {currentNote.note}
                    </span>
                    <span className="text-4xl font-light text-neutral-500 ml-2">
                        {currentNote.octave}
                    </span>
                </div>
            </div>

            {/* Tuner Gauge */}
            <div className="w-full relative h-16 mb-6">
                 {/* Scale ticks */}
                 <div className="absolute top-1/2 left-0 right-0 h-px bg-white/10" />
                 <div className="absolute top-1/2 left-1/2 w-0.5 h-4 bg-white/20 -translate-x-1/2 -translate-y-1/2" /> {/* Center */}
                 <div className="absolute top-1/2 left-1/4 w-px h-2 bg-white/10 -translate-y-1/2" />
                 <div className="absolute top-1/2 left-3/4 w-px h-2 bg-white/10 -translate-y-1/2" />
                 
                 {/* Needle */}
                 <div 
                    className="absolute top-0 left-1/2 w-1 h-full origin-bottom transition-transform duration-100 ease-out"
                    style={{ 
                        transform: `translateX(-50%) rotate(${needleRotation}deg)`,
                    }}
                 >
                     <div className={cn("w-full h-1/2 rounded-full shadow-[0_0_15px_currentColor]", tuningColor, Math.abs(cents) <= 5 ? "bg-emerald-400" : "bg-indigo-500")} />
                 </div>
            </div>

            {/* Hz & Cents */}
            <div className="flex items-center gap-8">
                <div className="flex flex-col items-center">
                    <span className="text-xs uppercase tracking-widest text-neutral-500 font-semibold mb-1">Frequency</span>
                    <span className="text-2xl font-mono text-neutral-300">
                        {currentNote.frequency.toFixed(1)} <span className="text-neutral-600 text-sm">Hz</span>
                    </span>
                </div>
                
                <div className="w-px h-8 bg-white/10" />

                <div className="flex flex-col items-center">
                     <span className="text-xs uppercase tracking-widest text-neutral-500 font-semibold mb-1">Detune</span>
                     <div className={cn("text-2xl font-mono flex items-center", tuningColor)}>
                        {cents > 0 ? "+" : ""}{cents} <span className="text-sm ml-1 opacity-60">¢</span>
                     </div>
                </div>
            </div>
        </div>
    );
}
