import { useEffect, useRef, type RefObject } from 'react';
import type { FloorPlanCanvasHandle } from '@/components/locations/FloorPlanCanvas';
import type { Tool } from '@/lib/floorplan/tools';
import { GRID_SIZE } from '@/utils/floorPlanLayout';
import type { UseFloorPlanReturn } from './useFloorPlan';

interface Options {
  plan: UseFloorPlanReturn;
  tool: Tool;
  canvasRef: RefObject<FloorPlanCanvasHandle>;
}

const isTypingTarget = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  if (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return true;
  // Pas de raccourcis pendant qu'une boîte de dialogue est ouverte.
  return el.closest('[role="dialog"], [role="alertdialog"], [role="listbox"], [role="menu"]') !== null;
};

/**
 * Raccourcis clavier de l'éditeur de plan. Les touches propres au canvas
 * (Espace, Entrée, Échap pendant un tracé) sont gérées dans le canvas lui-même.
 */
export function useFloorPlanShortcuts({ plan, tool, canvasRef }: Options): void {
  const latest = useRef({ plan, tool });
  latest.current = { plan, tool };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const { plan: p, tool: current } = latest.current;
      const canEditSelection = current.kind === 'select' && p.selection.length > 0;

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) p.redo();
            else p.undo();
            return;
          case 'y':
            e.preventDefault();
            p.redo();
            return;
          case 's':
            e.preventDefault();
            void p.publish();
            return;
          case 'c':
            if (canEditSelection) p.copySelection();
            return;
          case 'v':
            if (current.kind === 'select' && p.paste()) e.preventDefault();
            return;
          case 'd':
            e.preventDefault();
            if (canEditSelection) p.duplicateSelection();
            return;
          case 'a':
            e.preventDefault();
            if (current.kind === 'select') p.selectAll();
            return;
          default:
            return;
        }
      }

      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          if (canEditSelection) {
            e.preventDefault();
            p.deleteSelection();
          }
          return;
        case 'Escape':
          if (current.kind === 'select') p.clearSelection();
          return;
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'ArrowUp':
        case 'ArrowDown': {
          if (!canEditSelection) return;
          e.preventDefault();
          const step = e.shiftKey ? 1 : GRID_SIZE;
          p.nudge(
            e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0,
            e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
          );
          return;
        }
        case '+':
        case '=':
          canvasRef.current?.zoomIn();
          return;
        case '-':
          canvasRef.current?.zoomOut();
          return;
        case '0':
          canvasRef.current?.fit();
          return;
        default:
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canvasRef]);
}
