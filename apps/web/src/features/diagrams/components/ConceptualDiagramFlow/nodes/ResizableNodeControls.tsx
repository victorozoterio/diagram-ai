import { NodeResizer } from '@xyflow/react';
import type { NodeSize } from '../node-resize';

type ResizableNodeControlsProps = {
  nodeId: string;
  selected: boolean;
  minSize: NodeSize;
  color: string;
  onResizeStart?: (nodeId: string) => void;
  onResize?: (nodeId: string, size: NodeSize) => void;
  onResizeEnd?: (nodeId: string, size: NodeSize) => void;
};

/** Controles nativos de resize compartilhados por todos os símbolos do canvas. */
export function ResizableNodeControls({
  nodeId,
  selected,
  minSize,
  color,
  onResizeStart,
  onResize,
  onResizeEnd,
}: ResizableNodeControlsProps) {
  return (
    <NodeResizer
      isVisible={selected}
      minWidth={minSize.width}
      minHeight={minSize.height}
      handleClassName='nodrag nowheel'
      lineClassName='nodrag nowheel'
      lineStyle={{ borderColor: color, borderWidth: 1 }}
      handleStyle={{ width: 8, height: 8, borderColor: color, background: '#fff', zIndex: 2 }}
      onResizeStart={() => onResizeStart?.(nodeId)}
      onResize={(_, params) => onResize?.(nodeId, { width: params.width, height: params.height })}
      onResizeEnd={(_, params) => onResizeEnd?.(nodeId, { width: params.width, height: params.height })}
    />
  );
}
