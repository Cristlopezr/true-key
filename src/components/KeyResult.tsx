import { type KeyAnalysisResult } from '@/utils/keyDetection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface KeyResultProps {
  result: KeyAnalysisResult | null;
}

function formatMode(mode: string): string {
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

export function KeyResult({ result }: KeyResultProps) {
  if (!result) {
    return null;
  }

  const { primary, alternative, isAmbiguous } = result;
  const confidencePercent = Math.round(primary.confidence * 100);

  return (
    <Card className="w-full bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-indigo-950 border-indigo-200 dark:border-indigo-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Detected Key</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0">
        {/* Primary Key */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-4xl font-extrabold bg-gradient-to-br from-violet-600 to-purple-600 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent">
              {primary.key}
            </span>
            <Badge variant={primary.mode === 'major' ? 'default' : 'secondary'}>
              {formatMode(primary.mode)}
            </Badge>
          </div>
          <div className="text-right">
            <span className="block text-xs text-muted-foreground">Confidence</span>
            <span className="text-2xl font-bold text-green-600 dark:text-green-400">
              {confidencePercent}%
            </span>
          </div>
        </div>

        {/* Scale Notes */}
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground font-medium">Scale Notes</span>
          <div className="flex flex-wrap gap-1.5">
            {primary.scaleNotes.map((note, index) => (
              <Badge
                key={note}
                variant={index === 0 ? 'default' : 'outline'}
                className={index === 0 ? 'bg-violet-600 hover:bg-violet-600' : ''}
              >
                {note}
              </Badge>
            ))}
          </div>
        </div>

        {/* Alternative Key */}
        {alternative && (
          <>
            <Separator />
            
            {isAmbiguous && (
              <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800 py-2">
                <AlertDescription className="text-sm">
                  ⚠️ Ambiguous result - these keys share the same notes
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {isAmbiguous ? 'Could also be' : 'Relative Key'}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold opacity-80">{alternative.key}</span>
                <Badge variant={alternative.mode === 'major' ? 'default' : 'secondary'} className="opacity-80">
                  {formatMode(alternative.mode)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  ({Math.round(alternative.confidence * 100)}%)
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
