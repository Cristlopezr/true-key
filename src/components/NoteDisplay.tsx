import { type PitchResult } from '@/utils/pitchDetection';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface NoteDisplayProps {
  currentNote: PitchResult | null;
  isCapturing: boolean;
}

/**
 * Displays the current note being sung in a prominent, animated display.
 */
export function NoteDisplay({ currentNote, isCapturing }: NoteDisplayProps) {
  if (!isCapturing) {
    return (
      <Card className="w-full max-w-sm border-2 border-dashed border-border bg-muted text-center">
        <CardContent className="flex flex-col items-center justify-center py-8 min-h-[140px]">
          <div className="text-5xl mb-3 opacity-60">🎤</div>
          <p className="text-sm text-muted-foreground">Press Start to begin</p>
        </CardContent>
      </Card>
    );
  }

  if (!currentNote) {
    return (
      <Card className="w-full max-w-sm border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 dark:border-indigo-700 text-center animate-pulse">
        <CardContent className="flex flex-col items-center justify-center py-8 min-h-[140px]">
          <div className="w-14 h-14 rounded-full bg-indigo-400 dark:bg-indigo-600 animate-ping mb-4" />
          <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-300 mb-1">Listening...</p>
          <p className="text-sm text-muted-foreground">Sing or hum a note</p>
        </CardContent>
      </Card>
    );
  }

  // Determine if the pitch is sharp, flat, or in tune
  const isInTune = Math.abs(currentNote.cents) <= 10;
  const isSharp = currentNote.cents > 10;
  const isFlat = currentNote.cents < -10;

  const centsSign = currentNote.cents >= 0 ? '+' : '';
  const centsDisplay = `${centsSign}${currentNote.cents}¢`;

  return (
    <Card className={cn(
      "w-full max-w-sm border-2 text-center transition-all",
      isInTune && "border-green-400 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950",
      isSharp && "border-orange-400 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950",
      isFlat && "border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950"
    )}>
      <CardContent className="flex flex-col items-center justify-center py-6 min-h-[140px]">
        <div className="flex items-baseline justify-center mb-2 animate-in zoom-in-75 duration-200">
          <span className="text-6xl font-extrabold bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
            {currentNote.note}
          </span>
          <span className="text-2xl font-semibold text-muted-foreground ml-1">
            {currentNote.octave}
          </span>
        </div>
        <div className="flex gap-4 items-center text-sm">
          <span className="text-muted-foreground">
            {currentNote.frequency.toFixed(1)} Hz
          </span>
          <span className={cn(
            "font-semibold px-2 py-0.5 rounded",
            isInTune && "bg-green-200 text-green-700 dark:bg-green-900 dark:text-green-300",
            isSharp && "bg-orange-200 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
            isFlat && "bg-blue-200 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
          )}>
            {centsDisplay}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
