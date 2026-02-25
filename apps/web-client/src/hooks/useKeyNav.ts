import { useState, useEffect, useCallback } from 'react';

interface UseKeyNavOptions {
  count: number;
  columns?: number; // 1 = vertical list, N = grid
  onSelect: (index: number) => void;
  onBack?: () => void;
  initialIndex?: number;
}

export const useKeyNav = ({
  count,
  columns = 1,
  onSelect,
  onBack,
  initialIndex = 0,
}: UseKeyNavOptions): number => {
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
          if (columns > 1) {
            e.preventDefault();
            setActiveIndex(prev => (prev + 1 < count ? prev + 1 : prev));
          }
          break;
        case 'ArrowLeft':
          if (columns > 1) {
            e.preventDefault();
            setActiveIndex(prev => (prev - 1 >= 0 ? prev - 1 : prev));
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex(prev => (prev + columns < count ? prev + columns : prev));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex(prev => (prev - columns >= 0 ? prev - columns : prev));
          break;
        case 'Enter':
          e.preventDefault();
          if (count > 0) onSelect(activeIndex);
          break;
        case 'Escape':
        case 'Backspace':
          onBack?.();
          break;
        default:
          if (e.keyCode === 10009) onBack?.();
          break;
      }
    },
    [count, columns, activeIndex, onSelect, onBack]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Scroll focused item into view automatically
  useEffect(() => {
    const el = document.getElementById(`nav-item-${activeIndex}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeIndex]);

  return activeIndex;
};
