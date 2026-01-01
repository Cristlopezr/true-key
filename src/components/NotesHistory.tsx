import { type DetectedNote } from '@/utils/pitchDetection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

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
    return null;
  }

  const aggregatedNotes = aggregateNotes(notes);

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-3 text-base font-semibold">
          Notes Detected
          <Badge variant="secondary" className="text-xs">
            {aggregatedNotes.length} unique
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[140px]">
          <div className="flex flex-col gap-2">
            {aggregatedNotes.map((note) => (
              <div
                key={note.note}
                className="flex items-center gap-3 p-2 px-3 bg-muted rounded-md animate-in slide-in-from-left-2 duration-200"
              >
                <Badge variant="outline" className="font-semibold min-w-[2.5rem] justify-center">
                  {note.note}
                </Badge>
                <span className="text-sm text-muted-foreground flex-1">
                  {formatDuration(note.totalDurationMs)}
                </span>
                {note.count > 1 && (
                  <span className="text-xs text-muted-foreground opacity-60">
                    ×{note.count}
                  </span>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
