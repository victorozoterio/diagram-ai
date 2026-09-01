import { Handle, Position } from '@xyflow/react';

type Side = 'left' | 'right' | 'top' | 'bottom';

type ConnectionHandlesProps = {
  prefix: string;
  middleHandleIds?: Partial<Record<Side, string>>;
};

const sidePositions: Record<Side, Position> = {
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
  bottom: Position.Bottom,
};

const offsets = [25, 50, 75];

/**
 * Disponibiliza pontos de conexão distribuídos pelo contorno do componente.
 * No modo Loose, cada ponto aceita iniciar ou receber uma ligação.
 */
export function ConnectionHandles({ prefix, middleHandleIds = {} }: ConnectionHandlesProps) {
  return (
    <>
      {(Object.keys(sidePositions) as Side[]).flatMap((side) =>
        offsets.map((offset) => {
          const id = offset === 50 ? (middleHandleIds[side] ?? `${prefix}-${side}`) : `${prefix}-${side}-${offset}`;
          const style = side === 'left' || side === 'right' ? { top: `${offset}%` } : { left: `${offset}%` };

          return <Handle key={id} id={id} type='source' position={sidePositions[side]} style={style} />;
        }),
      )}
    </>
  );
}
