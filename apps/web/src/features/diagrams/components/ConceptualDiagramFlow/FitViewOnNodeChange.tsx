import { useNodesInitialized, useReactFlow, type Viewport } from '@xyflow/react';
import { useEffect, useRef } from 'react';

/** Ajusta a câmera somente na inicialização ou quando o layout inicial muda. */
export function FitViewOnNodeChange({
  nodeCount,
  fitViewKey = 0,
  onReady,
  onFitted,
  skipFitView = false,
}: {
  nodeCount: number;
  fitViewKey?: number;
  onReady?: () => void;
  onFitted?: (viewport: Viewport) => void;
  skipFitView?: boolean;
}) {
  const { fitView, getViewport } = useReactFlow();
  const nodesInitialized = useNodesInitialized({ includeHiddenNodes: true });
  const fittedKey = useRef<number | null>(null);

  useEffect(() => {
    if (nodeCount === 0) {
      fittedKey.current = fitViewKey;
      onReady?.();
      return;
    }

    if (!nodesInitialized) return;

    if (skipFitView) {
      fittedKey.current = fitViewKey;
      onReady?.();
      return;
    }

    if (fittedKey.current === fitViewKey) {
      onReady?.();
      return;
    }

    fittedKey.current = fitViewKey;

    const frameId = requestAnimationFrame(() => {
      void fitView({ padding: 0.1 }).then(() => {
        onFitted?.(getViewport());
        onReady?.();
      });
    });
    return () => cancelAnimationFrame(frameId);
  }, [fitView, fitViewKey, getViewport, nodeCount, nodesInitialized, onFitted, onReady, skipFitView]);

  return null;
}
