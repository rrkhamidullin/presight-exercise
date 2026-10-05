import { useLayoutEffect, useState, type RefObject } from 'react';

/** Number of card columns that fit the container width. */
export function useColumns(ref: RefObject<HTMLElement | null>): number {
  const [columns, setColumns] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      setColumns(w >= 1100 ? 3 : w >= 680 ? 2 : 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return columns;
}
