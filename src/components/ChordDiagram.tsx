import { getChordData, type ChordData } from '@/utils/chordData';

interface ChordDiagramProps {
  chordName: string;
  width?: number;
  height?: number;
}

/**
 * SVG Guitar Chord Diagram Component
 * Renders a guitar fretboard with finger positions for a given chord
 */
export function ChordDiagram({ chordName, width = 80, height = 100 }: ChordDiagramProps) {
  const chordData = getChordData(chordName);

  if (!chordData) {
    return (
      <div className="text-xs text-neutral-400 p-2">
        Chord not found
      </div>
    );
  }

  return <ChordSVG chord={chordData} width={width} height={height} />;
}

interface ChordSVGProps {
  chord: ChordData;
  width: number;
  height: number;
}

function ChordSVG({ chord, width, height }: ChordSVGProps) {
  const { frets, baseFret = 1, barres = [] } = chord;
  
  // Dimensions - adjusted for name at bottom
  const padding = { top: 15, left: 15, right: 10, bottom: 20 };
  const fretboardWidth = width - padding.left - padding.right;
  const fretboardHeight = height - padding.top - padding.bottom;
  const stringSpacing = fretboardWidth / 5; // 6 strings, 5 gaps
  const fretSpacing = fretboardHeight / 4; // Show 4 frets
  const dotRadius = 5;
  const nutHeight = 4;

  // Calculate positions
  const getStringX = (stringIndex: number) => padding.left + stringIndex * stringSpacing;
  const getFretY = (fretNum: number) => {
    const relativeFret = fretNum - (baseFret - 1);
    return padding.top + (relativeFret - 0.5) * fretSpacing;
  };

  return (
    <svg width={width} height={height} className="chord-diagram">
      {/* Chord name at bottom */}
      <text
        x={width / 2}
        y={height - 4}
        textAnchor="middle"
        className="fill-violet-300 font-bold text-sm"
      >
        {chord.name}
      </text>

      {/* Nut (only show if starting at fret 1) */}
      {baseFret === 1 && (
        <rect
          x={padding.left - 2}
          y={padding.top}
          width={fretboardWidth + 4}
          height={nutHeight}
          className="fill-neutral-200"
        />
      )}

      {/* Base fret indicator (if not at fret 1) */}
      {baseFret > 1 && (
        <text
          x={padding.left - 10}
          y={padding.top + fretSpacing / 2 + 4}
          textAnchor="middle"
          className="fill-neutral-400 text-xs"
        >
          {baseFret}
        </text>
      )}

      {/* Fret lines */}
      {[0, 1, 2, 3, 4].map((fretIndex) => (
        <line
          key={`fret-${fretIndex}`}
          x1={padding.left - 2}
          y1={padding.top + fretIndex * fretSpacing}
          x2={padding.left + fretboardWidth + 2}
          y2={padding.top + fretIndex * fretSpacing}
          className="stroke-neutral-500"
          strokeWidth={fretIndex === 0 && baseFret === 1 ? 0 : 1}
        />
      ))}

      {/* String lines */}
      {[0, 1, 2, 3, 4, 5].map((stringIndex) => (
        <line
          key={`string-${stringIndex}`}
          x1={getStringX(stringIndex)}
          y1={padding.top}
          x2={getStringX(stringIndex)}
          y2={padding.top + fretboardHeight}
          className="stroke-neutral-400"
          strokeWidth={1}
        />
      ))}

      {/* Barre indicators */}
      {barres.map((barreFret) => {
        const barreY = getFretY(barreFret);
        const startString = frets.findIndex((f) => f === barreFret);
        const endString = frets.length - 1 - [...frets].reverse().findIndex((f) => f === barreFret);
        
        if (startString >= 0 && endString >= startString) {
          return (
            <rect
              key={`barre-${barreFret}`}
              x={getStringX(startString) - dotRadius}
              y={barreY - dotRadius}
              width={(endString - startString) * stringSpacing + dotRadius * 2}
              height={dotRadius * 2}
              rx={dotRadius}
              className="fill-white"
            />
          );
        }
        return null;
      })}

      {/* Finger dots and mute/open indicators */}
      {frets.map((fret, stringIndex) => {
        const x = getStringX(stringIndex);

        if (fret === -1) {
          // Muted string (X)
          return (
            <text
              key={`mute-${stringIndex}`}
              x={x}
              y={padding.top - 5}
              textAnchor="middle"
              className="fill-neutral-400 text-xs font-bold"
            >
              ×
            </text>
          );
        }

        if (fret === 0) {
          // Open string (O)
          return (
            <circle
              key={`open-${stringIndex}`}
              cx={x}
              cy={padding.top - 8}
              r={4}
              className="fill-none stroke-neutral-400"
              strokeWidth={1.5}
            />
          );
        }

        // Skip if part of a barre (already drawn)
        if (barres.includes(fret)) {
          return null;
        }

        // Fingered fret position
        const y = getFretY(fret);
        return (
          <circle
            key={`dot-${stringIndex}`}
            cx={x}
            cy={y}
            r={dotRadius}
            className="fill-white"
          />
        );
      })}
    </svg>
  );
}
