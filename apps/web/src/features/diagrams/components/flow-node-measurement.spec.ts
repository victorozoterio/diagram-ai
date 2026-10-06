import { applyNodeChanges, type Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import { preserveNodeMeasurement } from './flow-node-measurement';

describe('medição dos nodes durante o salvamento', () => {
  it('preserva a medição dos handles após mudanças de estado sem remontar o canvas', () => {
    const mappedNode: Node = { id: 'entidade', position: { x: 20, y: 30 }, data: {} };
    const [measuredNode] = applyNodeChanges<Node>(
      [{ id: mappedNode.id, type: 'dimensions', dimensions: { width: 180, height: 90 } }],
      [mappedNode],
    );
    expect(measuredNode.measured).toEqual({ width: 180, height: 90 });

    let currentNode = measuredNode;
    for (const status of ['saving', 'saved', 'unsaved', 'saving', 'saved']) {
      currentNode = preserveNodeMeasurement({ ...mappedNode, data: { status } }, currentNode);
      expect(currentNode.measured).toEqual({ width: 180, height: 90 });
      expect(currentNode.id).toBe(mappedNode.id);
    }
  });

  it('não atribui medição antiga a um node recém-criado', () => {
    const newNode: Node = { id: 'novo', position: { x: 0, y: 0 }, data: {} };
    expect(preserveNodeMeasurement(newNode)).not.toHaveProperty('measured');
  });
});
