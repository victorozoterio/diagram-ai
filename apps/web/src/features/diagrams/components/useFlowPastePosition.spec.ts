import { describe, expect, it } from 'vitest';
import { resolveFlowPastePosition } from './useFlowPastePosition';

describe('posição de colagem do React Flow', () => {
  it('converte a posição do cursor com screenToFlowPosition para respeitar zoom e pan', () => {
    const screenToFlowPosition = ({ x, y }: { x: number; y: number }) => ({ x: (x - 100) / 0.5, y: (y - 50) / 0.5 });

    expect(
      resolveFlowPastePosition(
        { x: 300, y: 250 },
        { left: 10, top: 20, right: 610, bottom: 420, width: 600, height: 400 },
        { screenToFlowPosition },
      ),
    ).toEqual({ x: 400, y: 400 });
  });

  it('usa o centro visível como fallback quando o cursor está fora do canvas', () => {
    const screenToFlowPosition = ({ x, y }: { x: number; y: number }) => ({ x, y });

    expect(
      resolveFlowPastePosition(
        { x: 900, y: 900 },
        { left: 10, top: 20, right: 610, bottom: 420, width: 600, height: 400 },
        { screenToFlowPosition },
      ),
    ).toEqual({ x: 310, y: 220 });
  });
});
