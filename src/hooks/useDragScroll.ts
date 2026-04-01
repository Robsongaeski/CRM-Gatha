import { useEffect, useRef } from 'react';

// Elementos que NAO devem iniciar drag-to-scroll
const INTERACTIVE_SELECTORS = [
  '[data-kanban-card]',
  '[data-no-drag-scroll]',
  'button',
  'input',
  'textarea',
  'select',
  'a',
  '[role="button"]',
  '[draggable="true"]',
].join(',');

export function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Shift + mouse wheel para scroll horizontal
    const handleWheel = (e: WheelEvent) => {
      if (e.shiftKey) {
        e.preventDefault();
        element.scrollLeft += e.deltaY;
      }
    };

    let isDragging = false;
    let startX = 0;
    let startScrollLeft = 0;

    const isInteractiveElement = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof HTMLElement)) return false;
      return target.closest(INTERACTIVE_SELECTORS) !== null;
    };

    const resetDragState = () => {
      isDragging = false;
      element.style.cursor = '';
      element.style.userSelect = '';
    };

    const handleMouseDown = (e: MouseEvent) => {
      // Somente botao esquerdo
      if (e.button !== 0) return;

      // Nao iniciar arraste se clicar em card/botao/input etc
      if (isInteractiveElement(e.target)) return;

      isDragging = true;
      startX = e.pageX;
      startScrollLeft = element.scrollLeft;
      element.style.cursor = 'grabbing';
      element.style.userSelect = 'none';
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.pageX - startX;
      element.scrollLeft = startScrollLeft - deltaX;
      e.preventDefault();
    };

    const handleMouseUp = () => {
      if (!isDragging) return;
      resetDragState();
    };

    // Avisa visualmente que a area pode ser arrastada
    element.style.cursor = 'grab';

    element.addEventListener('wheel', handleWheel, { passive: false });
    element.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      element.removeEventListener('wheel', handleWheel);
      element.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      resetDragState();
    };
  }, []);

  return ref;
}

