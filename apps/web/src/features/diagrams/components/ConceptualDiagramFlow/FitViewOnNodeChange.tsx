import { useReactFlow } from '@xyflow/react';
import { useEffect } from 'react';

/** Ajusta a câmera somente quando a quantidade de elementos muda. */
export function FitViewOnNodeChange({ nodeCount }: { nodeCount: number }) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (nodeCount === 0) return;
    const frameId = requestAnimationFrame(() => fitView({ padding: 0.2, duration: 200 }));
    return () => cancelAnimationFrame(frameId);
  }, [fitView, nodeCount]);

  return null;
}
