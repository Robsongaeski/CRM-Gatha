import { useEffect, useState, RefObject } from "react";

/**
 * Returns true once the user has scrolled past the bottom of the referenced element.
 * Useful for revealing a sticky bottom bar after the primary CTA leaves the viewport.
 */
export function useScrollPast(ref: RefObject<HTMLElement>): boolean {
  const [scrolledPast, setScrolledPast] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When the element is no longer intersecting AND it's above the viewport
        const rect = entry.boundingClientRect;
        setScrolledPast(!entry.isIntersecting && rect.bottom < 0);
      },
      { threshold: 0, rootMargin: "0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return scrolledPast;
}
