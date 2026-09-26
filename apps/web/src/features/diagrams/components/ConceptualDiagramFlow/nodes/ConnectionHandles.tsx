import { Handle, Position } from '@xyflow/react';
import {
  type ConnectionGeometry,
  type ConnectionSide,
  type ConnectionSize,
  connectionPoint,
} from './connection-geometry';

type Side = ConnectionSide;

type ConnectionHandlesProps = {
  prefix: string;
  middleHandleIds?: Partial<Record<Side, string>>;
  geometry?: ConnectionGeometry;
  size?: ConnectionSize;
};

const offsets = [25, 50, 75];

/**
 * Disponibiliza pontos de conexão distribuídos pelo contorno do componente.
 * No modo Loose, cada ponto aceita iniciar ou receber uma ligação.
 */
export function ConnectionHandles({
  prefix,
  middleHandleIds = {},
  geometry = 'rectangle',
  size,
}: ConnectionHandlesProps) {
  const effectiveSize = size ?? { width: 100, height: 100 };

  return (
    <>
      {(['left', 'right', 'top', 'bottom'] as Side[]).flatMap((side) =>
        offsets.map((offset) => {
          const id = offset === 50 ? (middleHandleIds[side] ?? `${prefix}-${side}`) : `${prefix}-${side}-${offset}`;
          const point = connectionPoint(geometry, side, offset, effectiveSize);
          const style = {
            left: `${(point.x / effectiveSize.width) * 100}%`,
            top: `${(point.y / effectiveSize.height) * 100}%`,
            right: 'auto',
            bottom: 'auto',
            transform: 'translate(-50%, -50%)',
          };

          return <Handle key={id} id={id} type='source' position={point.position as Position} style={style} />;
        }),
      )}
    </>
  );
}
