import { useEffect, useRef, useState } from 'react';

/**
 * Measures a range-input's real rendered width and returns exact pixel
 * positions for each tick value, accounting for thumb radius so labels
 * line up precisely with where the thumb actually sits at each value.
 */
export function useSliderTickPositions(min: number, max: number, thumbRadius: number = 14) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const measure = () => setWidth(el.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const values: number[] = [];
  for (let v = min; v <= max; v++) values.push(v);

  const positions = values.map((v) => {
    if (width === 0) return 0;
    const fraction = (v - min) / (max - min);
    return thumbRadius + fraction * (width - 2 * thumbRadius);
  });

  return { inputRef, values, positions };
}