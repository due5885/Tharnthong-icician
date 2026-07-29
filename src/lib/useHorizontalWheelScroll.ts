import { useEffect, useRef } from 'react';

/**
 * Lets a plain vertical mouse wheel scroll a horizontally-scrolling container
 * (e.g. wide tables) — without this, desktop users with a non-trackpad mouse
 * have no way to reach content past the visible width besides dragging the
 * scrollbar pixel-by-pixel.
 */
export function useHorizontalWheelScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  return ref;
}
