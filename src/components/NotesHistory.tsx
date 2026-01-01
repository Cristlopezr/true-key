import { type DetectedNote } from '@/utils/pitchDetection';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface NotesHistoryProps {
  notes: DetectedNote[];
}

interface AggregatedNote {
  note: string;
  totalDurationMs: number;
  count: number;
}

function aggregateNotes(notes: DetectedNote[]): AggregatedNote[] {
  const noteMap = new Map<string, AggregatedNote>();

  for (const note of notes) {
    const existing = noteMap.get(note.note);
    if (existing) {
      existing.totalDurationMs += note.durationMs;
      existing.count += 1;
    } else {
      noteMap.set(note.note, {
        note: note.note,
        totalDurationMs: note.durationMs,
        count: 1,
      });
    }
  }

  return Array.from(noteMap.values()).sort(
    (a, b) => b.totalDurationMs - a.totalDurationMs
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

export function NotesHistory({ notes }: NotesHistoryProps) {
  if (notes.length === 0) {
    return (
        <div className="h-full flex items-center justify-center text-neutral-400 text-sm italic">
            Waiting for input...
        </div>
    );
  }

  const aggregatedNotes = aggregateNotes(notes);

  return (
    <ScrollArea className="w-full h-full" orientation="horizontal">
      <div className="flex gap-4 h-full items-center px-4 py-2 min-w-max">
        {aggregatedNotes.map((note) => (
          <div
            key={note.note}
            className="flex-shrink-0 flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-xl p-4 min-w-[100px] hover:bg-white/10 transition-colors shadow-lg"
          >
            <Badge variant="outline" className="text-2xl font-bold text-white mb-2 border-0 bg-transparent p-0 hover:bg-transparent">
              {note.note}
            </Badge>
            <span className="text-xs text-neutral-300 font-mono mb-3">
              {formatDuration(note.totalDurationMs)}
            </span>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, (note.count / 5) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
