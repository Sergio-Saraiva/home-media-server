import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export const useSpatialNavigation = (itemsCount: number, columns: number) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowRight':
        setActiveIndex((prev) => (prev + 1 < itemsCount ? prev + 1 : prev));
        break;
      case 'ArrowLeft':
        setActiveIndex((prev) => (prev - 1 >= 0 ? prev - 1 : prev));
        break;
      case 'ArrowDown':
        setActiveIndex((prev) => (prev + columns < itemsCount ? prev + columns : prev));
        break;
      case 'ArrowUp':
        setActiveIndex((prev) => (prev - columns >= 0 ? prev - columns : prev));
        break;
      case 'Enter':
        // We will trigger a click programmatically or pass a callback
        const activeElement = document.getElementById(`grid-item-${activeIndex}`);
        if (activeElement) activeElement.click();
        break;
      case 'Escape':
      case 'Backspace':
        // Fallback for browser testing
        navigate(-1);
        break;
      default:
        // Tizen specific Return button
        if (e.keyCode === 10009) {
          navigate(-1);
        }
        break;
    }
  }, [itemsCount, columns, activeIndex, navigate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return activeIndex;
};