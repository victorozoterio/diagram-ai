import type { Node } from '@xyflow/react';

/** Mantém a medição usada pelo React Flow para posicionar handles e edges. */
export function preserveNodeMeasurement<T extends { measured?: Node['measured'] }>(
  mappedNode: T,
  currentNode?: { measured?: Node['measured'] },
): T {
  return currentNode?.measured ? { ...mappedNode, measured: currentNode.measured } : mappedNode;
}
