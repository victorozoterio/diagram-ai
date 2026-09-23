import { useNodesInitialized, useReactFlow } from '@xyflow/react';
import { useEffect } from 'react';

/** Ajusta a câmera quando a quantidade de elementos ou o layout inicial muda. */
export function FitViewOnNodeChange({ nodeCount, onReady }: { nodeCount: number; onReady?: () => void }) {
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized({ includeHiddenNodes: true });

  useEffect(() => {
    if (nodeCount === 0) {
      onReady?.();
      return;
    }

    if (!nodesInitialized) return;

    const frameId = requestAnimationFrame(() => {
      fitView({ padding: 0.1 });
      onReady?.();
    });
    return () => cancelAnimationFrame(frameId);
  }, [fitView, nodeCount, nodesInitialized, onReady]);

  return null;
}
