import { useAudioCapture } from '@/hooks/useAudioCapture';
import { Button } from '@/components/ui/button';
import { NoteDisplay } from '@/components/NoteDisplay';
import { NotesHistory } from '@/components/NotesHistory';
import { KeyResult } from '@/components/KeyResult';
import { AIAnalysisResult } from '@/components/AIAnalysisResult';

/**
 * AudioCapture component provides the main UI for singing key detection.
 * Displays real-time note detection, notes history, and key analysis results.
 */
export function AudioCapture() {
    const {
        isCapturing,
        error,
        currentNote,
        detectedNotes,
        keyResult,
        isAnalyzingAI,
        aiAnalysisResult,
        aiAnalysisError,
        startCapture,
        stopCapture,
        analyzeWithAI,
    } = useAudioCapture();

    // Show AI button when: not capturing, has key result, has detected notes
    const showAIButton = !isCapturing && keyResult !== null && detectedNotes.length > 0;
    
    // Show AI section when there's something to display
    const showAISection = showAIButton || aiAnalysisResult || isAnalyzingAI || aiAnalysisError;

    return (
    <div className='flex flex-col gap-6 w-full max-w-[1600px] mx-auto'>
            {/* Top Controls & Status Bar */}
            <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5 backdrop-blur-sm sticky top-0 z-40">
                <div className="flex items-center gap-4">
                     {!isCapturing ? (
                        <Button onClick={startCapture} size='lg' className='bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-lg shadow-indigo-500/20 min-w-[140px] font-semibold tracking-wide'>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                            START
                        </Button>
                    ) : (
                        <Button onClick={stopCapture} variant='destructive' size='lg' className='min-w-[140px] font-semibold tracking-wide animate-pulse'>
                            <span className="mr-2">■</span> STOP
                        </Button>
                    )}
                    <span className="text-neutral-300 text-sm border-l border-white/10 pl-4 font-medium">
                        {isCapturing ? "Listening..." : "Ready to capture"}
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    {/* AI Button in header when available */}
                    {showAIButton && !isAnalyzingAI && (
                        <Button
                            onClick={analyzeWithAI}
                            size="default"
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-0 shadow-lg shadow-emerald-500/20 font-semibold"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                                <path d="M12 8V4H8" />
                                <rect width="16" height="12" x="4" y="8" rx="2" />
                                <path d="M2 14h2" />
                                <path d="M20 14h2" />
                                <path d="M15 13v2" />
                                <path d="M9 13v2" />
                            </svg>
                            Analyze with AI
                        </Button>
                    )}
                    {isAnalyzingAI && (
                        <div className="flex items-center gap-2 text-emerald-400 text-sm">
                            <div className="w-4 h-4 rounded-full border-2 border-emerald-400/30 border-t-emerald-400 animate-spin" />
                            Analyzing...
                        </div>
                    )}
                    {error && (
                        <div className='bg-red-500/10 text-red-300 px-3 py-1.5 rounded-full text-sm font-medium border border-red-500/20'>
                            {error}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full">
                
                {/* Left: Live Visualizer Area (Major Focus) */}
                <div className="xl:col-span-8 flex flex-col gap-6">
                     <div className="min-h-[400px] bg-black/40 rounded-2xl border border-white/5 p-8 flex items-center justify-center relative overflow-hidden shadow-2xl">
                        {/* Grid Background Effect */}
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
                        
                        <div className="relative z-10 w-full max-w-2xl">
                             <NoteDisplay currentNote={currentNote} isCapturing={isCapturing} />
                        </div>
                     </div>
                     
                     {/* Horizontal History Tape */}
                     <div className="h-48 bg-white/5 rounded-xl border border-white/5 p-4 relative overflow-hidden flex flex-col">
                        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3 flex-none">Detected Sequence</p>
                        <div className="flex-1 min-h-0 w-full">
                           <NotesHistory notes={detectedNotes} />
                        </div>
                     </div>
                </div>

                {/* Right: Key Analysis Result (Compact) */}
                <div className="xl:col-span-4 flex flex-col gap-6">
                    <div className="bg-white/5 rounded-2xl border border-white/5 p-6 shadow-xl">
                        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400"><path d="M12.5 2C10 2 2 12.5 2 12.5S10 23 12.5 23 23 14 23 14 14 2 12.5 2Z"/><path d="M12.5 8a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z"/></svg>
                             Key Analysis
                        </h3>
                        <KeyResult result={keyResult} />
                    </div>
                </div>
            </div>

            {/* Full Width AI Analysis Section */}
            {showAISection && (
                <div className="bg-white/5 rounded-2xl border border-white/5 p-6 shadow-xl">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                            <path d="M12 8V4H8" />
                            <rect width="16" height="12" x="4" y="8" rx="2" />
                            <path d="M2 14h2" />
                            <path d="M20 14h2" />
                            <path d="M15 13v2" />
                            <path d="M9 13v2" />
                        </svg>
                        AI Recommendations
                        <span className="text-sm text-neutral-400 font-normal ml-2">— Chord progressions based on your melody</span>
                    </h3>
                    <AIAnalysisResult
                        result={aiAnalysisResult}
                        isLoading={isAnalyzingAI}
                        error={aiAnalysisError}
                    />
                </div>
            )}
        </div>
    );
}
