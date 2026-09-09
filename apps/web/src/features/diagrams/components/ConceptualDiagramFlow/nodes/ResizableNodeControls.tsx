import { NodeResizer } from '@xyflow/react';
import { useEffect, useState } from 'react';
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
  const [isResizing, setIsResizing] = useState(false);
  const [keepAspectRatio, setKeepAspectRatio] = useState(false);

  useEffect(() => {
    if (!isResizing) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setKeepAspectRatio(true);
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setKeepAspectRatio(false);
      }
    };
    const handleWindowBlur = () => setKeepAspectRatio(false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isResizing]);

  return (
    <NodeResizer
      isVisible={selected}
      keepAspectRatio={keepAspectRatio}
      minWidth={minSize.width}
      minHeight={minSize.height}
      handleClassName='nodrag nowheel'
      lineClassName='nodrag nowheel'
      lineStyle={{ borderColor: color, borderWidth: 1 }}
      handleStyle={{ width: 8, height: 8, borderColor: color, background: '#fff', zIndex: 2 }}
      onResizeStart={(event) => {
        setIsResizing(true);
        setKeepAspectRatio(Boolean((event.sourceEvent as MouseEvent).shiftKey));
        onResizeStart?.(nodeId);
      }}
      onResize={(_, params) => onResize?.(nodeId, { width: params.width, height: params.height })}
      onResizeEnd={(_, params) => {
        onResizeEnd?.(nodeId, { width: params.width, height: params.height });
        setIsResizing(false);
        setKeepAspectRatio(false);
      }}
    />
  );
}
