export type NodeSize = { width: number; height: number };

export const DEFAULT_NODE_SIZES = {
  entity: { width: 170, height: 64 },
  attribute: { width: 132, height: 68 },
  relationship: { width: 112, height: 112 },
  generalization: { width: 102, height: 86 },
} as const satisfies Record<string, NodeSize>;

export const MIN_NODE_SIZES = {
  entity: { width: 120, height: 50 },
  attribute: { width: 100, height: 52 },
  relationship: { width: 88, height: 88 },
  generalization: { width: 80, height: 68 },
} as const satisfies Record<string, NodeSize>;
