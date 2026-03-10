import { useEffect, useRef, useState } from 'react';

/**
 * Lightweight IntersectionObserver hook.
 * Returns [ref, isInView] – once an element enters the viewport it stays "in view"
 * so we don't unload already-loaded media when the user scrolls back.
 */
export function useInView(rootMargin = '200px'): [React.RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null!);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (inView) return; // already visible, no need to observe further
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView, rootMargin]);

  return [ref, inView];
}
