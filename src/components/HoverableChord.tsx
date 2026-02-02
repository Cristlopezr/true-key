import { useState, useRef, useEffect } from 'react';
import { ChordDiagram } from './ChordDiagram';
import { hasChord } from '@/utils/chordData';

interface HoverableChordProps {
  chord: string;
  className?: string;
}

/**
 * A chord name that shows a diagram tooltip on hover
 */
export function HoverableChord({ chord, className = '' }: HoverableChordProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, showAbove: true });
  const ref = useRef<HTMLSpanElement>(null);

  // Check if chord exists in database
  const chordExists = hasChord(chord);

  // Calculate tooltip position when hovered
  useEffect(() => {
    if (isHovered && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceAbove = rect.top;
      const showAbove = spaceAbove > 120;
      
      setTooltipPos({
        top: showAbove ? rect.top - 8 : rect.bottom + 8,
        left: rect.left + rect.width / 2,
        showAbove
      });
    }
  }, [isHovered]);

  if (!chordExists) {
    return <span className={className}>{chord}</span>;
  }

  return (
    <span
      ref={ref}
      className={`relative cursor-pointer hover:text-violet-300 transition-colors ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {chord}
      
      {/* Tooltip with chord diagram - fixed position */}
      {isHovered && (
        <div
          className="fixed z-[9999] bg-neutral-800 border border-neutral-600 rounded-lg shadow-xl p-2"
          style={{
            top: tooltipPos.showAbove ? 'auto' : tooltipPos.top,
            bottom: tooltipPos.showAbove ? `calc(100vh - ${tooltipPos.top}px)` : 'auto',
            left: tooltipPos.left,
            transform: 'translateX(-50%)'
          }}
        >
          {/* Arrow */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent ${
              tooltipPos.showAbove
                ? 'top-full border-t-8 border-t-neutral-800'
                : 'bottom-full border-b-8 border-b-neutral-800'
            }`}
          />
          
          <ChordDiagram chordName={chord} width={80} height={100} />
        </div>
      )}
    </span>
  );
}
