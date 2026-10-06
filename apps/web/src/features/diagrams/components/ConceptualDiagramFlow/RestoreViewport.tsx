import { useNodesInitialized, useReactFlow } from '@xyflow/react';
import { useEffect, useRef } from 'react';

type RestoreViewportProps = {
  viewport?: { x: number; y: number; zoom: number } | null;
  restoreKey?: number;
  onRestored?: () => void;
};

/** Restaura uma câmera salva somente depois que os nodes estiverem prontos. */
export function RestoreViewport({ viewport, restoreKey = 0, onRestored }: RestoreViewportProps) {
  const { setViewport } = useReactFlow();
  const nodesInitialized = useNodesInitialized({ includeHiddenNodes: true });
  const restoredKey = useRef<number | null>(null);

  useEffect(() => {
    if (!viewport || !nodesInitialized || restoredKey.current === restoreKey) return;

    restoredKey.current = restoreKey;
    const frameId = requestAnimationFrame(() => {
      setViewport(viewport, { duration: 0 });
      onRestored?.();
    });
    return () => cancelAnimationFrame(frameId);
  }, [nodesInitialized, onRestored, restoreKey, setViewport, viewport]);

  return null;
}
