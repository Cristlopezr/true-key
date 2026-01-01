import { useAudioCapture } from '@/hooks/useAudioCapture';
import { Button } from '@/components/ui/button';
import { NoteDisplay } from '@/components/NoteDisplay';
import { NotesHistory } from '@/components/NotesHistory';
import { KeyResult } from '@/components/KeyResult';

/**
 * AudioCapture component provides the main UI for singing key detection.
 * Displays real-time note detection, notes history, and key analysis results.
 */
export function AudioCapture() {
    const { isCapturing, error, currentNote, detectedNotes, keyResult, startCapture, stopCapture } = useAudioCapture();

    return (
        <div className='flex flex-col items-center gap-5 w-full'>
            {/* Current Note Display */}
            <NoteDisplay currentNote={currentNote} isCapturing={isCapturing} />

            {/* Control Buttons */}
            <div className='flex gap-4'>
                {!isCapturing ? (
                    <Button onClick={startCapture} variant='default' size='lg' className='min-w-[180px]'>
                        Start
                    </Button>
                ) : (
                    <Button onClick={stopCapture} variant='destructive' size='lg' className='min-w-[180px]'>
                        Stop
                    </Button>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <div className='w-full p-3 bg-red-50 border border-red-200 rounded-lg text-center dark:bg-red-950 dark:border-red-800'>
                    <p className='text-red-600 dark:text-red-400 text-sm'>⚠️ {error}</p>
                </div>
            )}

            {/* Results Section - Key and Notes side by side */}
            {(keyResult || detectedNotes.length > 0) && (
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4 w-full'>
                    {/* Key Detection Results (shown after stopping) */}
                    <KeyResult result={keyResult} />

                    {/* Notes History (shown during/after capture) */}
                    <NotesHistory notes={detectedNotes} />
                </div>
            )}
        </div>
    );
}
