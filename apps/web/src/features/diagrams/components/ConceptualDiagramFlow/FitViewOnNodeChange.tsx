import { useNodesInitialized, useReactFlow } from '@xyflow/react';
import { useEffect, useRef } from 'react';

/** Ajusta a câmera somente na inicialização ou quando o layout inicial muda. */
export function FitViewOnNodeChange({
  nodeCount,
  fitViewKey = 0,
  onReady,
  skipFitView = false,
}: {
  nodeCount: number;
  fitViewKey?: number;
  onReady?: () => void;
  skipFitView?: boolean;
}) {
  const { fitView } = useReactFlow();
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
      fitView({ padding: 0.1 });
      onReady?.();
    });
    return () => cancelAnimationFrame(frameId);
  }, [fitView, fitViewKey, nodeCount, nodesInitialized, onReady, skipFitView]);

  return null;
}
