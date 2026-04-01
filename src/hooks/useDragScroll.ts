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

    const handleWheel = (e: WheelEvent) => {
      if (!e.shiftKey) return;
      e.preventDefault();
      element.scrollLeft += e.deltaY;
    };

    let isDragging = false;
    let startX = 0;
    let startScrollLeft = 0;
    let activePointerId: number | null = null;

    const isInteractiveElement = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof HTMLElement)) return false;
      return target.closest(INTERACTIVE_SELECTORS) !== null;
    };

    const resetDragState = () => {
      isDragging = false;
      activePointerId = null;
      element.style.cursor = 'grab';
      document.body.style.userSelect = '';
    };

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Apenas eventos dentro do container do kanban
      if (!element.contains(target)) return;

      // Bloqueia drag do fundo quando clica em card/controle
      if (isInteractiveElement(target)) return;

      // Mouse: apenas botao esquerdo. Touch/caneta entram direto.
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      isDragging = true;
      activePointerId = e.pointerId;
      startX = e.clientX;
      startScrollLeft = element.scrollLeft;
      element.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      if (activePointerId !== null && e.pointerId !== activePointerId) return;

      const deltaX = e.clientX - startX;
      element.scrollLeft = startScrollLeft - deltaX;
      e.preventDefault();
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      if (activePointerId !== null && e.pointerId !== activePointerId) return;
      resetDragState();
    };

    const handlePointerCancel = () => {
      if (!isDragging) return;
      resetDragState();
    };

    element.style.cursor = 'grab';
    element.addEventListener('wheel', handleWheel, { passive: false });

    // Captura global para funcionar mesmo quando algum filho intercepta/bloqueia bubbling
    window.addEventListener('pointerdown', handlePointerDown, { capture: true });
    window.addEventListener('pointermove', handlePointerMove, { capture: true });
    window.addEventListener('pointerup', handlePointerUp, { capture: true });
    window.addEventListener('pointercancel', handlePointerCancel, { capture: true });

    return () => {
      element.removeEventListener('wheel', handleWheel);
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      window.removeEventListener('pointermove', handlePointerMove, { capture: true });
      window.removeEventListener('pointerup', handlePointerUp, { capture: true });
      window.removeEventListener('pointercancel', handlePointerCancel, { capture: true });
      resetDragState();
    };
  }, []);

  return ref;
}

