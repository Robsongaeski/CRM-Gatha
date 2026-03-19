import { useRef, useEffect } from 'react';

// Elementos que NÃO devem iniciar drag-to-scroll
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

    // ========== Shift + Mouse Wheel Scroll (método principal) ==========
    const handleWheel = (e: WheelEvent) => {
      // Se Shift está pressionado, faz scroll horizontal
      if (e.shiftKey) {
        e.preventDefault();
        element.scrollLeft += e.deltaY;
      }
    };

    // ========== Drag to Scroll (método secundário - clique em área vazia) ==========
    let isDown = false;
    let startX: number;
    let scrollLeft: number;

    const isInteractiveElement = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof HTMLElement)) return false;
      
      // Verifica se o elemento ou algum ancestral é interativo
      return target.closest(INTERACTIVE_SELECTORS) !== null;
    };

    const handleMouseDown = (e: MouseEvent) => {
      // Ignorar cliques em elementos interativos (cards, botões, etc)
      if (isInteractiveElement(e.target)) return;
      
      // Ignorar clique com botão direito ou do meio
      if (e.button !== 0) return;

      isDown = true;
      element.style.cursor = 'grabbing';
      element.style.userSelect = 'none';
      startX = e.pageX - element.offsetLeft;
      scrollLeft = element.scrollLeft;
    };

    const handleMouseLeave = () => {
      if (!isDown) return;
      isDown = false;
      element.style.cursor = '';
      element.style.userSelect = '';
    };

    const handleMouseUp = () => {
      if (!isDown) return;
      isDown = false;
      element.style.cursor = '';
      element.style.userSelect = '';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - element.offsetLeft;
      const walk = (x - startX) * 1.5;
      element.scrollLeft = scrollLeft - walk;
    };

    // Adicionar listeners
    element.addEventListener('wheel', handleWheel, { passive: false });
    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mouseleave', handleMouseLeave);
    element.addEventListener('mouseup', handleMouseUp);
    element.addEventListener('mousemove', handleMouseMove);
    
    // Listener global para mouse up (caso solte fora do elemento)
    const handleGlobalMouseUp = () => {
      if (isDown) {
        isDown = false;
        element.style.cursor = '';
        element.style.userSelect = '';
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      element.removeEventListener('wheel', handleWheel);
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('mouseleave', handleMouseLeave);
      element.removeEventListener('mouseup', handleMouseUp);
      element.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  return ref;
}
