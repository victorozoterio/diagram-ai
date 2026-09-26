import { useNodesInitialized, useReactFlow } from '@xyflow/react';
import { useEffect, useRef } from 'react';

type RestoreViewportProps = {
  viewport?: { x: number; y: number; zoom: number } | null;
  restoreKey?: number;
};

/** Restaura uma câmera salva somente depois que os nodes estiverem prontos. */
export function RestoreViewport({ viewport, restoreKey = 0 }: RestoreViewportProps) {
  const { setViewport } = useReactFlow();
  const nodesInitialized = useNodesInitialized({ includeHiddenNodes: true });
  const restoredKey = useRef<number | null>(null);

  useEffect(() => {
    if (!viewport || !nodesInitialized || restoredKey.current === restoreKey) return;

    restoredKey.current = restoreKey;
    const frameId = requestAnimationFrame(() => {
      setViewport(viewport, { duration: 0 });
    });
    return () => cancelAnimationFrame(frameId);
  }, [nodesInitialized, restoreKey, setViewport, viewport]);

  return null;
}
